---
title: "Aperture L402 Security Event Monitoring Proposal"
description: "A proposal to replace Aperture's DEBUG-only L402 logs with structured, HMAC-referenced security events, with real before/after captures for each failure type."
pubDatetime: 2026-09-24T15:00:00+09:00
tags:
  - Lightning Network
  - lnd
  - Aperture
  - Lightning Labs
  - L402
---

L402 ties authentication and payment into one flow, which means several different kinds of security signal are mixed together, and an operator can't afford to miss any of them.

- **Authentication success/denial and the reason:** was this a clear rejection: forged signature, violated caveat, expired token?
- **Payment proof mismatch:** the submitted preimage doesn't match the required payment hash. This can mean someone stole a credential and is trying to reuse it.
- **Invoice settlement status:** did the payment actually go through, or did the settlement check itself fail? Fail to distinguish these and you'll mistake "someone trying to get in without paying" for "our invoice DB is down."
- **Challenge issuance:** when new access attempts arrive, and which service they're hitting.
- **Internal processing failure:** a storage or invoice lookup failure that prevented any decision from being made. Count this as a security denial and false positives pile up.

Monitoring these signals ultimately means pulling the entire L402 authentication flow out as events and feeding them into a SIEM. Right now, seeing this information in Aperture requires turning on DEBUG logging, and that approach has a problem.

To address it, this document proposes the following security event collection design: three event types, `l402.authorization`, `l402.settlement`, and `l402.challenge`, always written as structured JSON regardless of DEBUG level, carrying only an HMAC reference computed with a dedicated key in place of the raw credential.

## 1. The existing approach: what actually happens when DEBUG is on

Path: Aperture process (DEBUG level) → stdout/file log → log collector → central log store → SIEM index → a security analyst searches and reads it.

Aperture has no security-event feature today, so this test wired a DEBUG logger directly into the existing `auth/authenticator.go` and ran the real macaroon signing/verification code through three failure paths to capture actual output. The secret and invoice strings are test values; everything else is the same code path as production.

### Captured DEBUG output

```
[DBG]: Created new challenge header: [LSAT macaroon="AgEEbHNhdAJCAABaGhVg8mgiNd8DgdnmEgyjbM8kNyCQOOHNSUNkDmMHPM34a5tOKCl8qziz81n4hUA6wHYLsrqvYNSDTIrmJ6CUAAIdc2VydmljZXM9Y29uZmlndXJlZC1zZXJ2aWNlOjAAAAYgj12kh+Tinu+lT0HiNyqyvZvqwMBvgFXwAWYHiZCkEvc=", invoice="lnbc100n1p_demo_invoice_canary_xyz"]
[DBG]: Deny: L402 validation failed: invalid preimage: 7161796d656e742d707265696d6167652d64656d6f2d30313233343536373839 for 5a1a1560f2682235df0381d9e6120ca36ccf2437209038e1cd4943640e63073c
[DBG]: Deny: Invoice status mismatch: invoice not found: canary-lookup-failure
```

First line: the full macaroon (signature included, base64) and the invoice string are logged as-is. Copy that string into an Authorization header and authentication succeeds, so whoever can read this log can bypass authentication.

Second line: the preimage the client actually submitted (hex) and the payment hash used to verify it (hex) both stay in the log. A preimage is itself proof of payment, so exposing it means it can be replayed.

Third line: this one's plaintext exposure is weaker, but it's a free-form string, and this single line alone can't tell you whether this is an unpaid fraud attempt or our invoice DB going down.

## 2. The fix: what gets stored once security events are on

Path: Aperture process (security-event emitter, independent of DEBUG level) → separate stdout JSON stream → collector → SIEM → analyst query.

The raw macaroon, invoice, and preimage never exist in the first place, the `Event` struct has no field for them. Instead, it stores only an HMAC reference computed over the token ID and payment hash with a dedicated key. The actual computation:

