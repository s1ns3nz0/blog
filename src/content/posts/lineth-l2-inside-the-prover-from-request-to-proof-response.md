---
title: "Lineth L2 Transaction Lifecycle (3) - Inside the Prover: From a Coordinator Request to a Proof Response"
description: "What happens between the Coordinator writing a proof request and reading the result. I followed L2 blocks 26,605 to 26,684 through shared-storage request files, the prover controller, trace reading, module utilization, and the execution, compression, and aggregation responses in my Lineth lab."
pubDatetime: 2026-10-14T18:10:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

*Part of the [Lineth L2 Transaction Lifecycle](/tags/lineth-l2-lifecycle/) series. The component map is in [part 0](/posts/lineth-l2-lab-architecture/).*

The [previous post](/posts/lineth-l2-from-blocks-to-execution-proofs-trace-and-conflation/) watched a proof from the Coordinator's side: a request written, a result picked up 3 minutes 24 seconds later. This one looks at what happens in between, inside the Prover.

The range is L2 blocks 26,605 through 26,684, separate from the earlier ranges. I connect the Coordinator's request, the Prover's trace processing, the response files, and the Coordinator's completion records.

All timestamps are UTC.

## The test environment

The lab runs the PARTIAL execution prover, and dev proof paths for compression and aggregation. The logs say so:

```text
Running the PARTIAL prover
[Aggregation] generating proof (mode: dev)
generated dummy-circuit proof
```

The run still reads traces, builds circuits, computes, and checks consistency. The timings below are for this local setup, not production proving.

## Coordinator and Prover talk through files

The Coordinator and Prover exchange requests and responses through shared storage. Both pods mount the same `l2-shared` PVC at `/data`:

```text
Coordinator Pod                         Prover Pod
       │                                     │
       └──────── Shared storage: /data ───────┘
                        l2-shared
```

A job goes like this:

```text
Coordinator writes a request JSON
    ↓
Prover controller picks it up
    ↓
Controller runs `prover prove`
    ↓
Prover writes a temporary response
    ↓
Controller moves it to the final response name
    ↓
Coordinator finds and reads the response
```

The Coordinator writes the request into its request directory and polls the expected response path until a file shows up. There's no RPC call from Coordinator to Prover. The execution trace is read from the same storage.

### What files buy you

- A long job can finish whenever it finishes, with no HTTP request held open.
- Large traces stay on shared storage instead of riding inside each request.
- Request, in-progress, and response files show the state of every job on disk.
- The controller handles scheduling and file lifecycle, separate from the proving process.

The cost is a dependency on shared storage being up, on naming conventions, on polling, and on handling failures. Files alone don't give automatic recovery or exactly-once processing.

Only proving jobs go through files. L1 transactions go over RPC, and the [Web3Signer](/posts/lineth-l2-web3signer-signing-https-and-l1-sender-verification/) connection is HTTPS.

## The Coordinator's request

```bash
k -n lineth-l2 logs deploy/coordinator -c coordinator --since=2h \
  | grep -E '26605|26684' \
  | grep -E 'new batch:|new blob:|execution proof request generated:|execution proof generated:|blob compression proof generated:|aggregation proof generated:|submitted aggregation='
```

Trimmed to the relevant fields:

```text
2026-10-14 07:52:09.451+0000
ProofGeneratingConflationHandlerImpl
new batch: batch=[26605..26684]80 trigger=TRACES_LIMIT

2026-10-14 07:52:09.451+0000
GlobalBlockConflationCalculator
new blob: blob=[26605..26684]80 trigger=BATCHES_LIMIT
blobSizeBytes=5472 blobBatchesCount=1 blobBatchesLimit=1
blobBatchesList=[[26605..26684]80]1

2026-10-14 07:52:09.868+0000
ProofGeneratingConflationHandlerImpl
execution proof request generated:
proofIndex=ExecutionProofIndex(
  startBlockNumber=26605,
  endBlockNumber=26684,
  startBlockTimestamp=2026-10-14T07:45:29Z
)
```

80 blocks again (26684 - 26605 + 1), closed on `TRACES_LIMIT`, one batch per blob. Same pattern as the previous post. `startBlockTimestamp` is the first block's time, not when the Prover started.

## The request file

The Prover logs a lot of circuit output, so I filtered it down to job lifecycle lines:

```bash
k -n lineth-l2 logs pod/prover-6dcb464df7-m8fvm -c prover \
  --since=1h --timestamps \
  | grep -viE 'constraint system solver done|compiling circuit|parsed circuit inputs|using small native field|building constraint builder|module utilization|\[prover runtime\]|\[bootstrapper\]' \
  | tail -100
```

