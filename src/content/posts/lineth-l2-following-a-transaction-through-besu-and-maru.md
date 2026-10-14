---
title: "Lineth L2 Transaction Lifecycle (1) - Following an L2 Transaction Through Besu and Maru"
description: "A transaction that is accepted, one that is included in a block, and one an RPC node can serve are three separate events. I followed L2 block 23,851 in my Lineth lab from the sequencer's payload, through the RPC node's import and head update, to a successful receipt, using only Kubernetes logs and JSON-RPC."
pubDatetime: 2026-10-14T13:50:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

*Part of the [Lineth L2 Transaction Lifecycle](/tags/lineth-l2-lifecycle/) series. The component map is in [part 0](/posts/lineth-l2-lab-architecture/).*

A transaction being accepted, included in a block, and served by an RPC node are three separate events. An RPC call that returns a transaction hash proves only the first.

I traced one block through my local [Lineth L2 lab](/posts/lineth-l2-homelab-kubernetes-architecture-and-monitoring/) with Kubernetes logs and JSON-RPC queries. The path runs from Sequencer Besu, through Maru, to RPC Besu, and ends at a transaction receipt.

The main example is L2 block 23,851. A second example, at height 23,736, shows how Maru handles an empty proposal.

All log timestamps are UTC.

## The components

The lab runs two Besu processes with different jobs, plus Maru.

| Component | Role |
|---|---|
| RPC Besu | Accepts user RPC requests, keeps its own transaction pool, serves chain queries |
| Sequencer Besu | Selects transactions from its pool, executes them, builds execution payloads |
| Maru | Runs L2 consensus and drives block building, validation, and head updates through the Engine API |

The path a transaction takes:

```text
Signed transaction submitted
    ↓
RPC Besu: validation, local transaction pool
    ↓ P2P propagation
Sequencer Besu: selection and execution
    ↓ Engine API
Maru: proposal validation and consensus
    ↓ Engine API
RPC Besu: payload import, head update
    ↓
Receipt available
```

The two Besu nodes keep separate pools. A hash returned by RPC Besu doesn't mean the sequencer has the transaction, let alone included it.

## Lab helpers

A shell helper selects the local cluster and wraps RPC calls:

```bash
export KUBECONFIG="$HOME/.kube/lineth-local.yaml"
source ~/lineth-l2-gitops/scripts/labq.sh
lab_pf
```

It can send the same query to either node:

```bash
# RPC Besu
rpc eth_blockNumber

# Sequencer Besu
rpc eth_blockNumber '[]' seq
```

Both nodes are on the same L2 chain. Each answers with the head it knows locally.

## The sequencer produces two candidates at one height

I searched the sequencer logs for block 23,851:

```bash
k -n lineth-l2 logs sequencer-0 --since=24h \
  | grep -E 'Produced #23,851'
```

The first entry is an empty candidate:

```text
2026-10-14 03:54:13.633+0000 | vert.x-worker-thread-0 | INFO  | EngineGetPayloadV5 | Produced #23,851  (25a36.....f011f)|    0 tx | 0 ws | 0 (0.0%) gas in 0.000s | Timing(started at 2026-10-13T16:10:08.189200759Z,empty-block-created=0ms, awaitingRetrieval=0ms) | PayloadId 0x7d24a0ce2f301ce6
```

The second is the same candidate again:

```text
2026-10-14 03:54:15.137+0000 | vert.x-worker-thread-0 | INFO  | EngineGetPayloadV5 | Produced #23,851  (25a36.....f011f)|    0 tx | 0 ws | 0 (0.0%) gas in 0.000s | Timing(started at 2026-10-13T16:10:08.189200759Z,empty-block-created=0ms, awaitingRetrieval=0ms) | PayloadId 0x7d24a0ce2f301ce6
```

Same height, same hash `25a36.....f011f`, same payload ID `0x7d24a0ce2f301ce6`, zero transactions. That's one candidate retrieved twice, not two blocks.

`Produced` is logged by `EngineGetPayloadV5`, which means Besu handed out an execution payload. On its own it says nothing about whether that payload became the head.

