---
title: "Lineth L2 Lab Postmortems (3) - Started Before DNS: An RPC Node With No Peer for 49 Minutes"
description: "After a planned restart, the L2's public RPC node came up a few seconds before cluster DNS, failed to resolve its only peer once, and never tried again. It looked healthy for 49 minutes while no user transaction reached the sequencer. A Google SRE format postmortem with the logs and a one-probe fix."
pubDatetime: 2026-10-13T22:20:00+09:00
tags:
  - SRE Postmortem
  - SRE
  - Postmortem
  - Incident Response
  - Kubernetes
  - Ethereum
  - Layer 2
  - Besu
  - SLO
---

*Part 3 of a series of postmortems from my Lineth L2 lab: one incident per failure type. [Part 2](/posts/lineth-l2-postmortem-prover-trace-limit-host-memory/) was capacity; this one is startup order and dependencies.*

The lab's L2 has two execution nodes. The **sequencer** builds blocks. The **RPC node** is what users and services talk to: it accepts transactions and gossips them to the sequencer over P2P. Its only peer is the sequencer, configured as a static peer by DNS name. Format: the [Google SRE postmortem template](https://sre.google/sre-book/example-postmortem/), blameless.

## Summary

| | |
|---|---|
| Incident | INC-2026-10-13-13 |
| Status | Resolved |
| Severity | SEV-1: users could not get transactions included through the public RPC |
| Impact | ~49 min with no user transaction included; 67 transactions stuck in the RPC node's pool; the bridge relayer's claims lost (the cause of [Part 1](/posts/lineth-l2-postmortem-postman-bigint-nonce-gap/)) |
| Trigger | A planned Docker VM restart (the second fix of [Part 2](/posts/lineth-l2-postmortem-prover-trace-limit-host-memory/)) |
| Root causes | (1) Besu resolves a static peer's hostname once at start and silently drops it on failure. (2) The startup probe checked only that the RPC port was open |
| Resolution | Pod restarted; then a startup probe on Besu's own `/readiness?minPeers=1`, so a node without a peer is restarted within 2 minutes |

## Impact

| what | how much |
|---|---|
| User transactions via the RPC node (transfers, ERC-20, withdrawals) | not included for ~49 min; 67 in the RPC node's pool; synthetic users gave up after 3 attempts |
| Bridge relayer (postman) | its 41 claim transactions went to the RPC node and were lost → Part 1 |
| L2 head | +205 blocks in 30 min instead of ~430: only the sequencer's own liveness transactions |
| Not affected | block production, finalization |

**Error budget.** `tx-inclusion-60s` (99 % of user transactions included within 60 s) went from **96 % to 90 %** of its 28-day budget remaining, and `tx-inclusion-5s` from 91 % to 90 %. Both understate it: the SLI is built from user-transaction traces that *finished*. A transaction the generator gave up on never finishes and is never counted, so the worst part of the outage was invisible to the SLO (the same blind spot as in Parts 1 and 2).

## Root causes and trigger

**Trigger.** The Docker VM was restarted at 04:17 to give the Mac memory back (Part 2). On a full node restart every pod starts at once, and cluster DNS answers only some seconds later. Synthetic clients showed the window:

```text
l2-load | urllib3.exceptions.NameResolutionError: HTTPConnection(host='l2-node-besu', port=8545):
          Failed to resolve 'l2-node-besu' ([Errno -3] Temporary failure in name resolution)
```

They retry per request and recovered on their own. The RPC node did not:

```text
2026-10-13 04:17:48.766+0000 | main | INFO  | Besu | Connecting to 1 static nodes.
```

That is the last peer-related line until the pod was deleted 38 minutes later. The static peer is `enode://…@sequencer.lineth-l2.svc.cluster.local:30303`; the name did not resolve yet.

**Root cause 1: resolve once, drop silently.** Besu resolves a static peer's hostname when it starts. When that fails it drops the peer without a warning and never retries. Discovery could not help either:

```text
WARN | Besu | --discovery-mode=BOTH but no ENR (enr:) bootnodes provided; DiscV5 will start with no bootstrap peers.
```

**Root cause 2: the probe checked the wrong thing.** The startup probe was a TCP check on the RPC port. A node with zero peers has an open RPC port, accepts transactions, answers `eth_blockNumber`, and is "Ready", so Kubernetes saw nothing wrong. Transactions sent to it went into its own pool and nowhere else. Senders saw failures like:

```text
04:25:20 FAILED: l2-send: attempt 1/3 nonce=955 failed: Error: server returned an error response:
  error code -32000: Replacement transaction underpriced
```