At 07:52:10.701Z, 0.8 seconds after the request, the controller logged the command it was about to run:

```bash
prover prove \
  --config /opt/linea/prover/config.toml \
  --in /data/prover/v3/execution/requests/26605-26684-getZkProof.json.inprogress.prover-i1 \
  --out /data/prover/v3/execution/responses/tmp-response-file.prover-i1.json
```

The input file is named for the range, `26605-26684-getZkProof.json`. The controller renamed it with `.inprogress.prover-i1` to claim it, and the output goes to a temporary file.

| Component | What it does |
|---|---|
| Prover controller | Picks a request, runs the command, handles the result, manages files |
| `prover prove` | Reads the input and does the proving |

The command runs inside the Prover pod. The Coordinator never runs it.

## Reading the conflated trace

```text
2026-10-14T07:52:10.790070425Z
Conflation stats - totalTxs: 103, totalGasUsed: 2933304

2026-10-14T07:52:11.074802633Z
Running the PARTIAL prover
```

At 07:52:24.979Z it started reading the compressed trace:

```text
Streaming decompression of traceFile:
"/data/traces/v2/conflated/26605-26684.conflated.linea-0f74f55.26.7.0-6580da8.lt.gz"
```

The request JSON and the trace are separate files, both named for the range. The trace holds the execution data; the Prover reads it and fills in the tables and variables its checks run over.

```text
Skip constraints compatibility check between zkevm.bin and trace file
```

The check between the constraint file and the trace was skipped in this setup, not passed.

## Module utilization

During the execution job, the Prover logged:

```text
module=blockdata height=1134 limit=4096 ratio=0.27685546875
module=blockhash height=2022 limit=2048 ratio=0.9873046875
module=hub height=18992 limit=131072 ratio=0.1448974609375
```

| Field | Meaning |
|---|---|
| `module` | The trace module |
| `height` | Rows it used |
| `limit` | Rows it's allowed |
| `ratio` | `height / limit` |

`blockhash` is at 2022 / 2048, 98.7% full. That's trace capacity, not CPU. It's the module closest to its limit of the three, which fits a batch that closed on `TRACES_LIMIT`. The batch record still doesn't name the module, and the utilization line carries no request ID, only a timestamp inside the execution job.

The Coordinator's batch record for this range had `BLOCK_HASH=1440`. That's the Coordinator's counter, and 2022 is the Prover's module height. They're different measurements and don't convert into each other.

## Inside the computation

Assignment stages:

```text
[bootstrapper] column assignment: 209.650792ms
[bootstrapper] total Arithmetization.Assign: 4.425581752s
[bootstrapper] module assigns total: 2.752168043s
```

Arithmetization turns the execution data into the mathematical form the proof system works with. Assignment fills those structures with values from this workload.

```text
[prover runtime] done running prover step.
name=high-level-prover, time=7.20169442s
```

Circuit lines:

```text
compiling circuit
parsed circuit inputs nbPublic=2688 nbSecret=0
building constraint builder nbConstraints=191256
constraint system solver done nbConstraints=6998907
```

| Term | Meaning |
|---|---|
| Circuit | A set of mathematical checks |
| Constraint | One condition in that set |
| Witness | The values assigned to the circuit's variables |
| Public input | An input the verifier sees |
| Solver | Computes assignments that satisfy the circuit |

`nbConstraints` isn't a block or transaction count. `nbSecret=0` describes the inputs of that one circuit, not the whole proving process.

These are individual steps. One finishing doesn't mean the job is done, and their timing windows can overlap, so they don't add up to the job time.

## The execution response

Near the end:

```text
2026-10-14T07:55:17.463065428Z
Public input consistency check passed
```

Then:

```text
Creating the witness
Generating the proof
Sanity-checking the proof
generated dummy-circuit proof
```

At 07:55:18.177Z the controller reported:

```text
The processing of file `26605-26684-getZkProof.json`
took 187.475051086 seconds and returned exit code 0
```

And published the response:

```text
Moving tmp response file
/data/prover/v3/execution/responses/tmp-response-file.prover-i1.json
to final response file:
/data/prover/v3/execution/responses/26605-26684-getZkProof.json
```

Writing to a temporary file and renaming it means the Coordinator never sees a half-written response. The final name is what it's polling for.

The controller then deleted the trace file and moved the request into `execution/requests-done` with a success prefix:

```text
Process exits 0
    ↓
Response published under its final name
    ↓
Request moved to requests-done, trace deleted
```