The empty candidate's `started at` points to the previous day. I haven't checked what that field means in Besu's code, so I leave it out of the timing below.

The third entry is a different candidate at the same height:

```text
2026-10-14 03:54:15.643+0000 | vert.x-worker-thread-0 | INFO  | EngineGetPayloadV5 | Produced #23,851  (adcdb.....8271a)|    1 tx | 0 ws | 59,437 (0.0%) gas in 0.501s | Timing(started at 2026-10-14T03:54:15.141719011Z, duplicateWorldState=0ms, preTxsSelection=0ms, txsSelection=2ms, selectedTxsEvaluation=2ms, blockAssembled=0ms, awaitingRetrieval=498ms) | PayloadId 0x7d24a0ce2f301ce7
```

| Field | Empty candidate | With a transaction |
|---|---|---|
| Height | 23,851 | 23,851 |
| Hash | `25a36.....f011f` | `adcdb.....8271a` |
| Transactions | 0 | 1 |
| Gas | 0 | 59,437 |
| Payload ID suffix | `…1ce6` | `…1ce7` |

Height is a position in the chain. Hash is the content of one block. Several candidates can compete for the same position.

### The 501ms is mostly waiting

The candidate with the transaction reports:

```text
txsSelection=2ms
selectedTxsEvaluation=2ms
awaitingRetrieval=498ms
```

Of the roughly 501ms, 498ms is the payload waiting to be retrieved. Calling it "501ms of execution" would be wrong. The fields cover different stages of preparing and retrieving the payload, and I wouldn't assume they add up cleanly.

## Maru rejects an empty proposal and keeps going

Height 23,736 shows what Maru does with an empty candidate:

```bash
k -n lineth-l2 logs pod/maru-0 -c maru --since=24h \
  | grep -E 'number=23736|Sequence=23736|elBlockNumber=23736'
```

It rejected it:

```text
2026-10-14 03:44:52.083+0000 | qbft-event-loop-c5675ab5 | INFO  | ProposalPayloadValidator | Invalid Proposal Payload: block did not pass validation. Reason Optional[BlockValidationError(message=Block is empty number=23736 executionPayloadBlockNumber=23736 hash=0x908c44f1c922644845a9438014cf1e147c0d2dd950ca9de0d170d65e247de511)]
```

The lab's Maru config doesn't allow empty blocks:

```toml
allow-empty-blocks = false
```

1.4 seconds later, Maru imported a different proposal at the same height:

```text
2026-10-14 03:44:53.514+0000 | qbft-event-loop-c5675ab5 | INFO  | QbftRound | Importing proposed block to chain. round=ConsensusRoundIdentifier{Sequence=23736, Round=1}, hash=0x2316e2c865edb01285a8b550deb2a60c63aaa3eeb52aebf253bcade7bdf52f48
```

And started building the next block:

```text
2026-10-14 03:44:53.514+0000 | qbft-event-loop-c5675ab5 | INFO  | BlockBuildingBeaconBlockImporter | importing block and starting build next block: elBlockNumber=23736 elBlockTimestamp=1791949493 elNextBlockTimestamp=1791949494 beaconBlockHeader=BeaconBlockHeader(number=23736, round=1, timestamp=1791949493, proposer=Validator(address=0x083e11f14b68d5ebeb4be3e3e0237ebbc5675ab5), parentRoot=0xcd4cd32009523c0ea0a4fb561b8b561d82406f5629777b4ff0b14625f3d25862, stateRoot=0x346d4980bb777e1a697f3371abd2b84e510b13976152c24409e2aef0160b5244, bodyRoot=0x179a56368e984429e4a7b12b529020b5f640fd79283991719843cd3ffa49f827)
```

In `Sequence=23736, Round=1`, `Sequence` is the height and `Round` is the consensus attempt at that height.

So an `Invalid Proposal Payload` line on its own doesn't mean the chain stopped. Check whether an import for the same sequence follows.