```go
ref := func(domain string, value []byte) string {
	m := hmac.New(sha256.New, e.key[:])
	_, _ = m.Write([]byte("aperture/security/v1/" + domain + "\x00"))
	_, _ = m.Write(value)
	return "hmac:" + hex.EncodeToString(m.Sum(nil))
}
return ref("credential", id[34:66]), ref("payment", id[2:34])
```

The same three failure types were reproduced and captured on the code with security-event collection added, compared below by type. Before and after come from separate runs, so the macaroon and key values themselves differ, but that's fine for showing the structural difference that matters: whether the raw value is present or not.

## 3. Actual before/after by security event type

### 3.1 `l402.challenge`: new challenge issued

before (DEBUG, plaintext):
```
[DBG]: Created new challenge header: [L402 macaroon="AgEEbHNhdAJCAABaGhVg8mgiNd8DgdnmEgyjbM8kNyCQOOHNSUNkDmMHPM34a5tOKCl8qziz81n4hUA6wHYLsrqvYNSDTIrmJ6CUAAIdc2VydmljZXM9Y29uZmlndXJlZC1zZXJ2aWNlOjAAAAYgj12kh+Tinu+lT0HiNyqyvZvqwMBvgFXwAWYHiZCkEvc=", invoice="lnbc100n1p_demo_invoice_canary_xyz"]
```

after (security event, HMAC, real capture):
```json
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.265035511Z","level":"INFO","category":"security","event":"l402.challenge","request_id":"WOSBKJT3C3GK5ISXZU2T3WIXVK","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"issued","reason":"challenge_issued","credential_ref":"hmac:08633dbda3aaa0deddfed22ccf54d4b368f3cd12af7d3f4a0c0de9c9b01c989c","payment_ref":"hmac:ddf3a1ba30c0751a16021dc93b47dc6ea93d785254edcb8c480235e64551160f","credential_verified":true,"key_id":"rotation-v1"}
```

The `macaroon` and `invoice` fields don't exist at all. `credential_ref` is a 64-character HMAC-SHA256 hex string, and it can't be reversed to the original token ID without the emitter's dedicated key. An analyst can still trace which token family a challenge was issued for and when, but nothing in this log lets them turn that token into a passed authentication.

### 3.2 `l402.authorization`: denied on a bad preimage

before:
```
[DBG]: Deny: L402 validation failed: invalid preimage: 7161796d656e742d707265696d6167652d64656d6f2d30313233343536373839 for 5a1a1560f2682235df0381d9e6120ca36ccf2437209038e1cd4943640e63073c
```

after (same failure type, real capture):
```json
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.264878677Z","level":"INFO","category":"security","event":"l402.authorization","request_id":"WOSBKJT3C3GK5ISXZU2T3WIXVK","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"denied","reason":"payment_proof_mismatch","credential_ref":"hmac:b009547924e4eee39cc29803ded28ec85d9331cde914d7363f81204faf1e0aaa","payment_ref":"hmac:ddf3a1ba30c0751a16021dc93b47dc6ea93d785254edcb8c480235e64551160f","credential_verified":false,"key_id":"rotation-v1"}
```

Neither the submitted preimage nor the payment hash it was checked against appears in plaintext. The fixed code `reason:"payment_proof_mismatch"` already states the denial reason, so there's no reason for an analyst to need the raw values.

### 3.3 `l402.settlement` / `l402.authorization`: invoice lookup failure

before:
```
[DBG]: Deny: Invoice status mismatch: invoice not found: canary-lookup-failure
```

