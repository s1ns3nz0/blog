---
title: "Lineth L2 Transaction Lifecycle (4) - Following an L2 Blob from Creation to Finalization on L1"
description: "One 80-block L2 range in my Lineth lab, from the Coordinator closing its blob, through the compression proof and the EIP-4844 blob transaction, to the DataFinalizedV3 event on the L1 rollup contract. Coordinator logs, cast receipts, and contract events, connected by range and hash."
pubDatetime: 2026-10-14T18:11:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

The [previous post](/posts/lineth-l2-inside-the-prover-from-request-to-proof-response/) followed the proofs inside the Prover. This one follows a range the rest of the way: out of the Coordinator and into the rollup contract on L1.

The range is L2 blocks 25,805 through 25,884, which is 80 blocks:

```text
25884 - 25805 + 1 = 80
```

I connected four stages with Coordinator logs, L1 transactions, receipts, and contract events:

```text
Blob created
    ↓
Compression proof done
    ↓
Blob published on L1
    ↓
Same L2 range finalized
```

All timestamps are UTC.

## The units

| Unit | What it is |
|---|---|
| Batch | Consecutive L2 blocks proved together as one execution proof |
| Blob | Compressed block data, prepared for publication on L1 |
| Aggregation | A proof that combines execution and compression proofs into one |

The execution proof is about whether the blocks executed correctly. The compression proof is about whether the compressed data matches the data it stands for. Aggregation is a proving step of its own, not a concatenation of proof files. One aggregation can cover several batches or blobs, and its block range alone doesn't tell you how many proofs went into it.

Publication and finalization are also different jobs. Publication puts the blob data on L1. Finalization moves the rollup contract's finalized L2 state forward.

## The blob is created

I searched the Coordinator logs for blob creation and compression proof completion:

```bash
k -n lineth-l2 logs deploy/coordinator -c coordinator --since=2h \
  | grep -E 'new blob:|blob compression proof generated:' \
  | grep -F '[25805..25884]'
```

The creation record:

```text
2026-10-14 06:43:11.533+0000 | vert.x-eventloop-thread-2 | INFO | GlobalBlockConflationCalculator | new blob: blob=[25805..25884]80 trigger=BATCHES_LIMIT blobSizeBytes=5440 blobBatchesCount=1 blobBatchesLimit=1 blobBatchesList=[[25805..25884]80]1
```

| Field | Value | Meaning |
|---|---|---|
| `blob` | `[25805..25884]80` | L2 range and block count |
| `trigger` | `BATCHES_LIMIT` | Why the blob closed |
| `blobSizeBytes` | `5440` | Size as the Coordinator measured it |
| `blobBatchesCount` | `1` | Batches in this blob |
| `blobBatchesLimit` | `1` | Batch limit per blob |
| `blobBatchesList` | `[[25805..25884]80]1` | The batch it holds |

One 80-block batch, closed because the blob reached its one-batch limit. Same shape as the blobs in parts 2 and 3.

`blobSizeBytes` is the Coordinator's own number. It isn't the size of the L1 transaction or its blob sidecar.

## The compression proof

The same query returned:

```text
2026-10-14 06:46:11.249+0000 | vert.x-eventloop-thread-0 | INFO | BlobCompressionProofCoordinator | blob compression proof generated: blob=[25805..25884]80
```

Same range. The gap from creation:

```text
06:46:11.249 - 06:43:11.533 = 179.716 s ≈ 3 min
```

Like the execution proof in part 2, that's the time between two Coordinator records. Preparation, waiting on inputs, queueing, and polling are all inside it, so it isn't the prover's compute time.

## The submission to L1

```bash
k -n lineth-l2 logs deploy/coordinator -c coordinator --since=2h \
  | grep -F 'blobs submitted:' \
  | grep -F '25884'
```

```text
2026-10-14 06:46:14.164+0000 | web3j-async | INFO | BlobSubmitterAsEIP4844MultipleBlobsPerTx | blobs submitted: blobs=[[25805..25884]80]1 transactionHash=0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3, nonce=304 gasPriceCaps=null
```

That's 2.915 seconds after the compression proof, and it ties the range to an L1 transaction hash. The submitter class can put several blobs in one transaction; this one carried one.

`gasPriceCaps=null` doesn't mean the transaction paid no fees. The fee fields are on the transaction itself.

A submission log only says the Coordinator sent the transaction. Whether it succeeded is in the receipt.

## The receipt

I queried L1 from inside the `l2-users` pod, which has the L1 endpoint in `$L1`:

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast receipt -r "$L1" \
    0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3 \
    --json' \
  | jq '{transactionHash, blockNumber, status, from, to, gasUsed}'
```

```json
{
  "transactionHash": "0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3",
  "blockNumber": "0x1b4ee",
  "status": "0x1",
  "from": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  "to": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  "gasUsed": "0x1cc63"
}
```

```text
blockNumber: 0x1b4ee → 111854
status:      0x1     → success
gasUsed:     0x1cc63 → 117859
```

The hash matches the Coordinator's record, and the transaction succeeded in L1 block 111,854. Two different block numbers are in play now: L2 blocks 25,805 to 25,884 are the data, and L1 block 111,854 holds the transaction that published it.

`gasUsed` is execution gas only. Blob gas isn't in it.

## The transaction carries a blob

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast tx -r "$L1" \
    0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3 \
    --json' \
  | jq '{hash, type, blockNumber, blobVersionedHashes, maxFeePerBlobGas}'
```

