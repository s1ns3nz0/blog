---
title: "Lineth L2 Transaction Lifecycle (0) - The Lab Architecture"
description: "A map of the local Lineth rollup before the series opens it up: RPC Besu, the sequencer and Maru for execution, the Coordinator and Prover for proving, Web3Signer for signing, the rollup contract for settlement, and the postman for message delivery, with the evidence each one leaves."
pubDatetime: 2026-10-14T13:49:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

This series follows a local rollup deployment through its logs, transactions, receipts, and contract events. Before any of that, this post lays out the components and where one stops and the next begins: execution, proving, signing, settlement, and message delivery.

The lab itself, and how it's deployed and monitored, is in the [homelab post](/posts/lineth-l2-homelab-kubernetes-architecture-and-monitoring/).

![Lineth lab architecture: an application sends JSON-RPC to L2 RPC Besu, which passes transactions over P2P to Sequencer Besu, which talks to Maru over the Engine API. L2 blocks flow to the Coordinator, which writes requests to shared storage (l2-shared at /data) where the Prover picks up jobs and traces. The Coordinator signs through Web3Signer over mTLS and submits transactions to the L1 node (Besu and Teku), which publishes blobs and finalizes on the rollup contract. The postman picks up MessageSent from L2 RPC Besu and sends claims to the L1 node.](../../assets/images/lineth-series/architecture.png)

The diagram is a logical map. It shows the paths this series follows, not every deployment dependency or network connection. Message anchoring has its own signing path and isn't covered here.

## Execution: RPC Besu, the sequencer, and Maru

The L2 RPC node is the one users talk to. It accepts transactions and answers queries for blocks, transactions, and receipts.

The RPC node and the sequencer are separate Besu processes, each with its own transaction pool. Transactions travel between them over P2P, and the sequencer builds the execution payload candidates. Maru runs QBFT consensus and talks to the execution clients through the Engine API.

```text
Application
    ↓ JSON-RPC
L2 RPC Besu
    ↓ P2P transaction propagation
Sequencer Besu
    ↕ Engine API
Maru
```

Each component leaves a different kind of evidence:

| Record | What it shows |
|---|---|
| Sequencer `Produced` | A payload candidate was handed out |
| Maru proposal and import lines | Consensus handled a proposed block |
| Besu `Imported` | An execution payload was imported |
| Besu `FCU(VALID)` | The fork-choice update was accepted |
| Transaction receipt | The transaction was included, and whether it succeeded |

A produced candidate isn't automatically the block that gets adopted, so the series matches block numbers and execution hashes across records. Maru also drives imports into the follower execution client; that link is left off the diagram to keep the main paths readable.

[Part 1](/posts/lineth-l2-following-a-transaction-through-besu-and-maru/) follows one transaction through these records.

## Proof orchestration: the Coordinator and tracing

The Coordinator follows L2 block progress and turns blocks into proof work. It closes batches when a conflation condition is met, gets the execution traces, writes proof requests, and records results.

Tracing is drawn inside the Coordinator box. It stands for the tracing function and its pipeline, not a claim that tracing runs in the Coordinator's pod.

```text
L2 blocks
    ↓
Coordinator
    ↓ trace generation
Conflated execution trace
    ↓
Prover workload
```

Three units come up again and again:

| Unit | Purpose |
|---|---|
| Batch | Consecutive blocks proved together as one execution proof |
| Blob | Compressed block data for publication on L1 |
| Aggregation | A proof that combines the others into one |

In this lab their ranges often line up, but they do different jobs. [Part 2](/posts/lineth-l2-from-blocks-to-execution-proofs-trace-and-conflation/) covers how a batch closes.

## Proving: shared storage and the Prover

The Coordinator and Prover don't call each other. They exchange files on the `l2-shared` volume, which both mount at `/data`:

```text
Coordinator writes a request JSON
    ↓
Shared storage
    ↓
Prover controller picks up the job
    ↓
`prover prove` reads the request and the trace
    ↓
Response written to shared storage
    ↓
Coordinator reads the result
```

Each job type has its own directory:

```text
/data/prover/v3/execution/
/data/prover/v3/compression/
/data/prover/v3/aggregation/
```

The execution traces are on the same storage. The lab runs the PARTIAL execution prover and dev paths that produce dummy-circuit proofs, so the timings in this series describe a local setup, not production proving.

[Part 3](/posts/lineth-l2-inside-the-prover-from-request-to-proof-response/) goes inside the Prover.

## Settlement: blob publication and finalization

The Coordinator sends transactions to the L1 node, which runs them against the rollup contract. Two outcomes are tracked separately:

| Operation | Outcome |
|---|---|
| Blob publication | Compressed L2 data goes on L1 in a blob transaction |
| Finalization | The contract moves its finalized L2 state forward |

A submission log gives a transaction hash. The receipt says whether it succeeded. The contract event says what it did and for which L2 range; for finalization that's `DataFinalizedV3`. A published blob on its own doesn't mean the range is finalized.

[Part 4](/posts/lineth-l2-following-a-blob-from-creation-to-finalization-on-l1/) follows one range from blob to finalization.

## Signing: the Coordinator and Web3Signer

Before it submits, the Coordinator asks Web3Signer to sign:

```text
Coordinator builds the transaction
    ↓ HTTPS / mTLS
Web3Signer signs with the selected key
    ↓ signature
Coordinator sends it through L1 RPC
```

The configured public key picks the signing identity; nothing is encrypted with it. HTTPS protects the connection, and mutual TLS authenticates both sides with certificates from mounted Kubernetes Secrets. Blob and aggregation submissions use the same endpoint with different keys, and the addresses derived from those keys are the senders on the L1 receipts.

[Part 5](/posts/lineth-l2-web3signer-signing-https-and-l1-sender-verification/) checks those keys against the receipts.

## Message delivery: the postman and the claim

The postman watches for cross-chain messages and delivers them. For an L2 to L1 message:

```text
L2 transaction emits MessageSent
    ↓
Postman stores the message
    ↓
Claim transaction on L1
    ↓
MessageClaimed
```

The source and destination transactions have different hashes. The message hash is what ties them together. A claim processes one message, including the call to the recipient and any ETH it carries, and it's separate from finalizing the block range that contains the message.

[Part 6](/posts/lineth-l2-following-a-message-to-a-successful-claim-on-l1/) follows the transaction from part 1 to its claim.

## Reading the series

| Part | Boundary | Main evidence |
|---|---|---|
| 1 | L2 execution and inclusion | Sequencer, Maru and Besu logs; receipts |
| 2 | Conflation and proof requests | Coordinator ranges, counters, completion records |
| 3 | Prover processing | Request files, trace processing, response files |
| 4 | Blob publication and finalization | Submission logs, L1 transactions, receipts, events |
| 5 | Web3Signer | Signing config, TLS setup, sender addresses |
| 6 | Message claim | Matching `MessageSent` and `MessageClaimed` hashes |

Parts 1 and 6 follow the same transaction. Parts 2 to 5 use other block ranges. Together they cover the whole architecture, one boundary at a time.
