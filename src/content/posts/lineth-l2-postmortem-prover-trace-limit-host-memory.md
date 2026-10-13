---
title: "Lineth L2 Lab Postmortems (2) - Two Counters, One Limit: Every Batch Proven Twice"
description: "Settlement fell 1,087 blocks behind. Every batch had been failing the prover's normal mode for days because the coordinator and the prover counted the same trace module differently, and the Mac under the cluster was swapping the prover's memory. A Google SRE format postmortem with the logs and the arithmetic."
pubDatetime: 2026-10-13T22:10:00+09:00
tags:
  - SRE Incident
  - SRE
  - Postmortem
  - Incident Response
  - Ethereum
  - Layer 2
  - Zero Knowledge
  - Capacity Planning
  - SLO
---

*Part 2 of a series of postmortems from my Lineth L2 lab: one incident per failure type. [Part 1](/posts/lineth-l2-postmortem-postman-bigint-nonce-gap/) was a code bug. This one is resources and capacity.*

The lab is a full L2 rollup on one kind cluster on a Mac: a sequencer produces L2 blocks, a coordinator cuts them into batches, a prover generates a zero-knowledge proof for each batch, and the proofs finalize the L2 state on L1. "Settlement lag" is how far the finalized block trails the L2 head. Format: the [Google SRE postmortem template](https://sre.google/sre-book/example-postmortem/), blameless.

## Summary

| | |
|---|---|
| Incident | INC-2026-10-13-12 |
| Status | Resolved |
| Severity | SEV-3: settlement degraded (never stopped) |
| Impact | Settlement lag grew from ~150 to **1,087 blocks** over ~3 h 20 min; withdrawals waited in proportion (36 min for one end-to-end test) |
| Trigger | A restart of every pod (rolling back an unrelated change) made the prover slower, and the lag it had always carried started to grow |
| Root causes | (1) The coordinator and the prover counted the `blockhash` trace module differently, so **every** batch failed the prover's normal mode and was re-proven in a large mode at ~10 GiB. (2) The Mac running the cluster was out of memory and compressed the prover's working set |
| Resolution | Batch size cut from 113 to 80 blocks (fits normal mode), Docker VM 36 → 30 GiB; proofs 9–10 min → ~3 min 20 s |

## Background: batches, trace limits, and two proving modes

The prover proves a batch against fixed-size tables ("modules"), one per kind of EVM work. Each module has a row limit. A batch that needs more rows than a limit overflows; the prover exits with code 77 and the job is re-run in **large mode**, with bigger tables, much more memory and time.

To avoid that, the coordinator sizes batches itself. For every block it asks the RPC node for line counters per module, adds them up, and closes the batch before any module would pass the limit in `traces-limits-v5.toml`. The config's invariant is "every value here ≤ the prover's limit". That only protects the prover if both sides count the same way.

## Impact

| what | how much |
|---|---|
| Settlement lag (L2 head − finalized) | ~100–190 blocks the evening before → **486** at 02:53 → **1,087** at 04:13 → 51–109 from ~05:23 |
| Withdrawals (L2 → L1) | slower in proportion; the end-to-end test's withdrawal waited 36 min for finalization |
| Not affected | L2 blocks, deposits, user transactions |

**Error budget.** The `settlement-freshness` SLO (99 %, 28 days) did not move at all: its remaining budget was −319 % before and after. Part of that is old (it was already exhausted by an earlier 27-hour halt), but the main reason is the SLI. It is "did the finalized block change in the last 30 minutes", and finalization never stopped; it only fell behind. A lag of 1,087 blocks and a lag of 50 look the same to it. Like the deposit SLI in Part 1, it measures that something happens, not how late it is.

## Root causes and trigger

**Trigger.** At 02:01–02:08 an unrelated change was rolled back and every pod restarted. Afterwards large-mode proofs took longer: 5 min 44 s for a batch the evening before, 9 min 6 s at 02:22. The lag that large mode had always cost started to grow instead of holding.

**Root cause 1: two counters, one limit (pre-existing).** Every batch did this. The evening before:

```text
time="2026-10-12T22:09:42Z" ... The processing of file `1931-2043-getZkProof.json` ... took 21.0 seconds and returned exit code 77
time="2026-10-12T22:15:26Z" ... The processing of file `1931-2043-getZkProof.json` ... (large) took 343.8 seconds and returned exit code 0
```

and at the start of the incident:

```text
time="2026-10-13T02:31:42Z" level=error msg="[LIMIT OVERFLOW] A limit overflow has been detected limit=2048 requested=2220
  err=limit overflow: module 'blockhash' overflows its limit height=2220 limit=2048 ratio=1.083984375"
time="2026-10-13T02:31:42Z" ... `5547-5659-getZkProof.json` ... took 22.6 seconds and returned exit code 77
time="2026-10-13T02:40:33Z" ... `5547-5659-getZkProof.json` ... (large) took 529.0 seconds and returned exit code 0
```

Loki has **64** such overflows between 10-12 18:00 and 10-13 03:00, 7–8 an hour: every batch. Asking why until the answer was something to change:

- *Why did batches overflow?* The prover counted 2,220 `blockhash` rows for a 113-block batch; the limit is 2,048.
- *Why did the coordinator build them?* Its limit was `BLOCK_HASH = 2048`, checked against the RPC node's counters, which give `BLOCK_HASH` = 18 for every block: 113 × 18 = 2,034 ≤ 2,048.
- *Why do the two disagree?* The prover's module covers a fixed 256-block window of block hashes on top of the batch itself. Two measurements fixed the shape: 113 blocks → 2,220 and 100 blocks → 2,142, i.e. **6 × (n + 257)**. For that to stay ≤ 2,048, n ≤ 84.
- *Not the transactions:* an opcode trace of all 157 transactions in one batch found no `BLOCKHASH` opcode.

The first fix proved the model wrong: `BLOCK_HASH = 1800` (100-block batches) still overflowed:

```text
time="2026-10-13T03:32:40Z" level=error msg="[LIMIT OVERFLOW] A limit overflow has been detected limit=2048 requested=2142
  err=limit overflow: module 'blockhash' overflows its limit height=2142 limit=2048 ratio=1.0458984375"
```

That second data point is what gave the linear model above.

**Root cause 2: the host was out of memory.** After the batches fitted normal mode, they still took 8.5–10 minutes. Nothing inside the VM showed why: no CPU throttling, about 8 idle cores. The cause was one level down, on the Mac: the Docker VM was set to 36 GiB on a 48 GB machine that also ran a browser and other apps, so macOS compressed and swapped the VM's memory.

| on the Mac at 04:13 | value |
|---|---|
| VM memory actually resident | 9.7 GB of 36 GiB |
| page decompressions | ~178,000 / s |
| swap used | 9.3 / 10 GB |
| `kernel_task` | ~198 % CPU |

Every page of the prover's working set it touched had to be decompressed first.

## Resolution

1. **Batch size** (`traces-limits-v5.toml`), with the measured model kept in the comment so the next person does not have to rediscover it:

   ```toml
   # the besu counters give 18/block, but the prover's blockhash module counts 6 x (n + 257) for an
   # n-block batch (fixed 256-block window): measured 113 -> 2220, 100 -> 2142. Its normal-mode limit 2048 holds
   # n <= 84. 1440 = 80 blocks x 18 -> prover 2022 < 2048.
   BLOCK_HASH          = 1440
   ```

   Before each change the in-flight batch was allowed to finish, and the requests orphaned by re-cutting the batches were moved aside rather than deleted.
2. **Docker VM 36 → 30 GiB**, giving the Mac headroom.

The effect, from the prover's own log:

```text
03:54:55  6212-6311  took 593.6 s   exit 0     (100 blocks, before the VM change)
04:13:30  6292-6371  took 604.8 s   exit 0     (80 blocks, normal mode, host still swapping)
04:21:13  6452-6531  took 208.7 s   exit 0     (after the VM change)
04:24:31  6372-6451  took 197.3 s   exit 0
04:31:38  6612-6691  took 188.1 s   exit 0
04:51:42  7092-7171  took 201.0 s   exit 0
```

Finalization went from 341 to 720 blocks per 30 minutes; the lag was back to its structural minimum (one or two batches) by ~05:23.

## Detection

| | time (UTC) |
|---|---|
| Lag starts growing | ~02:05 |
| Found by hand (end-to-end test: withdrawal slow) | ~02:53 |
| Alerts firing at the time | `LinethL2ProverBacklog`, `LinethL2SLOBurnRateTicket`, into a log nobody watched |

The overflow itself had been logged 7–8 times an hour for days and was known ("every 113-block batch goes large"), but it was treated as the normal cost of doing business, not as a defect. The host memory cause was found only by measuring on the Mac (`vm_stat`, `sysctl vm.swapusage`): nothing the cluster's monitoring could see.

## Lessons learned

**What went well**
- The investigation separated "always true" from "new": Loki history showed the overflow on every batch for days, so the restart was the trigger and not the cause.
- The first numeric fix was tested on one batch before being trusted, and two measurements corrected the model instead of a guess.
- In-flight work was allowed to finish before each restart; orphaned requests were moved, not deleted.

**What went wrong**
- A known error, repeated hundreds of times, was accepted as normal. Every batch was proven twice, at ten times the memory, for days.
- The VM memory had been raised in an earlier incident to fit the VM, without checking what was left for the host.
- The settlement SLI could not see lag.
- The second fix (the VM restart) caused the next incident: the L2 RPC node came back without its peer ([Part 3](/posts/lineth-l2-postmortem-startup-dns-peer-lost/)).

**Where we got lucky**
- The RPC node's history limit had been raised in an earlier incident, so batches could be re-cut far behind the head.

## Action items

| # | action | type | status |
|---|---|---|---|
| 1 | `BLOCK_HASH = 1440`, measured model in the config comment | prevent | done |
| 2 | Docker VM 30 GiB | prevent | done |
| 3 | Prover memory request = its real normal-mode peak (9.44 GiB working set → 10 GiB request) so the scheduler sees it | prevent | done |
| 4 | Alert on any prover normal-mode overflow: a regression of item 1 must be visible | detect | open |
| 5 | Measure host memory pressure (Mac decompressions/s, swap) with a threshold; nothing inside the VM sees it | detect | open |
| 6 | Settlement SLI on lag (head − finalized), not only "finalization moved" | detect | open |
| 7 | Route alerts to a person | detect | done (Telegram) |

## Timeline (UTC, 2026-10-13)

| time | event |
|---|---|
| 02:01–02:08 | Unrelated rollback; every pod restarts |
| 02:31:42 | `LIMIT OVERFLOW requested=2220`, exit 77 after 22.6 s; large mode takes 529 s |
| 02:53 | Lag 486 and growing; investigation starts |
| 03:00–03:15 | Transactions and opcode traces ruled out; counters compared: 2,034 (coordinator) vs 2,220 (prover) |
| 03:22 | Fix 1a: `BLOCK_HASH = 1800` (100-block batches) |
| 03:32:40 | 100 blocks still overflow (`requested=2142`); model corrected to 6 × (n + 257) |
| 03:45 | Fix 1b: `BLOCK_HASH = 1440` (80-block batches): normal mode, no more overflows |
| 03:54–04:13 | Normal mode, but 8.5–10 min per batch; lag 1,087 |
| 04:13 | Mac measured: 9.7 GB of the VM resident, ~178k decompressions/s |
| 04:17–04:20 | Fix 2: Docker VM 36 → 30 GiB |
| 04:21–04:51 | 10 batches in a row at 188–239 s |
| ~05:23 | Lag 51–109: back to normal |

## Takeaways

- **When two components enforce one limit, check that they count the same thing.** Here, one side counted 18 rows per block and the other 6 × (n + 257) for the same module. Both looked correct on their own.
- **A recurring error is a defect, not background.** "It always does that" was true and expensive.
- **Capacity has a floor below the cluster.** On a laptop lab, the host's memory is part of the capacity plan, and the cluster's own monitoring cannot see it.
