---
title: "x402: A V1 Payment Header That Crashed the Python Server"
description: "In the x402 Python SDK, the V2-only HTTP resource server passed a decoded V1 payment payload on to requirement matching, which read a field V1 doesn't have and returned 500. A PR that rejects V1 payloads before matching, so the client gets a 402."
pubDatetime: 2026-10-07T16:00:00+09:00
tags:
  - Contribution
  - Python
  - x402
---

[x402](https://github.com/x402-foundation/x402) is a protocol for paying for HTTP resources: a server answers `402 Payment Required` with what it accepts, and the client retries with a signed payment in a header. In its Python SDK, a payment header in the old V1 format made the HTTP resource server fail with a `500` instead of answering `402`. I fixed it in [PR #3715](https://github.com/x402-foundation/x402/pull/3715).

## V2-only, on paper

The resource server reads the payment from the `PAYMENT-SIGNATURE` header in `_extract_payment`, whose docstring says "V2 only". Its return type said otherwise:

```python
def _extract_payment(self, adapter: HTTPAdapter) -> PaymentPayload | PaymentPayloadV1 | None:
    """Extract payment from HTTP headers (V2 only)."""
    ...
    try:
        return decode_payment_signature_header(header)
    except Exception:
        return None
```

The decoder picks a model from the payload's `x402Version`:

```python
version = data.get("x402Version", 2)
if version == 1:
    return PaymentPayloadV1.model_validate(data)
return PaymentPayload.model_validate(data)
```

So a well-formed V1 header decoded without error and came back as a `PaymentPayloadV1`. `_extract_payment` passed it straight on.

## Where it broke

The next step, `find_matching_requirements`, matches the payment against what the route accepts using the payload's `accepted` field. That field exists only in V2. A V1 payload has no `accepted`, so the lookup raised `AttributeError`, and the middleware turned the unhandled exception into a `500`.

```text
PAYMENT-SIGNATURE: base64({"x402Version": 1, ...})
→ decode_payment_signature_header   → PaymentPayloadV1   (no error)
→ _extract_payment                  → returned as is
→ find_matching_requirements        → payload.accepted   → AttributeError
→ 500 Internal Server Error
```

For a client, a `500` says the server is broken. What actually happened is that it sent a payment format this server doesn't take, and the protocol has a response for that: `402`, with the requirements the client should pay against instead.

## The fix

`_extract_payment` now treats a V1 payload the same way it treats a header it can't decode: as no usable payment.

```python
def _extract_payment(self, adapter: HTTPAdapter) -> PaymentPayload | None:
    """Extract payment from HTTP headers (V2 only)."""
    ...
    try:
        payload = decode_payment_signature_header(header)
    except Exception:
        return None
    # V2 server only accepts V2 payments. A V1 payload has no `accepted`
    # field and would fail requirement matching.
    if isinstance(payload, PaymentPayloadV1):
        return None
    return payload
```

The return type drops `PaymentPayloadV1`, so the signature now says what the docstring already did. With no payment, the request takes the ordinary path and gets a `402` with the current payment requirements. The PR also adds a Towncrier changelog fragment, as the repository requires for user-facing changes.

## How the Go SDK handles it

The Go SDK's `extractPaymentV2` already checks the version before going further:

```go
// V2 server only accepts V2 payments
if version != 2 {
    return nil, fmt.Errorf("only V2 payments supported, got V%d", version)
}
```

So Go never lets a V1 payload reach requirement matching, and that's the behaviour the Python fix brings over. The status code differs, though: Go turns that error into a `400` with `invalid_payload`, while the Python fix answers `402`, the same as for a header that can't be decoded. The PR description says the fix matches the Go SDK; that's true for rejecting V1 before matching, not for the exact response.

## The test

The test sends a real base64 header through `process_http_request` instead of calling `_extract_payment` directly:

```python
@pytest.mark.parametrize("version", [1, True])
async def test_v1_payload_returns_402(self, protected_routes, version):
    ...
    header = base64.b64encode(
        json.dumps(
            {"x402Version": version, "scheme": "exact", "network": "eip155:8453", "payload": {}}
        ).encode()
    ).decode()
    ...
    result = await http_server.process_http_request(context)

    assert result.type == "payment-error"
    assert result.response.status == 402
    server.find_matching_requirements.assert_not_called()
```

Two details are worth pointing out.

The last line checks that requirement matching is never reached. A `402` alone could come from some other path; `assert_not_called()` pins it to the rejection in `_extract_payment`.

`version` runs with both `1` and `True`. The decoder's check is `version == 1`, and in Python `True == 1`, so a header with `"x402Version": true` is also decoded as V1. Before the fix it crashed the same way. The test makes sure that spelling is rejected too.

## What I took from it

The docstring said V2-only, but nothing in the code enforced it, and the type annotation even admitted V1 could come through. The crash happened one step later, in code that reasonably assumed what the docstring promised. A boundary like "this server takes V2" belongs where the input comes in, not in a comment.

And the Go SDK already had the check. When one implementation of a protocol has a guard that another lacks, that gap is worth looking for on purpose.
