---
title: "Lineth L2 Lab Postmortems (1) - A BigInt Bug That Broke the Bridge's Self-Repair"
description: "Deposits from L1 to L2 went unclaimed for 1 h 46 min. The postman had a repair path for exactly this failure, and it crashed 1,125 times on a string that should have been a bigint. A blameless postmortem in the Google SRE format, with the logs, the fix, and the upstream PR."
pubDatetime: 2026-10-13T22:00:00+09:00
tags:
  - SRE Postmortem
  - SRE
  - Postmortem
  - Incident Response
  - Ethereum
  - Layer 2
  - TypeScript
  - SLO
---

*Part 1 of a series of postmortems from my Lineth L2 lab: one incident per failure type. This one is the code bug.*

The lab runs a full L2 rollup (sequencer, RPC node, coordinator, prover, bridge relayer) against a local L1 on a single kind cluster, with synthetic users. Nobody's money was at risk, but every number below comes from the lab's own logs and metrics, and the bug is real: it is still on the upstream `main` branch, and I sent the fix as a [pull request](https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201).

The format follows the postmortem template in the [Google SRE book](https://sre.google/sre-book/example-postmortem/): summary, impact, root causes and trigger, resolution, detection, lessons learned (what went well, what went wrong, where we got lucky), action items, and a timeline. It is blameless: it describes what the system and the process allowed, not who to blame.

## Summary

| | |
|---|---|
| Incident | INC-2026-10-13-14 |
| Status | Resolved. Postman patched in the lab; upstream [issue #4200](https://github.com/LFDT-Lineth/lineth-monorepo/issues/4200), [PR #4201](https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201) |
| Severity | SEV-2: a bridge guarantee stopped (L1 → L2 deposits), the chain kept running |
| Impact | 41 deposits not claimed on L2 for up to **1 h 46 min**. None lost: every message was claimed exactly once in the end |
| Trigger | 41 signed claim transactions were lost when the L2 RPC node they were sent to was restarted (previous incident) |
| Root cause | The postman's repair path for a lost transaction crashed on every attempt: `TypeError: Cannot mix BigInt and other types` |
| Detection | Alert fired 47 min after the first stuck claim; a human looked 49 min after the alert |
| Resolution | 41 database rows reset by hand, exactly as the repair path would have; then a one-line fix in the postman |

## Background: how the postman claims a deposit

A deposit is a message sent on L1. The postman watches L1 for these messages and, once the message is anchored on L2, sends a claim transaction on L2 from one signer account. It stores each claim (nonce, fees, tx hash) in Postgres.

Two parts of its design matter here:

1. **Nonce choice.** The next nonce is `max(on-chain pending nonce, highest PENDING nonce in the DB + 1)`. The second term lets it send many claims without waiting for each one to be mined.
2. **Self-repair.** If a claim is not mined, the postman bumps its fees and resends. When the bumps are exhausted, it cancels the stuck nonce with a self-transfer at 110 % of the old fee, then resets the message to `SENT` so it is claimed again.

## Impact

| what | how much |
|---|---|
| L1 → L2 deposits (ETH and ERC-20 via the token bridge) | 41 claimed late, the longest **1 h 46 min 39 s** (submitted 04:20:39, claimed 06:07:18) |
| Duplicate claims | 2 messages got a second claim tx that reverted with `MessageDoesNotExistOrHasAlreadyBeenClaimed`: gas only |
| Not affected | L2 block production, L2 → L1 withdrawals (another signer), user transactions |

**Error budget.** The `deposit-10m` SLO (99 % of deposits claimed within 10 min, 28 days) moved only from **97 % to 96 %** of budget remaining. That is far too little for 41 deposits stuck for up to 1 h 46 min, and the reason is a finding in itself: the SLI is built from *completed* deposit traces. A deposit that never completes produces no trace, so for 1 h 46 min the SLI saw nothing wrong; the 41 late deposits only entered it when they were finally claimed, all in the same few minutes. The SLO measured survivors.

## Root causes and trigger

**Trigger.** A planned Docker VM restart (the fix for an earlier incident) left the L2 RPC node with no peer for 49 minutes ([Part 3](/posts/lineth-l2-postmortem-startup-dns-peer-lost/)). The postman kept sending claims to it; they sat in that node's pool and never reached the sequencer, and two restarts of the node dropped all 41 of them. The chain's nonce for the signer stayed at 197.

**Root cause 1: the nonce floor was pinned above the gap.** The 41 lost claims stayed `PENDING` in the database with nonces 197–237, so every new claim used nonce 238 or higher. None of them could be mined while 197 was missing. Nothing re-broadcasts a pending transaction whose hash has vanished from every pool.

**Root cause 2: the repair path could never succeed.** The repair path exists for exactly this case. It fired at 04:51:04 for nonce 197:

```text
time=2026-10-13T04:51:04.607Z level=WARN logger=L2TransactionLifecycleManager
  msg="Max fee bumps exhausted, cancelling stuck transaction and resetting message."
  direction=L1_TO_L2 messageHash=0x000a19cd…a9ee claimTxNonce=197 claimCycleCount=0
time=2026-10-13T04:51:04.619Z level=ERROR logger=L2TransactionLifecycleManager
  msg="Failed to cancel and reset message." direction=L1_TO_L2 messageHash=0x000a19cd…a9ee
  error="TypeError: Cannot mix BigInt and other types, use explicit conversions
    at ViemTransactionRetrier.cancelTransaction (.../ViemTransactionRetrier.js:56:55)
    at async TransactionLifecycleManager.cancelAndResetMessage (...)"
```

and then failed the same way every 4 seconds: **1,125 times** until 06:06:43, always for the same message.

The fee for the cancel transaction is computed as:

```ts
const MIN_REPLACEMENT_BUMP = 110n;
// ...
maxFeePerGas: (stuckFees.maxFeePerGas * MIN_REPLACEMENT_BUMP) / 100n,
```

`stuckFees` comes from the database. The entity declares `claim_tx_max_fee_per_gas` and `claim_tx_max_priority_fee_per_gas` as `bigint` columns, but the `pg` driver returns `int8` as a **string**, because a JavaScript `number` cannot hold the full int8 range. The mapper from entity to domain object passed both fields through unchanged:

```ts
claimTxMaxFeePerGas: entity.claimTxMaxFeePerGas,                 // "3819885", not 3819885n
claimTxMaxPriorityFeePerGas: entity.claimTxMaxPriorityFeePerGas,
```

so `"3819885" * 110n` threw. TypeScript did not catch it: the type says `bigint`, and types are not checked at runtime. The same mapper already wrapped the sibling columns `fee`, `value` and `messageNonce` in `BigInt(...)`; only these two were missed. The repair path was added later ([#2617](https://github.com/LFDT-Lineth/lineth-monorepo/pull/2617)) and had never run against a real database.

## Resolution

The fix had to wait for the code, so the repair was done by hand, copying what `cancelAndResetMessage` would have done:

1. Confirmed no transaction from the signer in any pool, on-chain pending nonce 197.
2. Backed up the 41 rows to CSV.
3. Scaled the postman to 0, reset the rows in one transaction (`status='SENT'`, claim tx fields cleared, `claim_cycle_count+1`), scaled it back to 1.

The new process started from the chain's nonce, because the database no longer held a pending nonce:

```text
time=2026-10-13T06:06:46.542Z level=INFO logger=L2NonceManager msg="NonceManager initialized."
  direction=L1_TO_L2 signerAddress=0xc8C9…7a62 startNonce=197 onChainNonce=197 dbMaxNonce=null
time=2026-10-13T06:07:18.683Z level=INFO logger=L2ReceiptStatusResolver
  msg="Message has been SUCCESSFULLY claimed." direction=L1_TO_L2 messageHash=0x000a19cd…a9ee
```

By 06:09 nonces 197 → 248 were mined: 39 claims succeeded and 2 reverted because those messages had already been claimed (the two duplicates above).

The code fix converts the two columns at the mapper, the one place every consumer goes through:

```ts
const toOptionalBigInt = (value: bigint | string | number | null | undefined): bigint | undefined =>
  value === null || value === undefined ? undefined : BigInt(value);

// bigint columns come back from the pg driver as strings; the domain (fee bumps, cancel) does bigint arithmetic
claimTxMaxFeePerGas: toOptionalBigInt(entity.claimTxMaxFeePerGas),
claimTxMaxPriorityFeePerGas: toOptionalBigInt(entity.claimTxMaxPriorityFeePerGas),
```

Two unit tests pin it down: string fee columns come out as `bigint` and survive the 110 % bump (`3819885n * 110n / 100n === 4201873n`), and `null` stays `undefined`. Both tests fail on the old code. The full postman suite passes (46 suites, 439 tests). The lab runs a patched image built from the release tag plus this patch; upstream, the same change is [PR #4201](https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201) against `main`, where the bug is still present.

## Detection

| | time (UTC) | after the first stuck claim |
|---|---|---|
| First claim stuck (nonce 197) | 04:20:39 | 0 |
| Repair path starts failing | 04:51:04 | 30 min |
| `LinethL2MessagesStuck` fires | 05:07:38 | 47 min |
| A human looks | 05:56 | 1 h 35 min |
| Mitigated | 06:06:43 | 1 h 46 min |

The alert was correct, but it went to a webhook that logged it and to nobody else. The incident was found by hand during a check of all workflows after the previous incident. Also, nothing alerted on the 1,125 ERROR lines: an error that repeats every 4 seconds for 75 minutes is a signal by itself.

## Lessons learned

**What went well**
- The source was read to explain the crash before anything was touched, so the manual repair copied the code's own intended reset instead of inventing one.
- The rows were backed up before the change, and the reset was one transaction.
- The fix went upstream with a test that fails without it.

**What went wrong**
- One incident's recovery (restarting the RPC node) silently caused this one. The restart had no check that every signer's pending transactions survived it.
- The SLI could not see a deposit that never finished.
- The alert reached no person: the eighth incident in a row with that gap.
- A recovery path that had never run in a real environment was trusted to handle the failure it was written for.

**Where we got lucky**
- The two duplicate claims reverted harmlessly because the contract rejects a second claim of the same message. Without that check, the manual repair could have paid out twice.

## Action items

| # | action | type | status |
|---|---|---|---|
| 1 | Convert the fee columns to `bigint` in the mapper; tests; lab image | prevent | done; upstream [#4201](https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201) |
| 2 | Route alerts to a person (Telegram) | detect | done |
| 3 | After restarting a node that holds others' pending transactions, compare every signer's on-chain nonce with the DB (runbook + check script) | process | done |
| 4 | Alert when a signer's pending DB nonce is ahead of its on-chain nonce for 10 min | detect | open |
| 5 | Make the deposit SLI count deposits that have *not* completed (age of the oldest unclaimed message), not only finished traces | detect | open |
| 6 | Exercise the cancel path on purpose: drop a pending claim and watch it repair itself | test | open |
| 7 | Find why two messages got a second claim during the re-claim | prevent | open |
| 8 | Alert on an ERROR that repeats (here 1,125 identical lines in 75 min) | detect | open |

## Timeline (UTC, 2026-10-13)

| time | event |
|---|---|
| 04:17 | Docker VM restarted (planned, previous incident's fix); the RPC node comes up without its peer |
| 04:20:39 | Claim for message `0x000a19cd…` submitted with nonce 197, to the peer-less RPC node |
| 04:20 – 05:46 | 41 claims sent (nonces 197–237); none reaches the sequencer |
| 04:51:04 | Fee bumps exhausted; first `Failed to cancel and reset message` (TypeError) |
| 04:56, 05:26 | RPC node restarted twice (previous incident's recovery): the 41 claims are dropped from its pool |
| 05:07:38 | `LinethL2MessagesStuck` fires into a log nobody watches |
| 05:56 | Found during a manual check of all workflows: 41 messages `PENDING`, on-chain nonce 197 |
| 06:06:43 | Rows backed up and reset, postman restarted (1,125th and last TypeError) |
| 06:06:46 | `NonceManager initialized … startNonce=197 dbMaxNonce=null` |
| 06:07:18 | Message `0x000a19cd…` claimed |
| 06:09 | All 41 claimed (39 success, 2 already-claimed reverts) |
| 06:45 | Patched postman deployed in the lab |

## Takeaways

- **A recovery path that never ran is not a recovery path.** If the system has a self-repair for a failure, cause that failure on purpose before you depend on it.
- **Types end at the process boundary.** A database driver, a JSON parser or an RPC client can hand you a string where the type says `bigint`. Convert at the boundary, once, where every caller passes through.
- **Measure what has not finished, not only what has.** A latency SLI built from completed requests is blind exactly when requests stop completing.
