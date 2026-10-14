---
title: "Lineth L2 Transaction Lifecycle (2) - From L2 Blocks to Execution Proofs: Trace and Conflation in the Coordinator"
description: "How the Coordinator turns L2 blocks into proof work. I followed blocks 24,205 to 24,284 in my Lineth lab: an 80-block batch closed by a trace limit, a one-batch blob, an execution-proof request, and its result 3 minutes 24 seconds later."
pubDatetime: 2026-10-14T15:50:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

In the [previous post](/posts/lineth-l2-following-a-transaction-through-besu-and-maru/), I followed an execution payload from Sequencer Besu to RPC Besu and confirmed the transaction through its receipt.

This post covers the next stage. The Coordinator groups L2 blocks into proof work, creates batches and blobs, and picks up the execution-proof results.

The example is L2 blocks 24,205 through 24,284, a different range from the block in the previous post. All timestamps are UTC.

## Execution traces

A receipt says whether a transaction succeeded and how much gas it used. It says nothing about the individual steps of execution.

An execution trace does. It records the computation and state changes that happened while the transactions ran. A contract call might go:

```text
Read input
    ↓
Do arithmetic
    ↓
Use the result
    ↓
Update contract state
```

The ZK tracer records what's needed to prove each of those steps followed the EVM's rules. The Prover takes that as input when it generates an execution proof.

### Trace counters

The Coordinator logs counters like these:

```text
ADD=327
BLOCK_HASH=1440
HUB=17679
```

Each is a quantity for one trace module. They aren't transaction counts or durations, and they aren't the trace itself. They summarize how much work the blocks represent, so the Coordinator can tell whether one more block still fits under the limits.

## Conflation

Conflation groups consecutive L2 blocks into one unit of proof work. The Coordinator keeps adding blocks and checking their combined counters until something tells it to stop:

```text
Add block 24205
    ↓
Add block 24206
    ↓
Keep adding
    ↓
Hit a closing condition
    ↓
Close the batch
```

That condition can be a trace limit, a block-count limit, or a deadline. Once the range is fixed, the traces for those blocks are prepared and combined for the Prover.

Nothing is merged on chain. The blocks stay separate; the grouping exists only for proving.

```text
Execution trace   what's needed to prove execution
    ↓
Conflation        group blocks, combine their traces
    ↓
Batch             the unit one execution proof covers
    ↓
Prover            generates the proof
```

## Batch and blob

The logs mention both a batch and a blob. They can cover the same blocks, but they're for different things.

| Unit | Purpose |
|---|---|
| Batch | Groups L2 blocks for execution proving |
| Blob | Groups compressed block and transaction data for publication on L1 |

```text
L2 blocks
    ├─ Execution proving → batch
    └─ Data publication  → compressed data in a blob
```

The proof shows execution was correct. The published data lets anyone rebuild the blocks and transactions. A blob isn't a container for the proof file.

One blob can hold several batches. In the records below, each blob holds exactly one, so the ranges match.

## The Coordinator's side of the flow

```text
L2 blocks available
    ↓
Coordinator collects block data and trace counters
    ↓
Conflation sets a batch boundary
    ↓
Traces prepared
    ↓
Coordinator writes an execution-proof request
    ↓
Prover works on it
    ↓
Coordinator picks up the result
```

Blob grouping runs alongside. A new blob record doesn't mean the proof is done or that anything has gone to L1.

## The batch closes on a trace limit

I searched the Coordinator logs for conflation decisions:

```bash
k -n lineth-l2 logs deploy/coordinator -c coordinator --since=1h \
  | grep -iE 'conflation|conflated' \
  | grep -iE 'trigger|limit|deadline|24205|24284'
```

The batch record, with the counter map cut short:

```text
2026-10-14 04:30:32.787+0000 | vert.x-eventloop-thread-0 | INFO | ProofGeneratingConflationHandlerImpl | new batch: batch=[24205..24284]80 trigger=TRACES_LIMIT tracesCounters=TracesCountersV5(...)
```

Part of the full map:

```text
ADD=327
BLOCK_DATA=2240
BLOCK_HASH=1440
HUB=17679
ROM=249232
BLOCK_TRANSACTIONS=114
```

The range is inclusive, so 24284 − 24205 + 1 = 80 blocks. `BLOCK_TRANSACTIONS` is 114; a block can hold more than one transaction, so the two numbers differ.