This is a different height from 23,851, so it shows how Maru handles proposals, not the consensus timeline of 23,851 itself. Maru's consensus block hashes and Besu's execution block hashes are also different identifiers. Don't expect them to match.

## RPC Besu imports the same payload

RPC Besu logged:

```text
2026-10-14 03:54:15.652+0000 | vert.x-worker-thread-0 | INFO  | EngineNewPayloadV4 | Imported #23,851  (adcdb.....8271a)|    1 tx|  0 ws|  0 blobs|      7 wei bfee|      59,437 (  0.0%) gas used| 5.0ms exec|  11.94 Mgas/s|  1 peers
```

Height, hash, transaction count, and gas all match the sequencer's second candidate. Then a fork-choice update:

```text
2026-10-14 03:54:15.655+0000 | vert.x-worker-thread-0 | INFO  | EngineForkchoiceUpdatedV3 | FCU(VALID) | head: adcdb.....8271a | safe: 782ea.....0a22e | finalized: 782ea.....0a22e
```

The head is the same hash, which ties the import to the head update.

`5.0ms exec` is RPC Besu's own processing time. It doesn't cover submission, time in the pools, or propagation.

### Timing across components

| Event | UTC |
|---|---|
| Sequencer hands out the payload | 03:54:15.643 |
| RPC Besu imports it | 03:54:15.652 |
| RPC Besu accepts it as head | 03:54:15.655 |

That's 9ms from payload to import and 12ms to head update. These numbers compare clocks on different components, so they assume the clocks agree. The gap also holds whatever Maru and RPC Besu did in between, so it isn't a network latency figure.

## The block query names the transaction

Block 23,851 is `0x5d2b` in hex:

```bash
rpc eth_getBlockByNumber '["0x5d2b",true]' seq \
  | jq '{
      number,
      hash,
      transactions: [
        .transactions[] |
        {hash, from, to, nonce, blockNumber}
      ]
    }'
```

```json
{
  "number": "0x5d2b",
  "hash": "0xadcdb669f1e059c935e73363a23a0de36db65d87dbd63fec914e8e1ca2c8271a",
  "transactions": [
    {
      "hash": "0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d",
      "from": "0xb3c150df38e91149e260c3233f3121810d4d2976",
      "to": "0xe537d669ca013d86ebef1d64e40fc74cadc91987",
      "nonce": "0x7c6",
      "blockNumber": "0x5d2b"
    }
  ]
}
```

The full hash matches `adcdb.....8271a` from both Besu logs. The one transaction went to the lab's L2MessageService contract. Which function it called would take decoding its input; the address alone doesn't say.

## The receipt

```bash
rpc eth_getTransactionReceipt \
  '["0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d"]' \
  | jq '{transactionHash, blockNumber, blockHash, status, gasUsed}'
```

```json
{
  "transactionHash": "0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d",
  "blockNumber": "0x5d2b",
  "blockHash": "0xadcdb669f1e059c935e73363a23a0de36db65d87dbd63fec914e8e1ca2c8271a",
  "status": "0x1",
  "gasUsed": "0xe82d"
}
```

| Field | What it shows |
|---|---|
| `blockNumber: 0x5d2b` | Included in block 23,851 |
| `blockHash: 0xadcdb…8271a` | Same block the sequencer produced and RPC Besu imported |
| `status: 0x1` | The transaction succeeded |
| `gasUsed: 0xe82d` | 59,437 gas, same as the block logs |

A valid block can still hold a failed transaction, so the import logs aren't enough. `status` is what says it succeeded.

## What the evidence covers

```text
Sequencer handed out payload adcdb…8271a
    ↓
RPC Besu imported the same payload
    ↓
RPC Besu accepted it as head
    ↓
Block query named the transaction
    ↓
Receipt showed status 0x1
```

That proves the transaction was included on L2 and executed successfully. It stops at L2: proof generation, settlement on L1, and L1 finality are separate stages with their own evidence. The [next post](/posts/lineth-l2-from-blocks-to-execution-proofs-trace-and-conflation/) starts down that path: how the Coordinator groups blocks into proof work.
