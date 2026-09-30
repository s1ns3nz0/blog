---
title: "Lightning Payments for OpenCTI (2) - From a Scan Order to a Lightning Invoice"
description: How our OpenCTI and ASM service turns a scan order into a Lightning invoice, from the server-side quote to Aperture's dynamic price lookup and the L402 challenge.
pubDatetime: 2026-09-30T16:15:00+09:00
tags:
  - Lightning Network
  - Lightning Labs
  - lnd
  - L402
  - Aperture
  - Blockchain
---

*Part 2 of the series. [Part 1](/posts/adding-lightning-payments-to-opencti-with-aperture/) covered Aperture as a payment gate.*

Connecting Aperture to our service gives us a payment gate. The next step is to connect that gate to a specific order and its price.

Our service combines OpenCTI threat intelligence with ASM scanning. Authenticated users can request scans, while paid options provide additional verification or deeper analysis.

This walkthrough follows how the application prepares a Lightning payment for a scan order. The examples illustrate the request flow rather than a captured transaction.

## 1. The application creates a quote

Before requesting payment, the application determines what the customer is buying and how much it costs.

The customer requests a quote through:

```http
POST /api/v1/quotes
```

The server looks up its configured price using the product package, profile version, and payment method. It stores the result in a quote snapshot: a record of the agreed details at that point.

```text
Customer selects a scan scope and payment method
        ↓
Server looks up the configured price
        ↓
Server saves a quote
```

The customer does not supply the price. The request accepts the scan scope, payment method, and optional consent information. Unexpected fields are rejected.

This separates choosing a product from deciding its price. The customer selects what to buy; the server determines the amount.

## 2. The customer creates an order

The customer creates an order using the saved quote:

```http
POST /api/v1/orders
Idempotency-Key: <unique-request-key>
Content-Type: application/json

{
  "quote_id": "<quote-id>"
}
```

The order starts in the `awaiting_payment` state.

The `Idempotency-Key` helps the application recognize repeated requests. For example, a client might retry because the server created the order but its response never reached the client.

Creating an order does not create a Lightning invoice. At this point, the application has recorded what the customer intends to purchase. Payment instructions come next.

## 3. The customer requests payment instructions

To pay with Lightning, the customer calls:

```http
POST /api/v1/orders/<order-id>/payment/l402
```

The request is authenticated with the workspace credential. Initially, it contains no L402 payment proof.

Before contacting the payment infrastructure, the application creates a payment challenge record in the `issuing` state. This means payment instructions are being prepared.

It also constructs an internal request path that identifies the payment context:

```python
if rail == "l402":
    resource_path = f"/paid/l402/{who.tenant_id}/{order_id}/{snapshot['scope_hash']}/{challenge_id}"
    initial_requirements = {"resource_path": resource_path}
```

Each component has a specific purpose:

| Component | Meaning |
|---|---|
| `tenant_id` | Which tenant owns the request |
| `order_id` | Which order is being paid |
| `scope_hash` | Which saved scan scope the request refers to |
| `challenge_id` | Which payment challenge is being issued |

Including these identifiers does not itself prove authorization. The application validates that the tenant, order, scope, and challenge belong together.

## 4. The request reaches Aperture

The application sends the request through an internal payment gateway:

```text
OpenCTI API
    ↓
Internal payment gateway :8090
    ↓
Aperture :8081
```

Aperture matches the request against its configured service:

```yaml
services:
  - name: "opencti-paid-l402"
    pathregexp: '^/paid/l402/.*$'

    dynamicprice:
      enabled: true
      grpcaddress: "payment-aperture-services:10010"
      insecure: true
```

This configuration tells Aperture to ask the pricing service for the cost of requests whose paths start with `/paid/l402/`.

The request identifies the order. It does not tell Aperture to trust a customer-selected amount.

Here, `insecure: true` applies to the internal gRPC connection to the pricing service. It does not disable L402 authentication.

## 5. Aperture asks for the order’s price

The pricing service receives the request path and looks up its payment context through OpenCTI’s private endpoint:

```text
/internal/payments/l402/challenge-lookup
```

OpenCTI validates the challenge and returns the amount stored in the quote.

The pricing service then returns that amount to Aperture:

```go
result, err := s.lookup(ctx, in.GetPath(), "issue", workspace)
if err != nil {
    return nil, status.Error(
        codes.FailedPrecondition,
        "challenge lookup rejected",
    )
}

return &pricesrpc.GetPriceResponse{
    PriceSats: result.AmountSats,
}, nil
```

The exchange can be understood as a short conversation:

```text
Aperture:
    “How much does this request cost?”
        ↓
Pricing service:
    “I will look up its challenge and order.”
        ↓
OpenCTI:
    “Here is the amount saved in the quote.”
        ↓
Pricing service:
    “Return that amount to Aperture as PriceSats.”
```

Dynamic pricing here means retrieving the saved price for each order. It does not mean calculating a new market price whenever the customer retries.

If the lookup is rejected, the pricing service returns an error. Aperture cannot proceed with that price lookup as though it succeeded.

## 6. The customer receives an invoice and token

Aperture uses its configured merchant LND connection to obtain a Lightning invoice and returns an L402 challenge.

The response has this general shape:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: L402 macaroon="<issued-token>", invoice="<lightning-invoice>"
```

The two values serve different purposes:

| Value | Purpose |
|---|---|
| `invoice` | The payment request the customer’s Lightning wallet will pay |
| `macaroon` | The authorization token submitted later with the payment proof |

Our adapter extracts the invoice and macaroon. The application stores the issuance result, changes the challenge state to `issued`, and returns the payment instructions to the customer.

HTTP 402 is an expected response at this stage. It tells the client that payment is required before proceeding.

A client that supports this flow can present the invoice to a wallet, complete the payment, and retry with the required credentials.

## What has happened so far?

```text
Configured product price
        ↓
Saved quote
        ↓
Order created: awaiting_payment
        ↓
Payment challenge created: issuing
        ↓
Aperture requests the saved order price
        ↓
Invoice and macaroon returned
        ↓
Payment challenge updated: issued
```

At this point, an invoice exists, but the order is still unpaid. Issuing payment instructions is different from receiving payment.

The next part follows the customer’s payment: obtaining the preimage, retrying with L402 credentials, verifying settlement, and marking the order as paid.