(the previous attempt with the same nonce was still sitting in the peer-less node's pool).

**Contributing.** The manifest comment said the static peer was "at the sequencer Service ClusterIP", but the config held the DNS name. The risk looked handled.

**Why only this pod.** Every other component checked: the coordinator, the postman and the synthetic users resolve names per request and retried; the sequencer has no static peers; the remote signer already waits for its dependency (an init container added after an earlier incident with the same "started before its dependency" shape).

## Resolution

1. **Mitigation (04:56):** confirmed the name now resolves, deleted the pod. It peered on start; the pool drained from 67 to 5 and the synthetic users logged `ok` again by ~05:06.
2. **Fix (05:26):** a startup probe on Besu's built-in readiness endpoint, which answers 200 only with at least the given number of peers:

   ```yaml
   # Started = has a peer (Besu /readiness, minPeers=1), not just an open port: a node that came up without
   # its static peer is restarted after 2 min instead of running with 0 peers.
   startupProbe:
     httpGet: {path: "/readiness?minPeers=1", port: rpc}
     periodSeconds: 5
     failureThreshold: 24
   ```

   Checked before relying on it: `/readiness?minPeers=1` → 200, `/readiness?minPeers=2` → 503 on a node with one peer. The new pod was Ready, with its peer, 6 seconds after start.

A wait-for-DNS init container was considered and dropped. It covers only DNS; the probe covers any reason for "no peer" with one mechanism, and costs at most 2 minutes after a restart.

## Detection

| | time (UTC) | after the restart |
|---|---|---|
| RPC node starts without a peer | 04:17:48 | 0 |
| `LinethL2NoPeers` (critical) fires | 04:20:38 | 3 min |
| `LinethL2RpcTxStuck` fires | 04:23:53 | 6 min |
| A human notices (L2 head growing at half speed, generators failing) | 04:55 | 37 min |
| Mitigated | 04:56 → ~05:06 | ~49 min |

The alerts were right and early and reached no person. The human found it while measuring something else.

## Lessons learned

**What went well**
- Before choosing a fix, every other component was checked for the same "resolve once" pattern from its logs.
- The fix uses an endpoint the node already has and tests the property that matters (has a peer), not a proxy for it.

**What went wrong**
- A planned restart had no post-restart check of user-facing workflows. It was called done when the pods were Running.
- This was the second incident in two days caused by a pod starting before something it needed.
- The critical alert fired in 3 minutes and was seen after 37.

**Where we got lucky**
- Block production and finalization do not depend on the RPC node, so the damage stayed on the user side.

## Action items

| # | action | type | status |
|---|---|---|---|
| 1 | Startup probe `/readiness?minPeers=1` within 2 min | mitigate | done |
| 2 | Check other components for once-at-start name resolution | prevent | done (only this one) |
| 3 | Fix the misleading manifest comment | process | done |
| 4 | After any full restart, run a check of every workflow before calling it done (runbook + script) | process | done |
| 5 | Route alerts to a person | detect | done (Telegram) |
| 6 | Count user transactions that never complete in the inclusion SLI | detect | open |

## Timeline (UTC, 2026-10-13)

| time | event |
|---|---|
| 04:17:13 / 04:17:37 | Docker Desktop stop / start (planned, Part 2) |
| 04:17:48 | RPC node: `Connecting to 1 static nodes.` Never peers |
| 04:17:5x | Synthetic clients: `Temporary failure in name resolution` (retry, recover) |
| 04:20:38 | `LinethL2NoPeers` fires (unseen) |
| 04:23:53 | `LinethL2RpcTxStuck` fires (unseen) |
| 04:20 onward | The bridge relayer's claims go to the peer-less node and are dropped at its restarts (→ Part 1) |
| 04:55 | Noticed: head growth half the usual, `net_peerCount` 0 |
| 04:56 | DNS checked, pod deleted |
| ~05:06 | Peered; pool 67 → 5; generators `ok` |
| 05:26 | Startup probe on `/readiness?minPeers=1` deployed; new pod Ready with a peer in 6 s |

## Takeaways

- **"Started" should mean "can do its job".** A port check proves a process is listening, not that it is useful. If the software has a readiness endpoint that knows (here, peer count), probe that.
- **Anything resolved once at start is a restart-order bug waiting for a full restart.** Rolling restarts hide it; a node reboot finds it.
- **A restart is a change.** Verify the user-facing paths after it, not just the pod status; this restart also caused the next incident.
