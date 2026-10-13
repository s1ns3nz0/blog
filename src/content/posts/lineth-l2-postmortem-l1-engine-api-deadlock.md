---
title: "Lineth L2 Lab Postmortems (5) - An L1 Deadlock the Engine API Made Permanent"
description: "The lab's local L1 stopped producing blocks for 3 h 14 min: after a one-slot re-org, the beacon node asked the execution client to build on a block's parent, and the Engine API says it must not. Settlement stopped behind it and the coordinator wedged. A Google SRE format postmortem with the logs, the one-RPC fix, and an SLI that hid the worst withdrawals."
pubDatetime: 2026-10-13T22:40:00+09:00
tags:
  - SRE Postmortem
  - SRE
  - Postmortem
  - Incident Response
  - Ethereum
  - Layer 2
  - Consensus
  - Besu
  - Teku
  - SLO
---

*Part 5 of a series of postmortems from my Lineth L2 lab: one incident per failure type. [Part 4](/posts/lineth-l2-postmortem-grafana-forward-alive-but-dead/) was observability; this one is a distributed-system failure: two correct components that together could not make progress.*

The L2 settles on a local L1 that is as small as an Ethereum chain can be: one execution client (Besu), one beacon node (Teku) and one validator client, with 1-second slots. The beacon node decides the head and, through the Engine API, tells the execution client which block to build on (`engine_forkchoiceUpdated` with payload attributes); the execution client returns a payload id, and the beacon node later fetches the built block. Format: the [Google SRE postmortem template](https://sre.google/sre-book/example-postmortem/), blameless.

## Summary

| | |
|---|---|
| Incident | INC-2026-10-13-15 |
| Status | Mitigated 10:52 UTC; resolved when the settlement backlog drained |
| Severity | SEV-2: settlement (finalization, withdrawals, message anchoring) stopped; L1 produced no blocks |
| Impact | No L1 blocks for **3 h 14 min**; settlement lag up to **3,184** L2 blocks; 57 withdrawals waiting > 30 min |
| Trigger | A one-slot re-org on L1 that orphaned a block the execution client had already made canonical |
| Root causes | (1) The beacon node's head became the *parent* of the execution client's head; per the Engine API the execution client must not build on an ancestor of its head, so no block could ever be produced. (2) 1-second slots on one node leave no slack. (3) The L2 coordinator wedged and had no liveness probe |
| Resolution | `debug_setHead` moved the execution client's head back by one empty, already-orphaned block; the coordinator was restarted |
| Detection | Critical alert 30 s after the last block; a human 3 h 11 min later |

## Impact

| what | how much |
|---|---|
| L1 | no blocks 07:30:57 → 10:45; L1 finality stuck; beacon chain in inactivity leak |
| L2 finalization | stopped; lag up to 3,184 blocks, drained over the afternoon |
| L2 → L1 withdrawals | 57 waiting > 30 min at detection; all claimed by 13:55 |
| L1 → L2 deposits | none possible (no L1 blocks) |
| Not affected | L2 block production and user transactions |

**Error budget.**

| SLO (28 days) | budget remaining before | after | |
|---|---|---|---|
| `settlement-freshness` (99 %) | −320 % | −365 % | −45 points: ~3 h of a 6.7 h monthly allowance, as expected |
| `withdrawal-1h` (99 % within 1 h) | 94 % | 94 % | **did not move** |

The withdrawal SLO should have taken the biggest hit; 57 withdrawals waited for hours. Its histogram explains why it did not. Over the two hours after recovery:

```text
le=600 0 | le=1200 0 | le=1800 0 | le=3600 0 | le=7200 0 | le=+Inf 45
```

All 45 withdrawals took more than 2 hours. The SLI is `good = bucket{le="3600"}` over `total = bucket{le="7200"}`, so anything slower than 2 hours falls out of the denominator as well: the worst requests were not counted as bad, they were not counted at all. This is the third SLI blind spot in this series (Part 1: unfinished deposits, Part 2: lag that still moves), and the most direct: the total must be `le="+Inf"`.

## Root causes and trigger

**Trigger.** Block production had been running close to the edge: `Slow Block Production` warnings, several slots handled in the same second, 1–4 failed block proposals every two minutes in the half hour before. At 07:30:56–58 teku could not get a payload in time, and then re-orged its head back:

```text
07:30:56.207 WARN  - No suitable payloadId for block production at slot 43094, requesting a new one to the EL
07:30:58.431 INFO  - Reorg Event *** New Head: 47b83d…edc (43093), Previous Head: 0512ef…363 (43095), Common Ancestor: 47b83d…
```

Besu had already imported the block of the orphaned slot (EL block 42491, `0x9ff3f…`), so its canonical head stayed one block ahead of teku's (EL 42490, `0x3bcbb…`).

**Root cause 1: a deadlock that the protocol makes permanent.** From then on, every slot, teku sent forkchoiceUpdated with head = 42490 and asked for a payload. The Engine API specification allows the execution client to skip the update and says it **must not start building a payload** when the requested head is a valid ancestor of its canonical head. Besu answered `VALID`, with no payload id:

```text
besu  07:31:30.502 | AbstractEngineForkchoiceUpdated | FCU(VALID) | head: 3bcbb.....29727 | safe: 32f91.....df01a | finalized: 35735.....18cee
```

and teku failed every proposal:

```text
teku  07:30:58.471 ERROR - Failed to process request to URL http://teku:4000/eth/v3/validator/blocks/43096
java.lang.IllegalStateException: ExecutionPayloadContext is not provided for production of post-merge block at slot 43096
```

Failed proposals per two minutes (Loki): 1–4 before 07:30, 12 at 07:30, 70 at 07:32, then **~120: every slot** for three hours. A new block would have broken the tie, but the only validator could not produce one. Each side was following its rules.

**Root cause 2: no slack.** One beacon node and one validator on 1-second slots, on a laptop shared with the rest of the lab. Slow proposals were routine; a re-org of this kind was a matter of time.

**Root cause 3: the coordinator wedged and nothing restarted it.** From ~07:38 the L2 coordinator's `/health` and `/metrics` stopped answering; it stopped cutting batches (the last one ends at a block of 07:36). It was still hung at 10:50, five minutes *after* L1 recovered, so it was not just waiting for L1. It had readiness and startup probes only: Kubernetes marked it unready 1,150 times and never restarted it. Why it hung is unknown: no thread dump was taken before the restart.

## Resolution

1. **L1 (10:45).** Confirmed that the head had not moved (`eth_blockNumber` = `0xa5fb`), then pointed Besu's head back at teku's (Besu has the `DEBUG` RPC API enabled in this lab):

   ```text
   before: {"jsonrpc":"2.0","id":1,"result":"0xa5fb"}
   head confirmed 42491 -> setHead 42490
   {"jsonrpc":"2.0","id":1,"result":"Success"}
   after 20s: {"jsonrpc":"2.0","id":1,"result":"0xa60d"}
   ```

   The dropped block was empty and already orphaned on the beacon side, so nothing was lost. Within 20 s L1 had produced 18 blocks; L1 finality caught up a few minutes later.
2. **Coordinator (10:51).** Restarted. It resumes from its database:

   ```text
   10:52:48.588 | main | INFO | app | Resuming conflation from block=9913 inclusive blockTime=2026-10-13T07:36:23Z
   ```

3. **Catch-up.** The prover then had a backlog of 3,000+ blocks while the L2 kept adding ~17 blocks a minute. Pausing two synthetic-traffic generators (the L2 makes no empty blocks, so fewer transactions means fewer blocks to prove) cut L2 growth to ~7.7 blocks a minute. Closing apps on the Mac to relieve the memory pressure from [Part 2](/posts/lineth-l2-postmortem-prover-trace-limit-host-memory/) brought proofs back from 360–485 s to ~180–200 s per 80-block batch.

## Detection

| | time (UTC) | after the last L1 block |
|---|---|---|
| Last L1 block | 07:30:57 | 0 |
| `LinethL1ExecutionHeadStalled` (critical) | 07:31:27 | 30 s |
| `LinethL2FinalizationStalled` | 07:35 | 4 min |
| `LinethL2ScrapeFailed` (coordinator) | 07:38 | 7 min |
| A human runs the workflow check | 10:42 | **3 h 11 min** |
| L1 producing again | 10:45 | 3 h 14 min |

Every alert was right and on time. They went to a log and a console nobody was watching, as in every incident before this one. Fifteen minutes after the recovery, lab alerts were routed to Telegram, and the rest of the catch-up was followed there.

## Lessons learned

**What went well**
- Cause found from logs and two RPC calls in about three minutes.
- The fix was the smallest possible (move one head pointer back past one empty, orphaned block) and the precondition was checked right before running it.
- During catch-up, measuring instead of guessing changed the plan twice: the backlog estimate was wrong (it ignored the L2's own growth), and the slowdown came from the host, not the cluster.

**What went wrong**
- 3 h 11 min between a correct critical alert and a person: the eighth time in this lab.
- "Running but not working" again: a process with only a readiness probe can stay broken forever.
- The coordinator was restarted before a thread dump was taken; its root cause is lost.
- The withdrawal SLI dropped exactly the requests that mattered.

**Where we got lucky**
- The orphaned block was empty, so rewinding the head lost nothing.

## Action items

| # | action | type | status |
|---|---|---|---|
| 1 | Route lab alerts to a person (Telegram) | detect | done |
| 2 | Coordinator liveness probe on `/health` (5 min of no answer → restart) | mitigate | applied after catch-up |
| 3 | Runbook for an L1 stall: deadlock check (FCU head = parent of EL head), `debug_setHead`, then the coordinator | process | done |
| 4 | Before restarting a wedged JVM, take a thread dump (`kill -3 1` prints it to the container log) | process | done (runbook) |
| 5 | Latency SLIs: total = `le="+Inf"`, not the largest finite bucket | detect | open |
| 6 | Longer L1 slots (2–4 s) to remove the trigger; needs a new genesis, so with the next chain reset | prevent | open |
| 7 | Automatic deadlock repair (a watchdog calling `debug_setHead`) | mitigate | not planned: rewinding a chain head automatically is riskier than alert + runbook |

## Timeline (UTC, 2026-10-13)

| time | event |
|---|---|
| 06:58–07:26 | 1–4 failed L1 proposals per 2 min; `Slow Block Production` warnings |
| 07:30:56 | `No suitable payloadId for block production at slot 43094` |
| 07:30:57 | Last L1 block (42491) |
| 07:30:58 | teku re-orgs to 43093 (EL 42490); every proposal fails from here (`ExecutionPayloadContext is not provided`) |
| 07:31:27 | `LinethL1ExecutionHeadStalled` fires (unseen) |
| ~07:38 | Coordinator `/metrics` and `/health` stop answering; last batch ends at a block of 07:36 |
| 09:36 | Last proof from the coordinator's queue; prover idle |
| 10:42 | Workflow check: L1 head stuck, coordinator not Ready, lag 3,184, 57 withdrawals waiting |
| 10:45 | `debug_setHead(42490)` → `Success`; L1 producing |
| 10:51–10:52 | Coordinator restarted; `Resuming conflation from block=9913` |
| 11:00 | Alerts routed to Telegram |
| 11:38 | Two traffic generators paused to slow L2 growth |
| 12:40–13:30 | Mac memory pressure slows proofs to 360–485 s; apps closed, back to ~180–200 s |
| 13:55 | All withdrawals claimed; lag 955 and falling |

## Takeaways

- **Two correct components can deadlock.** Teku asked for something reasonable and Besu refused for a reason the specification gives. With one validator, nothing outside the pair could break the tie. Small test networks remove the redundancy that hides these states in production.
- **Know your manual override before you need it.** `debug_setHead` was enabled and known; that turned a possible chain reset into a one-line fix.
- **Check the denominator.** A latency SLI whose total is the largest finite bucket silently drops every request slower than that bucket: the outage disappears from the SLO in proportion to how bad it is.