`trigger=TRACES_LIMIT` means a trace limit closed the batch. The log doesn't say which module hit its limit.

Other batches in the same window look identical:

| Batch range | Blocks | BLOCK_HASH |
|---|---:|---:|
| 24,125–24,204 | 80 | 1,440 |
| 24,205–24,284 | 80 | 1,440 |
| 24,285–24,364 | 80 | 1,440 |
| 24,365–24,444 | 80 | 1,440 |

Every batch is 80 blocks with `BLOCK_HASH=1440`. That's a pattern in this lab with these settings, not a rule that Lineth batches are 80 blocks.

## The blob closes on a batch limit

One millisecond after the batch, the Coordinator logged:

```text
2026-10-14 04:30:32.788+0000 | vert.x-eventloop-thread-0 | INFO | GlobalBlockConflationCalculator | new blob: blob=[24205..24284]80 trigger=BATCHES_LIMIT blobSizeBytes=5536 blobBatchesCount=1 blobBatchesLimit=1 blobBatchesList=[[24205..24284]80]1
```

The blob holds one batch, and the limit is one batch per blob. It's 5,536 bytes. It closed on `BATCHES_LIMIT`, not on size, so this blob was nowhere near full.

The two boundaries are separate decisions:

```text
Trace limit
    ↓
Batch 24205–24284 closes
    ↓
Batch goes into a blob
    ↓
Batch-count limit
    ↓
Blob for the same range closes
```

`new blob` is a local grouping decision. It doesn't mean the blob was sent to L1.

## The proof request

```text
2026-10-14 04:30:33.164+0000 | vert.x-eventloop-thread-1 | INFO | ProofGeneratingConflationHandlerImpl | execution proof request generated: proofIndex=ExecutionProofIndex(startBlockNumber=24205, endBlockNumber=24284, startBlockTimestamp=2026-10-14T04:23:12Z)
```

`startBlockNumber=24205` and `endBlockNumber=24284` match the batch.

The three timestamps mean different things:

| Timestamp | What it is |
|---|---|
| 04:23:12 | First block in the batch |
| 04:30:32.787 | Coordinator closed the batch |
| 04:30:33.164 | Coordinator wrote the proof request |

`startBlockTimestamp` is when the first block was made, not when the Prover started. The batch closed 7 minutes 20 seconds after that block.

Closing the batch to writing the request took 377ms.

In this lab, the Coordinator and Prover talk through files on shared storage. The Coordinator writes a request file and the Prover picks it up, so a request record means the file exists, not that the Prover is working on it yet.

## The proof result

```text
2026-10-14 04:33:57.425+0000 | vert.x-eventloop-thread-2 | INFO | ProofGeneratingConflationHandlerImpl | execution proof generated: batch=Batch(startBlockNumber=24205, endBlockNumber=24284)
```

Same range as the request. To pull both lines at once:

```bash
k -n lineth-l2 logs deploy/coordinator -c coordinator --since=1h \
  | grep -E 'execution proof request generated|execution proof generated' \
  | grep -E '24205|24284'
```

| Event | UTC |
|---|---|
| Batch closed (`TRACES_LIMIT`) | 04:30:32.787 |
| Blob closed (`BATCHES_LIMIT`) | 04:30:32.788 |
| Proof request written | 04:30:33.164 |
| Proof result picked up | 04:33:57.425 |

```text
04:33:57.425 − 04:30:33.164 = 204.261 s ≈ 3 min 24 s
```

That's from the Coordinator writing the request to the Coordinator seeing the result. It includes the request waiting in line, the proving itself, and the Coordinator's polling interval, so it's an upper bound on proving time, not a measurement of it.

The lab runs a partial, dev-mode proving configuration, so `execution proof generated` here doesn't carry the guarantees of a production proof.

## Where this leaves block 24,205

```text
Batch 24205–24284 closed on TRACES_LIMIT (80 blocks, 114 transactions)
    ↓
Blob for the same range closed on BATCHES_LIMIT (1 batch, 5,536 bytes)
    ↓
Execution-proof request written
    ↓
Result picked up 3 min 24 s later
```

The blocks now have an execution proof. The [next post](/posts/lineth-l2-inside-the-prover-from-request-to-proof-response/) looks at what the Prover did during those 3 minutes 24 seconds.
