---
title: "Aperture #286: L402 Metrics Before and After"
description: "Adding per-outcome Prometheus counters to Lightning Labs' Aperture proxy for L402 minting and verification, and what changes for an operator watching the /metrics endpoint."
pubDatetime: 2026-09-23T14:00:00+09:00
tags:
  - Lightning Network
  - lnd
  - Aperture
  - Lightning Labs
  - L402
---

[Aperture](https://github.com/lightninglabs/aperture) is Lightning Labs' reverse proxy for L402, the HTTP 402 scheme that gates an API behind a Lightning payment: a client pays an invoice, gets back a macaroon and preimage, and presents both on later requests. Aperture already logs why a request was accepted or rejected. What it didn't have was a way to count those outcomes over time without parsing log lines. [Issue #286](https://github.com/lightninglabs/aperture/issues/286) asks for that: per-outcome Prometheus counters on the minting and verification paths, so an operator can see the failure mix on `/metrics` instead of grepping DEBUG logs.

This document compares how the same actions are recorded before and after those counters. It covers metrics only, logging enhancements, sensitive-value masking, and SIEM integration belong to a separate issue. Log examples remain here to explain the behavior surrounding the metrics changes.

The source comparison is between baseline `master` at `8ffa5609ef76202bfd3f2ce41c7f652a8e1af4d3` and the fork's `chore/install-codex-harness` branch at `78cacdd05c673312bfb80d4efcd96e015a9a12c7`. The implementation references are [auth/authenticator.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/auth/authenticator.go), [mint/mint.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/mint/mint.go), and [mint/metrics.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/mint/metrics.go).

Logs in Use cases 1-11 are illustrative examples based on the source, not captured output. Section 4 contains actual lab observations. DEBUG messages require that log level to be enabled. Angle brackets denote error details or redacted values.

Counters are exposed through `/metrics` independently of logs. `Δ +1` denotes the increase across an action; it is not literal Prometheus exposition syntax. A label that has never occurred may have no time series rather than a value of `0`. Each example covers only its stated verification or minting path.

## Summary of Changes

The main change is per-outcome counters. Existing logging remains, although preimage and signature error strings and error values change slightly. This table describes the actual diff between the two commits, not just the instrumentation-reverted lab control.

| Area | Before | After adding metrics | Meaning |
|---|---|---|---|
| Authentication order and acceptance rules | Header → identifier → preimage → secret → signature → caveats → invoice | Unchanged | No new authentication policy or rejection condition |
| Failure logging | DEBUG messages in `Accept` | Same locations and level | Metrics do not replace logs |
| Invalid preimage error | `invalid preimage <value> for <hash>` | `invalid preimage: <value> for <hash>` | Adds a colon and the identifiable `ErrInvalidPreimage` error |
| Signature error | Returns and logs the signature library error | `invalid signature: <original error>` | Adds a prefix and the identifiable `ErrInvalidSignature` error |
| Other failure logs | Header, secret, caveat, and invoice errors | Existing formats retained | Detailed causes were already available in logs |
| Success logging | No dedicated success log in `Accept` | None added | New counters record success counts |
| Minting metrics | No L402 per-outcome counter | `aperture_l402_mint_total{result=…}` | Counts successful issuance and failure stages |
| Verification metrics | No L402 per-reason counter | `aperture_l402_verify_total{reason=…}` | Counts failure causes and successful stages |
| Secret lookup errors | Returns the error unchanged | Classifies missing secrets versus other lookup errors, then returns the error | Separates `secret_not_found` from `secret_lookup_error` |
| Sensitive values | Preimage error strings include values | Still included | Log masking is not part of this change |
| Tests | Existing functional tests | Two additional metric test files | Checks per-outcome counter increments |

A few interpretation rules matter for reading these counters correctly. `macaroon_valid` and `accepted` both increase for one successful request, so summing them double-counts it. `invoice_unsettled` includes every error from the invoice status checker, not only an unsettled invoice. `bad_preimage` and `bad_signature` indicate failed checks, not proof of an attack. And the HTTP/regtest A/B evidence in Section 4 compares against a baseline that reverts the two instrumentation commits from the candidate branch, both variants also carry the same test-only timeout patch, so neither side is an unmodified branch build.

## 1. Before: Results Are Returned as Errors and Return Values

The baseline already validates authentication and logs rejection causes. What it lacks is dedicated L402 metrics that accumulate minting and verification outcomes by reason. Counting recurring causes requires collecting and classifying logs.

### Minting

`Mint.MintL402` creates a challenge, an identifier, a stored secret, a macaroon, and its caveats, in that order. It returns an error on failure or a macaroon and payment request on success.

The caller can determine success or failure, but there is no `aperture_l402_mint_total` to distinguish challenge creation failures from secret storage failures. An error return does not guarantee a corresponding log entry, that also depends on the caller.

### Verification

`auth.L402Authenticator.Accept` reads the macaroon and preimage from the header, then calls `Mint.VerifyL402`. The checks run in this order:

1. Decode the macaroon identifier.
2. Check that the preimage matches the payment hash.
3. Retrieve the secret associated with the identifier.
4. Verify the macaroon signature.
5. Check the service and expiry caveats.

A failed check returns an error and stops later checks. `Accept` logs `Deny: L402 validation failed: ...` and rejects the request.

After these checks pass, `Accept` separately checks that the invoice is settled. Errors at this stage produce `Deny: Invoice status mismatch: ...`. It returns `true` only after all checks pass.

### What Existing Records Reveal

| Event | Already observable | Requires additional analysis or instrumentation |
|---|---|---|
| Header error | Parsing error in DEBUG logs | Total occurrences of that cause |
| Token verification failure | Detailed error in DEBUG logs | Counts and trends by reason |
| Secret lookup failure | Missing-secret, timeout, or other error text | Consistent separation of missing data from storage failures |
| Invoice check failure | Separate denial log | Distinguishing token validation from final acceptance |
| Final authentication acceptance | A `true` return value | Dedicated success counter |
| Minting failure | Returned error and caller-side records | Counts by minting stage |

The change does not introduce error visibility from scratch. Its value is consistent counting through fixed labels, reducing reliance on error-string parsing.

## 2. After: Counters Increment Where Outcomes Are Determined

Instrumentation follows the existing processing order. Minting uses a `result` label; verification uses `reason`. Logs provide detailed context, while counters record how often each outcome occurs.

### Changed Files and Responsibilities

| File | Before | After adding metrics |
|---|---|---|
| `mint/metrics.go` | Absent | Two CounterVecs, outcome constants, and increment helpers |
| `MintL402` in `mint/mint.go` | Returns a result or error | Records the outcome before returning |
| `VerifyL402` in `mint/mint.go` | Returns an error or `nil` | Records a failure reason or `macaroon_valid` before returning |
| `Accept` in `auth/authenticator.go` | Returns acceptance after header, token, and invoice checks | Records header failures, invoice check failures, and final acceptance |
| `mint/metrics_test.go` | Absent | Tests counter increments for minting and verification outcomes |
| `auth/metrics_test.go` | Absent | Tests header failures, invoice check failures, and final acceptance |

The comparison branch also contains Codex harness files. The L402 behavior described here concerns the instrumentation files above.

### Minting Outcomes

| Outcome location | Added `result` | Meaning |
|---|---|---|
| `NewChallenge` error | `challenge_failed` | Payment request/challenge creation failed |
| Identifier generation error | `identifier_failed` | Could not generate an identifier |
| `NewSecret` error | `secret_failed` | Secret creation or storage failed |
| `macaroon.New` error | `macaroon_failed` | Macaroon construction failed |
| Caveat construction or append error | `caveat_failed` | Could not construct or attach token restrictions |
| Immediately before successful return | `ok` | Macaroon and payment request issued successfully |

The metric is `aperture_l402_mint_total{result="..."}`. Each ordinary function return increments one outcome counter.

`ok` means the minting function succeeded. Optional transaction recording can fail, log an error, and allow issuance to continue, so this counter does not guarantee that the transaction record was saved.

### Verification Outcomes

| Function and stage | Added `reason` | Meaning |
|---|---|---|
| `Accept`: header parsing fails | `malformed_header` | Could not read the macaroon/preimage |
| `VerifyL402`: identifier decoding fails | `malformed_macaroon` | Could not decode the identifier |
| `VerifyL402`: preimage mismatch | `bad_preimage` | Preimage hash differs from the token's payment hash |
| `VerifyL402`: secret absent | `secret_not_found` | Store returned `ErrSecretNotFound` |
| `VerifyL402`: other secret lookup error | `secret_lookup_error` | Lookup failed, for example due to timeout |
| `VerifyL402`: signature verification fails | `bad_signature` | Stored secret could not verify the signature |
| `VerifyL402`: caveat validation fails | `caveat_unsatisfied` | Service, expiry, or another checked restriction was not satisfied |
| `VerifyL402`: successful return | `macaroon_valid` | Token validation passed; invoice check is still pending |
| `Accept`: invoice check error | `invoice_unsettled` | Invoice status checker returned an error |
| `Accept`: final acceptance | `accepted` | Token and invoice checks passed |

The metric is `aperture_l402_verify_total{reason="..."}`. Processing stops at the failed check, so one request does not increment every failure counter.

`Accept` does not recount a failure recorded by `VerifyL402`. After successful token verification, `macaroon_valid` is followed by either `accepted` or `invoice_unsettled`. These are different stages of one request. A custom Minter implementation must record its own verification failure reasons.

### Changes to Errors and Logs

Secret lookup previously returned errors unchanged. The new code first classifies them with `errors.Is(err, ErrSecretNotFound)`, then returns them. Missing secrets and other lookup failures therefore have separate counters.

Preimage and signature failures gain identifiable errors, `ErrInvalidPreimage` and `ErrInvalidSignature`. Wrapping those errors also changes part of the logged text.

| Case | Before | After adding metrics |
|---|---|---|
| Preimage mismatch | `invalid preimage <value> for <hash>` | `invalid preimage: <value> for <hash>` |
| Signature failure | Signature library error | `invalid signature: <original error>` |
| Secret lookup failure | Store error | Same returned error plus a classified counter |
| Final acceptance | Returns `true` | Increments `accepted`, then returns `true` |

No success log or per-request structured log is added. Counters use `promauto.NewCounterVec` and `WithLabelValues(...).Inc()`. When metrics collection is enabled, these counts can be collected without enabling DEBUG logs.

### Interpretation Rules

Counters accumulate within a process and may reset on restart. To isolate one action, compare before/after values and account for concurrent requests. Current call sites use fixed label constants, but Go's string-based types do not prohibit arbitrary values, so future callers must continue to keep request input out of labels.

Neither counter includes user, token, preimage, or IP labels. They show counts by cause, not individual requests or attacker identities. Rejection rules and payment-check order remain unchanged: this improves aggregation and investigation, not replay prevention or blocking policy. Existing sensitive log values are a separate concern too, keeping secrets out of metric labels does not sanitize error strings.

## 3. Records for the Same Action

Each use case shows the baseline record, the record after adding metrics, and the operational or security benefit.

### Use case 1. Missing or Malformed L402 Authentication Header

A request enters the L402 authentication path, but its header cannot be parsed.

**Before**

```text
DEBUG Deny: <header parse error>
```

The parsing error is visible in logs, but there is no corresponding L402 counter.

**After adding metrics**

```text
Log:
DEBUG Deny: <header parse error>

Metric delta:
aperture_l402_verify_total{reason="malformed_header"}  Δ +1
```

**Benefit:** Consistent counts expose client formatting errors or increases in malformed requests. A legitimate first request seeking a payment challenge may also lack an authentication header; an increase is not inherently an attack.

### Use case 2. Undecodable Macaroon Identifier

The header parses successfully, but the macaroon identifier has an invalid internal format.

**Before**

```text
DEBUG Deny: L402 validation failed: <identifier decode error>
```

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: <identifier decode error>

Metric delta:
aperture_l402_verify_total{reason="malformed_macaroon"}  Δ +1
```

**Benefit:** Separates header formatting failures from token-internal failures, narrowing investigations into broken token generators, incompatible identifiers, or malformed input.

### Use case 3. Preimage Does Not Match the Macaroon

The submitted preimage does not hash to the payment hash bound to the macaroon.

**Before**

```text
DEBUG Deny: L402 validation failed: invalid preimage <redacted> for <redacted>
```

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: invalid preimage: <redacted> for <redacted>

Metric delta:
aperture_l402_verify_total{reason="bad_preimage"}  Δ +1
```

Verification stops here. Neither `macaroon_valid` nor `accepted` increases.

**Benefit:** Counts mismatched payment proofs separately. This helps investigate preimages from unrelated payments or incorrectly paired credentials. Reusing a valid macaroon with its correct preimage is not detected by this check.

Redaction above is applied in this document. The implementation does not automatically redact preimages or other values in the existing error string.

### Use case 4. Tampered Macaroon Signature

Identifier decoding, preimage validation, and secret lookup pass, but signature verification fails. This example changes only the signature, changing the identifier could trigger an earlier failure instead.

**Before**

```text
DEBUG Deny: L402 validation failed: <signature verification error>
```

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: invalid signature: <signature verification error>

Metric delta:
aperture_l402_verify_total{reason="bad_signature"}  Δ +1
```

**Benefit:** Separates signature failures from other authentication failures. Twenty requests failing at this stage add twenty to this counter, without requiring log-text searches. Causes may include tampering, incorrect signing keys, or mismatched stored secrets.

### Use case 5. No Secret Found for the Token

The secret store returns `ErrSecretNotFound`.

**Before**

```text
DEBUG Deny: L402 validation failed: secret not found
```

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: secret not found

Metric delta:
aperture_l402_verify_total{reason="secret_not_found"}  Δ +1
```

**Benefit:** Distinguishes missing secrets from lookup infrastructure failures. Unissued tokens, discarded tokens, and lost storage data are possible investigation paths; the counter alone does not establish forgery.

### Use case 6. Secret Lookup Times Out

The store returns an error such as `context deadline exceeded` before it can determine whether the secret exists.

**Before**

```text
DEBUG Deny: L402 validation failed: context deadline exceeded
```

The timeout cause is already visible in logs, but counting occurrences requires log analysis.

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: context deadline exceeded

Metric delta:
aperture_l402_verify_total{reason="secret_lookup_error"}  Δ +1
```

**Benefit:** Separately counts verification infrastructure failures that can affect legitimate users. Five hundred such errors suggest investigating storage connectivity, latency, or context cancellation rather than treating them as missing secrets.

### Use case 7. Expired Token or Token for Another Service

Cryptographic verification passes, but the token's expiry or service restriction does not.

**Before**

```text
DEBUG Deny: L402 validation failed: <caveat validation error>
```

**After adding metrics**

```text
Log:
DEBUG Deny: L402 validation failed: <caveat validation error>

Metric delta:
aperture_l402_verify_total{reason="caveat_unsatisfied"}  Δ +1
```

**Benefit:** Separates violations of token restrictions from signature failures. This helps investigate repeated expired-token submissions or use outside the intended service. Both share one label, so logs are still needed to distinguish them.

### Use case 8. Valid Token, Failed Invoice Settlement Check

The macaroon and its caveats are valid, but the invoice status checker returns an error.

**Before**

```text
DEBUG Deny: Invoice status mismatch: <invoice status check error>
```

**After adding metrics**

```text
Log:
DEBUG Deny: Invoice status mismatch: <invoice status check error>

Metric deltas:
aperture_l402_verify_total{reason="macaroon_valid"}    Δ +1
aperture_l402_verify_total{reason="invoice_unsettled"} Δ +1
accepted does not increase
```

**Benefit:** Identifies rejection at the invoice-check stage after token validation has passed. Successful token verification must not be mistaken for final acceptance.

The implementation records every error returned by the invoice checker as `invoice_unsettled`. That includes lookup errors, not just an unsettled invoice. The label alone does not establish payment status or an attack.

### Use case 9. Token and Invoice Checks Both Pass

Macaroon, preimage, caveat, and invoice settlement checks all succeed.

**Before**

```text
auth.Accept returns true
No dedicated success log or per-reason success counter in this function
```

**After adding metrics**

```text
auth.Accept returns true
No new success log

Metric deltas:
aperture_l402_verify_total{reason="macaroon_valid"}  Δ +1
aperture_l402_verify_total{reason="accepted"}        Δ +1
```

**Benefit:** `accepted` directly counts final authentication acceptance. The two counters represent stages of the same request and must not be summed as request volume. Authentication acceptance does not guarantee subsequent backend success.

### Use case 10. Challenge Creation or Secret Storage Fails During Minting

The mint cannot create a challenge or create/store a new secret.

**Before**

```text
MintL402 returns a challenge creation or secret creation/storage error
No dedicated log or per-result counter at these branches
The caller may log the error
```

**After adding metrics**

```text
Challenge creation failure:
aperture_l402_mint_total{result="challenge_failed"}  Δ +1

Secret creation/storage failure:
aperture_l402_mint_total{result="secret_failed"}     Δ +1

Existing error returns are preserved
```

**Benefit:** Shows which issuance stage failed, helping investigate the minting path before attributing the failure to the requester.

Other issuance outcomes follow the same pattern.

| Minting outcome | Before | Counter after adding metrics |
|---|---|---|
| Identifier generation failure | Returns an error | `aperture_l402_mint_total{result="identifier_failed"}` |
| Macaroon construction failure | Returns an error | `aperture_l402_mint_total{result="macaroon_failed"}` |
| Caveat construction/append failure | Returns an error | `aperture_l402_mint_total{result="caveat_failed"}` |
| Successful issuance | Returns macaroon and payment request | `aperture_l402_mint_total{result="ok"}` |

Issuance success does not mean that payment has completed or a request has been accepted.

### Use case 11. Successful Requests, Signature Failures, and Storage Errors Together

Assume one observation window contains 1,000 accepted authentications, 20 signature failures, and 500 secret lookup errors, with no other outcomes or counter resets.

**Before**

```text
Signature failure logs: 20
Secret lookup error logs: 500
Dedicated auth.Accept success logs: none
```

Understanding the failure mix requires classifying and counting log entries.

**After adding metrics**

```text
Existing failure logs remain

Metric deltas:
aperture_l402_verify_total{reason="macaroon_valid"}      Δ +1000
aperture_l402_verify_total{reason="accepted"}            Δ +1000
aperture_l402_verify_total{reason="bad_signature"}       Δ +20
aperture_l402_verify_total{reason="secret_lookup_error"} Δ +500
```

**Benefit:** Separately explains 1,000 acceptances, 20 signature failures, and 500 infrastructure errors. Signature failures point to token integrity; lookup errors point to storage availability. Signature failures do not count toward `macaroon_valid`.

There are 1,520 calls to `auth.Accept` in this example, but summing all reason deltas gives 2,520 because successful requests also pass the intermediate token-validation stage.

These counters do not identify users or tokens. Existing logs can provide more detail, but this change does not add request identifiers or guarantee request-level correlation.

## 4. Sample Lab Results

These results were collected locally. The baseline implementation is master-based. Both service-test variants include the same storage-fault injection code.

### Results for the Same Requests

| Action tested | Baseline records and behavior | After adding metrics | Benefit |
|---|---|---|---|
| Modify part of a credential's signature | Rejected (402); signature failure logged | Still rejected; log gains an error prefix and the signature-failure count increases by 1 | Counts recurring integrity failures without classifying logs |
| Inject a secret lookup timeout after payment | Rejected (402); timeout logged | Still rejected; secret-lookup-error count increases by 1 | Separates storage failures from signature failures |
| Reuse a valid credential | Successful access (200); no dedicated authentication-success log | Still successful; token-validation and authentication-acceptance counts each increase by 1 | Measures successful authentication volume |

The change is in recording, not rejection policy. Failure logs remain, while outcomes can now be counted by category. Two stage counters increasing for one successful request must not be counted as two requests.

### Validation Scope

Thirty local regtest payment scenarios, 30 mutated HTTP requests, and 1,164 separate Linux code-test measurements met their expected outcomes. No external payment network was tested. The last figure counts checked test executions across cases, invocation paths, and repetitions using mock storage and invoice responses, not payments or unique attack cases.

This is bounded input mutation and fault injection, not a complete security assessment. Logs remain necessary for detailed lookup errors, and valid credential reuse remains allowed by the existing policy.

### Inline Evidence: Source Basis, Observations, and Limitations

The following excerpts retain the key values from saved results. A denotes the baseline; B denotes the version after adding metrics. `protected_delta` and `protected_access_delta` count additional protected-API accesses; `payment_ledger_delta` counts additional payment records.

#### Source Basis

Linux code tests directly compare master `8ffa5609` with candidate `78cacdd`. Service-test variant A reverts the two instrumentation commits from the candidate, restoring the master-based authentication implementation.

```text
$ git rev-parse cb7d889^
8ffa5609ef76202bfd3f2ce41c7f652a8e1af4d3

$ git log --oneline 8ffa5609..78cacdd
78cacdd chore: install repository-local Codex harness
3e864d4 auth: report the L402 verify outcomes only Accept can see
cb7d889 mint: add per-reason Prometheus counters for L402 mint/verify
```

Both service-test variants add a test path that waits 250ms and returns a timeout, so they differ from an unmodified master build. Build-script excerpt:

```bash
if [[ "$variant" == a ]]; then
  git -C "$source" -c core.hooksPath=/dev/null revert --no-commit \
    3e864d40943b3d5bb1aef486ea17e22898bf128a \
    cb7d8891f05a2a697318a000c19b4246f7221a1a
fi
git -C "$source" apply --check "$root/experiments/aperture-286/timeout-seam.patch"
git -C "$source" apply "$root/experiments/aperture-286/timeout-seam.patch"
```

#### 1. Signature Tampering: Captured Logs and Measurements

```text
Baseline: [DBG] AUTH: Deny: L402 validation failed: signature mismatch after caveat verification
After adding metrics: [DBG] AUTH: Deny: L402 validation failed: invalid signature: signature mismatch after caveat verification

signature-byte-0:
A: status=402, protected_delta=0, metric_deltas={}
B: status=402, protected_delta=0, metric_deltas={"bad_signature":1}
```

#### 2. Secret Lookup Failure After Payment: Captured Logs and Measurements

```text
Baseline: 2026-09-23 07:27:19.490 [DBG] AUTH: Deny: L402 validation failed: context deadline exceeded
After adding metrics: 2026-09-23 07:27:29.981 [DBG] AUTH: Deny: L402 validation failed: context deadline exceeded

timeout-1-a/b:
Common to baseline and metrics-added versions: http_status=402, protected_access_delta=0, settled=true, payment_ledger_delta=1
After adding metrics: secret_lookup_error — before=null, after=1, observed_delta=1
```

The time series was absent before the request and appeared with value 1 afterward. Missing instrumentation in the baseline does not mean zero errors.

#### 3. Valid Credential Reuse: Measurements

```text
valid-reuse-1:
A: status=200, protected_delta=1, metric_deltas={}
B: status=200, protected_delta=1, metric_deltas={"accepted":1,"macaroon_valid":1}
```

Protected API access was measured separately. An authentication-acceptance counter alone does not guarantee successful API processing.

#### Totals and Limitations

```text
Local regtest payment scenarios: expected_runs=30, failed_runs=[], passed=true
Mutated HTTP requests: passed=30, total=30
Linux code tests: per variant measurements=582, exit_code=0, failures=[], passed=true
Paired measurement counts and case identities match: true
```

The excerpts come from these repository-local files:

```text
Baseline HTTP: .harness/ap286-rerun-JYVFLb/evidence/runs/paid-1-a/http-fuzz.json
HTTP after adding metrics: .harness/ap286-rerun-JYVFLb/evidence/runs/paid-1-b/http-fuzz.json
Regtest re-evaluation: .harness/ap286-rerun-uva22J/evidence/summary.json
Code tests: .harness/ap286-fuzz-new/summary.json
```

Code tests exercised authentication functions, not the full proxy. Identifier generation, macaroon construction, and final caveat-append failures were not injected.

The regtest driver encountered a script-parsing error after measurements completed. A separate report generator re-evaluated the 30 saved runs; the reported result is based on that re-evaluation.

## References

- [Aperture issue #286](https://github.com/lightninglabs/aperture/issues/286)
- [Aperture repository (Lightning Labs)](https://github.com/lightninglabs/aperture)
- [auth/authenticator.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/auth/authenticator.go)
- [mint/mint.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/mint/mint.go)
- [mint/metrics.go](https://github.com/s1ns3nz0/aperture/blob/78cacdd05c673312bfb80d4efcd96e015a9a12c7/mint/metrics.go)
