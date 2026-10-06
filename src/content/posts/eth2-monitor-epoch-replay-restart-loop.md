---
title: "eth2-monitor: An Epoch Replay That Never Finishes"
description: "In stakefish/eth2-monitor, --replay-epoch ran under the same supervisor as live monitoring, so a finished replay was restarted as if it had crashed. A PR that tells completion apart from interruption."
pubDatetime: 2026-10-06T11:30:00+09:00
tags:
  - Contribution
  - Ethereum
  - Validator
  - Prometheus
---

In [`stakefish/eth2-monitor`](https://github.com/stakefish/eth2-monitor), a monitoring tool for Ethereum validators, I found that replaying past epochs never finishes: once the analysis is done, the same work starts again. I submitted [PR #33](https://github.com/stakefish/eth2-monitor/pull/33) to fix it.

This is the second issue I've reported in the project, after [release binaries that overwrite each other](/posts/eth2-monitor-release-binaries-overwrite/).

## What eth2-monitor does

`eth2-monitor` doesn't run a validator. It watches validators and checks whether they performed the duties assigned to them: attestations and block proposals.

It takes the public keys of the validators to watch, reads chain data from a Beacon Node API, and compares each validator's scheduled duties with what actually landed on chain. The results go out as logs, Slack alerts, and Prometheus metrics.

Normally it runs continuously, following the chain head. With `--replay-epoch`, it can instead analyse specific past epochs again.

## A finished job treated as a crash

The program wraps its monitoring work in a supervisor: if the work stops unexpectedly, the supervisor starts it again. That's what keeps live monitoring running through a dropped connection or a failed goroutine.

Replay went through the same supervisor, under the same rule:

```text
analyse the requested epochs
        ↓
the work returns
        ↓
the supervisor sees it stopped and restarts it
        ↓
the same epochs are analysed again, and again
```

`RunMonitorPair` runs two goroutines, one that emits epochs and one that analyses them. When both returned, it returned `nil`. Nothing in that result said whether the work had finished or been cut short, and the supervisor restarted anything that returned while the parent context was still live.

So the program couldn't tell a replay that completed normally from live monitoring that stopped when it shouldn't have.

## The fix

The PR adds a completion signal, `ErrReplayComplete`. It's returned only when all three of these hold:

- every requested epoch was emitted;
- the analysing goroutine drained the epoch channel and processed them all;
- the parent context was not cancelled.

When the supervisor gets `ErrReplayComplete`, it stops instead of restarting. Live monitoring, and a replay that was interrupted part-way, keep the existing restart path.

Finishing the replay doesn't end the process. The CLI keeps serving `/metrics`, so Prometheus can still scrape the replay's results, and exits on SIGINT or SIGTERM. `--since-epoch` behaves as before; changing it was out of scope.

## Testing without a validator

To test it without a Beacon node or a validator, I used a local fixture server that serves captured Beacon API responses.

Before the fix, the real CLI processed the requested epoch, logged a restart, and processed the same epoch again. After the fix:

- the replay runs once;
- `/metrics` still serves the results afterwards;
- SIGTERM ends the process with exit code 0;
- a replay cancelled mid-way, or one that hits its deadline, is not reported as complete.

The PR adds regression tests for replay completion, interrupted replay, the supervisor's handling of the new signal, and waiting for shutdown. The full test suite, `go vet`, and the build passed on macOS and Linux, and race checks passed for the CLI and monitoring packages.

What this verifies is the replay's lifecycle. It doesn't verify real attestation or proposal tracking for a live validator, or whether duplicate alerts could reach operators in production.

## The point

The fix comes down to telling "the work stopped" apart from "the work finished". A restart loop built to recover from failures also needs to know when a finite job is done, or it will treat every success as one more failure.