after (real capture, five lines tied together by the same request_id):
```json
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.267213386Z","level":"INFO","category":"security","event":"l402.settlement","request_id":"PQVO2DMA33SGOQKFI67SBJUNU6","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"error","reason":"invoice_check_error","credential_ref":"hmac:cbf5afcb440d4ab476f21cc4c225455e5484e03da7560f876696a1a8e952aec2","payment_ref":"hmac:ddf3a1ba30c0751a16021dc93b47dc6ea93d785254edcb8c480235e64551160f","credential_verified":true,"key_id":"rotation-v1"}
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.267213386Z","level":"ERROR","category":"operational","event":"l402.settlement","request_id":"PQVO2DMA33SGOQKFI67SBJUNU6","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"error","reason":"invoice_check_error","credential_verified":false}
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.267278219Z","level":"INFO","category":"security","event":"l402.authorization","request_id":"PQVO2DMA33SGOQKFI67SBJUNU6","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"indeterminate","reason":"invoice_check_error","credential_ref":"hmac:cbf5afcb440d4ab476f21cc4c225455e5484e03da7560f876696a1a8e952aec2","payment_ref":"hmac:ddf3a1ba30c0751a16021dc93b47dc6ea93d785254edcb8c480235e64551160f","credential_verified":true,"key_id":"rotation-v1"}
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.267278219Z","level":"ERROR","category":"operational","event":"l402.authorization","request_id":"PQVO2DMA33SGOQKFI67SBJUNU6","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"error","reason":"invoice_check_error","credential_verified":false}
{"schema_version":1,"timestamp":"2026-09-24T07:39:07.267404511Z","level":"INFO","category":"security","event":"l402.challenge","request_id":"PQVO2DMA33SGOQKFI67SBJUNU6","service":"configured-service","method":"GET","source_ip":"192.0.2.44","outcome":"issued","reason":"challenge_issued","credential_ref":"hmac:5f53f584acdb4260ddbd8862925607c1fbd086c9778f5696a9d512230da15906","payment_ref":"hmac:ddf3a1ba30c0751a16021dc93b47dc6ea93d785254edcb8c480235e64551160f","credential_verified":true,"key_id":"rotation-v1"}
```

The combination of `reason:"invoice_check_error"` and `outcome:"indeterminate"` states explicitly that this was an internal failure, not a determined decision. A single SIEM rule can split "actually denied" from "our infrastructure failed" without any text parsing. The two `category:"operational"` lines carry no credential reference at all, because they're a signal about infrastructure state, not about a token.

## 4. Summary

| Type | Before, what lands in the SIEM | After, what lands in the SIEM |
|---|---|---|
| Challenge issued | Full macaroon (signature included) + raw invoice | Two HMAC references |
| Preimage mismatch | Submitted preimage (hex) + payment hash (hex) | HMAC reference + fixed reason code |
| Invoice lookup failure | Free-form error string, denied/indeterminate indistinguishable | HMAC reference + `indeterminate`/`invoice_check_error` + a separate operational record |

The moment DEBUG is turned on, all of this raw material gets copied through the log collector into central storage, backups, and the search index. Security events, regardless of DEBUG level, only ever produce HMAC references. Since the raw value never exists in the storage path to begin with, this removes a problem before storage that a masking rule or tighter access control added later couldn't fix.

## 5. Remaining limitations

- The HMAC reference is a pseudonymized correlation identifier, not encryption or an integrity signature over the whole log.
- The existing DEBUG log path itself hasn't been removed. Collecting only the new security events avoids exposing raw values, but if someone still leaves DEBUG on and ships that log through a different pipeline, the raw values keep leaking through that path.
- The event queue caps at 256 entries, and events can be lost on queue overflow, write failure, or a flush that expires at shutdown. Environments that need a lossless audit trail need a separate design.
- Key distribution, storage, and rotation; log access control, retention, and deletion policy; and SIEM alert rules are all out of scope for this proposal and remain the operator's responsibility.

## 6. How to reproduce

Before (plaintext DEBUG) capture: wired a `btclog` DEBUG handler into the existing Aperture `auth` package, then ran challenge issuance and two denial paths directly through the real `mint.New`/`auth.NewL402Authenticator` and captured the log buffer. Reproducible locally, no Docker or real LND required.

After (HMAC security event) capture: ran `TestLocalCapture` in the `proxy` package with security-event collection added, with `CAPTURE_DIR` set. The same six scenarios (`missing`, `accepted`, `preimage`, `store`, `invoice`, `challenge`) run through the real macaroon verification code, and the emitter's actual JSON bytes are saved as-is.

Neither capture was deployed to a live service, and neither includes real Lightning payment verification.
