---
title: "x402: A skipHandler That Skipped the Payment Too"
description: "In x402's TypeScript, Python, and Go servers, a request whose hook returned skipHandler bypassed the before-handler settle. On upfront it returned 200 with no settlement; on escrow it broke capture. A PR that moves the skip after that settle, checked against real escrow programs on forked chains."
pubDatetime: 2026-10-07T21:00:00+09:00
tags:
  - Contribution
  - x402
  - Python
  - Go
---

This is my second PR to [x402](https://github.com/x402-foundation/x402), after [rejecting V1 payloads in the Python server](/posts/x402-python-reject-v1-payment-payload/). [PR #3718](https://github.com/x402-foundation/x402/pull/3718) touches all three SDKs: a request that a hook told to skip its resource handler also skipped part of its settlement.

## What skipHandler is supposed to do

x402 servers run lifecycle hooks around payment verification and settlement. The docs describe an `onAfterVerify` hook returning `skipHandler` as "settle without invoking the resource handler": the payment goes through, and the hook's own response goes back instead of the route's.

Settlement doesn't happen at one fixed point; it depends on the payment flow:

| Flow | Before the handler | After the handler |
|---|---|---|
| `upfront` | settle | return the stored receipt |
| `escrow` | settle (e.g. authorize, deposit) | settle again (e.g. capture, claim) |
| `authorization` | — | settle |

## Where the skip happened

In the TypeScript, Python, and Go HTTP servers, and in the TypeScript and Go MCP payment wrappers, the `skipHandler` check came before the before-handler settle. In TypeScript:

```ts
// Bypass the resource handler
if (verifyResult.skipHandler) {
  return await this.processSkipHandlerSettlement(...);   // after-handler settle only
}

let beforeHandlerSettlement: CompletedSettlement | undefined;
if (phases.settleBeforeHandler) {
  ...                                                    // never reached on skip
}
```

The skip path ran only the after-handler settle. That's fine for `authorization`, which has nothing before the handler, and wrong for the two flows that do.

**`upfront`.** Its only real settle is the before-handler one. The after-handler step returns success without contacting the facilitator when there's nothing to do after the handler. So the client got `200` and the skip body, with no settlement and no `PAYMENT-RESPONSE` header. The only trace was a log line: "Skipping after-handler settle".

**`escrow`.** The after-handler settle ran without the before-handler one it depends on. I checked this with auth-capture against the real `AuthCaptureEscrow` contract on an anvil fork of Base Sepolia:

- with `captureMode: "sync"`, the after-handler `capture` was rejected with `unexpected_payment_state`, so the route always returned `402`;
- with `captureMode: "deferred"`, the funds were held and the skip body went out with `200`, but no authorized-payment record was stored. `createLifecycleManager().capture()` then threw `no authorized payment`, and after the capture deadline the payer reclaimed the full amount.

Reaching any of this takes two hooks: an `onBeforeVerify` that returns `skip`, because flows without verify-before-handler only run after-verify hooks after a before-verify skip, and an `onAfterVerify` that returns `skipHandler`. No built-in scheme produces that combination, which is likely why it went unnoticed.

## The fix

Handle `skipHandler` after the before-handler settle, and hand that settlement to the after-handler settle:

```ts
let beforeHandlerSettlement: CompletedSettlement | undefined;
if (phases.settleBeforeHandler) {
  ...
}

// Bypass the resource handler. Settle as a normal request would, after the
// before-handler settle, so flows like upfront and escrow are not skipped.
if (verifyResult.skipHandler) {
  return await this.processSkipHandlerSettlement(
    ...,
    verifyResult.skipHandler,
    beforeHandlerSettlement,
  );
}
```

A skipped request now settles the way a normal one does, only without calling the handler:

- `upfront` settles before the handler, and the after-handler step returns the stored receipt;
- `escrow` settles before the handler, then the after-handler settle runs with that settlement available;
- `authorization` has no before-handler settle, so nothing changes.

The same change went into Python's shared request generator (its async and sync servers now pass `before_handler_settlement` to `process_settlement`) and Go's `ProcessHTTPRequest` and MCP wrapper. Python's MCP server has no `skipHandler` path. Go's net/http, gin, and echo middlewares already passed `BeforeHandlerSettlement` along on the skip path, so the fix there only needed `ProcessHTTPRequest`.

Failure handling follows normal requests too. A failed before-handler settle returns the usual settlement-failure response and the skip body isn't sent. A failed after-handler settle isn't cancelled or voided, which is how normal requests behave: their cancellation only runs when the handler throws or returns an error status.

Two things change for skipped requests on these flows, and the PR lists both: `onBeforeSettle` / `onAfterSettle` hooks now also see a `before-handler` settle, and `PAYMENT-RESPONSE` carries the after-handler result, as for a normal request.

## Checking it on forked chains

With the fix, the auth-capture runs matched requests that weren't skipped. Sync escrow settled `authorize` then `capture`, and the merchant was paid. Deferred escrow stored the record, so the merchant could capture it later.

SVM `upto` also uses `escrow`, so I ran it against the real payment-channels program on a Surfpool fork of Solana devnet, with a ceiling of 1000 atoms:

| Request | `main` | With the fix |
|---|---|---|
| Skipped | 402: the claim fails because no channel was opened; nothing moves | 200: deposit, then claim of 1000, the full ceiling |
| Handler sets a 30% override | deposit, claim 300 | same |
| Handler sets no override | deposit, claim 1000 | same |

A skipped `upto` request now charges what a normal request with no override charges, which is the full ceiling. If a skip should charge something else, such as nothing for a refund-style skip, that's a decision for the scheme, not this fix. The PR says so rather than guessing.

## Tests

The new tests register both hooks and record each settle phase through an `onBeforeSettle` hook:

- `upfront` settles once, in `before-handler`, and returns `200` with `PAYMENT-RESPONSE`;
- `escrow` settles in `before-handler`, then in `after-handler`, and returns the skip body;
- a failed `upfront` settle returns `402` without the skip body;
- Python also covers its sync server.

I ran each new test against `main`'s source first, and all of them failed there. With the fix:

| SDK | Result |
|---|---|
| TypeScript | `@x402/core` 750 passed, `@x402/mcp` 144 passed, eslint, `tsc --noEmit` |
| Python | `uv run pytest` 2380 passed, `ruff check`, `ruff format --check` |
| Go | `go test ./...`, `go vet ./...`, `make lint` with 0 issues |

Each SDK got its own changelog entry: a Changesets file, a Towncrier fragment, and a Changie fragment.

The PR notes that most of the change and its tests were written with an AI coding assistant, and that I reviewed and ran all of it. The forked-chain runs were the part that settled whether the fix was right.

## What I took from it

The bug was in the order of two blocks, not in either one. "Skip the handler" was placed as if it meant "skip the rest of the request", when the flows that settle before the handler needed that step to happen first.

And unit tests with mocked facilitators show which settle phases ran, but not what that does to money. Running the flows against the actual escrow contract and payment-channel program showed it: a deferred capture that could never be collected, and a payer who got everything back after the deadline.