```json
{
  "hash": "0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3",
  "type": "0x3",
  "blockNumber": "0x1b4ee",
  "blobVersionedHashes": [
    "0x017bcbddc03450ac09599a3772ba58fc14aec34f1a4537b9589c10614b0d8eee"
  ],
  "maxFeePerBlobGas": "0x174876e800"
}
```

Type `0x3` is an EIP-4844 blob transaction. There's one versioned hash, matching the one blob the Coordinator reported.

A versioned hash comes from the blob's KZG commitment. It points at that commitment; it isn't an L2 block hash and it isn't the blob data.

`maxFeePerBlobGas` is `0x174876e800`, a cap of 100 gwei per unit of blob gas. It's the most the sender would pay, not what it paid.

## Finalization on L1

Finalization is the step where the Coordinator submits the aggregation proof and the rollup contract accepts it. When it does, the contract emits:

```solidity
event DataFinalizedV3(
  uint256 indexed startBlockNumber,
  uint256 indexed endBlockNumber,
  bytes32 indexed shnarf,
  bytes32 parentStateRootHash,
  bytes32 finalStateRootHash
);
```

The first two indexed fields are the finalized L2 range, so the event can be found by range. I searched the rollup contract from the blob's L1 block onward:

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast logs -r "$L1" \
    --address 0xdc64a140aa3e981100a9beca4e685f962f0cf6c9 \
    --from-block 111854 \
    --to-block 113503 \
    "DataFinalizedV3(uint256,uint256,bytes32,bytes32,bytes32)" \
    --json' \
  | jq '.[] | {
      transactionHash,
      l1BlockNumber: .blockNumber,
      startL2BlockHex: .topics[1],
      endL2BlockHex: .topics[2]
    }'
```

The first result is the range:

```json
{
  "transactionHash": "0x425f055c29cb1990da1e0322fa14c1af0a93a01e59424b0c4bc373da089c7655",
  "l1BlockNumber": "0x1b4f0",
  "startL2BlockHex": "0x00000000000000000000000000000000000000000000000000000000000064cd",
  "endL2BlockHex": "0x000000000000000000000000000000000000000000000000000000000000651c"
}
```

```text
startBlockNumber: 0x64cd  → 25805
endBlockNumber:   0x651c  → 25884
L1 blockNumber:   0x1b4f0 → 111856
```

The contract finalized exactly the range that was published. Publication and finalization were separate transactions:

| Operation | Transaction | L1 block |
|---|---|---|
| Blob publication | `0x963a…b9bb3` | 111,854 |
| Finalization | `0x425f…7655` | 111,856 |

Two blocks apart. Block numbers alone don't give a time gap, so the next step is the finalization receipt.

## The finalization receipt

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast receipt -r "$L1" \
    0x425f055c29cb1990da1e0322fa14c1af0a93a01e59424b0c4bc373da089c7655 \
    --json' \
  | jq '{
      transactionHash,
      blockNumber,
      status,
      from,
      to,
      gasUsed,
      blockTimestamp: .logs[0].blockTimestamp
    }'
```

```json
{
  "transactionHash": "0x425f055c29cb1990da1e0322fa14c1af0a93a01e59424b0c4bc373da089c7655",
  "blockNumber": "0x1b4f0",
  "status": "0x1",
  "from": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "to": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  "gasUsed": "0x68aff",
  "blockTimestamp": "0x6acf2539"
}
```

```text
status:         0x1        → success
gasUsed:        0x68aff    → 428799
blockTimestamp: 0x6acf2539 → 2026-10-14T06:46:17Z
```

`status: 0x1` says the transaction ran. The `DataFinalizedV3` event in it says what it did: the contract recorded L2 blocks 25,805 to 25,884 as finalized.

The finalization transaction is also sent from a different account than the blob submission (`0x7099…79c8` against `0x3c44…93bc`). Both are signed through Web3Signer, with a different key for each path. The [next post](/posts/lineth-l2-web3signer-signing-https-and-l1-sender-verification/) checks those keys against these senders.

The block timestamp is whole seconds, so I use it to place the event on the timeline, not to compute a latency against the millisecond service logs.

## The contract's current state

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast call -r "$L1" \
    0xdc64a140aa3e981100a9beca4e685f962f0cf6c9 \
    "currentL2BlockNumber()(uint256)"'
```

```text
26284 [2.628e4]
```

The bracket is `cast` printing the same number in scientific notation. The event above is one past transition; this is the state now. Finalization has since moved on to block 26,284, well past the range I followed.

## The timeline

| Time or block | What happened |
|---|---|
| 06:43:11.533 | Blob 25805..25884 created |
| 06:46:11.249 | Compression proof done |
| 06:46:14.164 | Blob submitted |
| L1 block 111,854 | Blob transaction succeeded: type `0x3`, one versioned hash |
| 06:46:17, L1 block 111,856 | `DataFinalizedV3` for the same L2 range |
| Later | Contract reports finalized L2 block 26,284 |

From blob creation to finalization on L1 took about three minutes, and most of that was the compression proof.

"Finalized" here means the rollup contract's finalized L2 state. Whether L1 block 111,856 is itself final under L1 consensus is a separate check.
