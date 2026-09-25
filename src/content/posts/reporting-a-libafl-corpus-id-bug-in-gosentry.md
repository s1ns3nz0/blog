---
title: "Reporting a Silent Fuzzer Death in Trail of Bits' gosentry"
description: "A gosentry/LibAFL bug where the fuzzer could crash and stop making progress while go test -fuzz still reported success, plus the fix."
pubDatetime: 2026-09-25T10:00:00+09:00
tags:
  - Contribution
  - Fuzzing
  - Gosentry
---

[gosentry](https://github.com/trailofbits/gosentry) is Trail of Bits' security-oriented Go toolchain, built around a LibAFL-based fuzzing backend. I ran into a bug where the fuzzer could die mid-campaign without `go test` ever noticing, and reported it as [issue #210](https://github.com/trailofbits/gosentry/issues/210).

## What happened

I fuzzed a small, pure-Go function, no I/O, no goroutines, no cgo, just JSON canonicalization over about 37 seed inputs:

```console
go test ./mpp -run FuzzCanonicalizeJSON -fuzz=FuzzCanonicalizeJSON \
  -fuzztime=90s --focus-on-new-code=false \
  -catch-races=true -catch-leaks=true
```

Between 43 and 68 executions in, the LibAFL process panicked:

```text
thread 'main' panicked at src/main.rs:3482:13:
Failed to run launcher: Unknown("The testcase is not associated with an id", <disabled>)
```

Execution count froze, `exec/sec` decayed toward zero, and the campaign sat there doing nothing until `-fuzztime` ran out. Then `go test` printed `ok`. I reproduced this twice on macOS/arm64 and once on Linux/x86_64, so it wasn't a one-off flake tied to one machine.

## Root cause

`golibafl` enables LibAFL's `corpus_btreemap` feature. At the `gosentry-libafl-gitaware` commit gosentry was pinned to, the BTreeMap corpus's `insert_inner` and `insert_inner_with_id` paths inserted a testcase without setting its `corpus_id`. `CachedOnDiskCorpus` needs that ID to lazily load the testcase input later, and errors out when it's missing.

gosentry already had an `EnsureTestcaseIdsScheduler` to patch this up on the ordinary scheduler `on_add` path, but it didn't cover every insertion path, so testcases could still end up without an ID. Upstream LibAFL had already fixed both insertion paths in [PR #3779](https://github.com/AFLplusplus/LibAFL/pull/3779); gosentry's fork just hadn't picked it up yet.

## The fix

[Kevin Valerio](https://github.com/kevin-valerio) merged [PR #212](https://github.com/trailofbits/gosentry/pull/212) the same day: bump the LibAFL fork to the commit with the corpus fix, update `golibafl/Cargo.lock`, and add a regression test (`golibafl/tests/corpus_ids.rs`) covering both ordinary and explicit-ID insertion into a BTreeMap corpus.

## Why this one mattered

The bug itself was a small missing field in an upstream dependency. What made it worth reporting is the failure mode: the fuzzer stopped fuzzing, and the tooling around it reported success anyway. A CI job running this exact command would sit green while doing nothing for the rest of its `-fuzztime` budget. I flagged that as a separate follow-up in the issue, propagating the launcher failure so `go test` exits non-zero when the fuzz engine terminates unexpectedly, since a fuzzing setup that fails silently is worse than one that fails loudly.

## References

- [gosentry issue #210](https://github.com/trailofbits/gosentry/issues/210)
- [gosentry PR #212 (fix)](https://github.com/trailofbits/gosentry/pull/212)
- [LibAFL PR #3779 (upstream fix)](https://github.com/AFLplusplus/LibAFL/pull/3779)