96ms after the response was published, the Coordinator logged:

```text
2026-10-14 07:55:18.273+0000
ProofGeneratingConflationHandlerImpl
execution proof generated:
batch=Batch(startBlockNumber=26605, endBlockNumber=26684)
```

## Compression and aggregation

The same range went through two more job types:

| Job | Request file ends in |
|---|---|
| Execution | `getZkProof.json` |
| Compression | `getZkBlobCompressionProof.json` |
| Aggregation | `getZkAggregatedProof.json` |

Each has its own request and response directories under `/data/prover/v3`.

### Compression

The command was logged at 07:55:18.229Z, with this input:

```text
compression/requests/
26605-26684-bcv0.0-ccv0.0-2d8184e1e6ca4ccc781a67201b58885a7390ca6a3433a1cb95791f7c36ed4b92-getZkBlobCompressionProof.json.inprogress.prover-i1
```

```text
took 0.083499042 seconds and returned exit code 0
```

Response published at 07:55:18.312Z. The Coordinator:

```text
2026-10-14 07:55:18.331+0000
BlobCompressionProofCoordinator
blob compression proof generated: blob=[26605..26684]80
```

### Aggregation

The command was logged at 07:55:25.330Z:

```text
[Aggregation] generating proof (mode: dev)
```

```text
took 0.0422045 seconds and returned exit code 0
```

Response published at 07:55:25.372Z. The Coordinator:

```text
2026-10-14 07:55:25.382+0000
ProofAggregationCoordinatorService
aggregation proof generated: aggregation=[26605..26684]80
```

In this run, execution finished first, then compression, then aggregation. That's the order here, not a scheduling rule.

## How aggregations chain

The aggregation input included:

```text
LastFinalizedBlockNumber: 26604
FinalBlockNumber: 26684

ParentAggregationFinalShnarf:
0x09d3f6b940b3aa3ca02a025fdb00cab2d872a44e6bbba405499505b65306da58

FinalShnarf:
0x2d8184e1e6ca4ccc781a67201b58885a7390ca6a3433a1cb95791f7c36ed4b92
```

The block numbers mark the edge before this range and its last block. The previous aggregation, 26525..26604, had `0x09d3…6da58` as its `FinalShnarf`. The same value is this one's `ParentAggregationFinalShnarf`, so each aggregation points back at the one before it.

The `FinalShnarf` here also appears in the compression request filename above, `…2d8184e1e6ca…-getZkBlobCompressionProof.json`.

These are inputs to the aggregation job, not the L1 contract's finalized state.

## Prover time against Coordinator time

What the Prover reported:

| Job | Duration |
|---|---:|
| Execution | 187.475 s |
| Compression | 0.0835 s |
| Aggregation | 0.0422 s |

Compression and aggregation run in dev mode, which is why they're near zero.

From the Coordinator's side, execution took:

```text
07:55:18.273 - 07:52:09.868 = 188.405 s
```

About 0.9 seconds more than the Prover's number. The Coordinator's window also covers the wait before the controller picked the request up (0.8 s from the request to the command line) and the wait before the Coordinator noticed the response (96 ms). The two measurements start and stop at different points.

| UTC | Component | Event |
|---|---|---|
| 07:52:09.451 | Coordinator | Batch and blob created |
| 07:52:09.868 | Coordinator | Execution request written |
| 07:52:10.701 | Prover | Execution command logged |
| 07:55:18.177 | Prover | Execution done, response published |
| 07:55:18.273 | Coordinator | Execution completion recorded |
| 07:55:18.312 | Prover | Compression done, response published |
| 07:55:18.331 | Coordinator | Compression completion recorded |
| 07:55:25.372 | Prover | Aggregation done, response published |
| 07:55:25.382 | Coordinator | Aggregation completion recorded |
| 07:55:27.743 | Coordinator | Aggregation submitted to L1 |

## Back to L1

```text
2026-10-14 07:55:27.743+0000
AggregationSubmitterImpl
submitted aggregation=[26605..26684]80
transactionHash=0x6168dde06f3ab8a8bd4737ec32cb7c5e45e6f4f613c35ac6c82fd1128c75cba2
nonce=314 gasPriceCaps=null
```

The Coordinator reads the proof response and builds the contract call from it. The response file itself never goes to L1.

The [next post](/posts/lineth-l2-following-a-blob-from-creation-to-finalization-on-l1/) follows a range from here to L1: blob publication, then the aggregation transaction landing on the rollup contract, which emits `DataFinalizedV3` for the range.
