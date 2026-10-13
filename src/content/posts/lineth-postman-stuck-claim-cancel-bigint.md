---
title: "Lineth Postman: A Stuck Claim That Could Never Be Cancelled"
description: "Lineth's postman cancels a stuck claim transaction by bumping its stored fees by 10%. Postgres returned those fees as strings, so the bump threw \"Cannot mix BigInt and other types\" and the cancel never ran. One nonce gap held up every later claim. A two-line fix in the entity mapper."
pubDatetime: 2026-10-13T22:50:00+09:00
tags:
  - Contribution
  - Ethereum
  - Layer 2
  - PostgreSQL
---

I reported and fixed a bug in the postman of [Lineth](https://github.com/LFDT-Lineth/lineth-monorepo), an EVM layer 2 framework under LF Decentralized Trust. The report is [issue #4200](https://github.com/LFDT-Lineth/lineth-monorepo/issues/4200), and the fix is [PR #4201](https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201).

The postman's recovery path for a stuck claim transaction could never succeed. It failed on a type error, every time it ran.

## What the postman does

The postman relays messages between L1 and L2. It watches for a message being sent, waits until the message can be claimed on the other chain, and then sends the claim transaction itself. Messages and their claim transactions are tracked in Postgres.

A claim transaction can get stuck: it's accepted, then never mined. The postman handles that in two steps.

1. It resends the claim with higher fees, up to a configured number of retries.
2. If that's used up, `cancelAndResetMessage` replaces the stuck nonce with a cancel transaction (a zero-value transfer to itself), waits for it to be mined, and resets the message to `SENT` so it's claimed again with a fresh nonce.

The bug was in step 2.

## The error

I found it in my Lineth L2 lab, running postman v1.0.1. Claim transactions were dropped from the pool of the RPC node they were sent to, and once the retries ran out, this repeated at every polling interval:

```text
TypeError: Cannot mix BigInt and other types, use explicit conversions
    at ViemTransactionRetrier.cancelTransaction (.../ViemTransactionRetrier.js:56)
```

The code is the same on `main`.

## A cancel has to outbid the stuck transaction

To replace a pending transaction with the same nonce, the new one must pay at least 10% more. `cancelTransaction` takes the stuck transaction's fees and bumps them:

```ts
const MIN_REPLACEMENT_BUMP = 110n;
const stuckBumped = stuckFees
  ? {
      maxFeePerGas: (stuckFees.maxFeePerGas * MIN_REPLACEMENT_BUMP) / 100n,
      maxPriorityFeePerGas: (stuckFees.maxPriorityFeePerGas * MIN_REPLACEMENT_BUMP) / 100n,
    }
  : aggressive;
```

`110n` is a `bigint`. In JavaScript, `bigint` arithmetic with any other type throws instead of converting:

```js
"3819885" * 110n
// TypeError: Cannot mix BigInt and other types, use explicit conversions
```

So `stuckFees.maxFeePerGas` wasn't a `bigint`. It was a string.

## Where the string came from

`stuckFees` is built from the message as stored in the database. The entity declares both columns as `bigint`:

```ts
@Column({ nullable: true, type: "bigint" })
claimTxMaxFeePerGas?: bigint;

@Column({ nullable: true, type: "bigint" })
claimTxMaxPriorityFeePerGas?: bigint;
```

That type annotation is only a promise to the compiler. The `pg` driver returns Postgres `int8` columns as strings, because they can hold values larger than a JavaScript `number` can represent exactly. Nothing converts them on the way in.

The mapper from entity to domain `Message` already knew this. The sibling fields were wrapped:

```ts
fee: BigInt(entity.fee),
value: BigInt(entity.value),
messageNonce: BigInt(entity.messageNonce),
```

The two claim fee fields were passed through as they came:

```ts
claimTxMaxFeePerGas: entity.claimTxMaxFeePerGas,
claimTxMaxPriorityFeePerGas: entity.claimTxMaxPriorityFeePerGas,
```

The type said `bigint` and the value at runtime was `"3819885"`.

## Why the fee bump worked and the cancel didn't

Step 1, the fee bump, does the same kind of arithmetic and worked fine. The difference is where it gets the fees.

| Path | Where the stuck fees come from | Type at runtime |
|---|---|---|
| Fee bump retry | The transaction fetched from the chain through viem | `bigint` |
| Cancel and reset | The message row read from Postgres | `string` |

The bump path never touched the mapped fields, so it never hit the bug. Only the cancel path read them, and that path only runs after every retry has failed. That's likely how it went unnoticed: it only fails once something has already gone wrong.

The string also passed the guard in front of the call:

```ts
const stuckFees =
  message.claimTxMaxFeePerGas && message.claimTxMaxPriorityFeePerGas
    ? { maxFeePerGas: message.claimTxMaxFeePerGas, maxPriorityFeePerGas: message.claimTxMaxPriorityFeePerGas }
    : undefined;
```

A non-empty string is truthy, so the check let it through to the multiplication.

## One nonce gap stops every claim after it

A failed cancel doesn't just leave one message unclaimed.

The postman picks its next nonce as the larger of the account's pending nonce on chain and the highest `PENDING` nonce in its own database, plus one:

```ts
this.nextNonce = dbMaxNonce !== null ? Math.max(onChainNonce, dbMaxNonce + 1) : onChainNonce;
```

The stuck nonce stays recorded as pending, so every new claim gets a nonce above it. The chain won't mine any of them until the gap is filled, and the cancel transaction was the only thing that would fill it.

In the lab, 41 deposits from L1 to L2 went unclaimed, the longest for 1 hour 46 minutes, until the rows were reset by hand. The full incident, with the timeline and logs, is in the [postmortem](/posts/lineth-l2-postmortem-postman-bigint-nonce-gap/).

## The fix

The conversion belongs in the mapper, next to the fields that already get it. That way every consumer of the domain `Message` gets a `bigint`, not only the cancel path:

```ts
const toOptionalBigInt = (value: bigint | string | number | null | undefined): bigint | undefined =>
  value === null || value === undefined ? undefined : BigInt(value);
```

```ts
// bigint columns come back from the pg driver as strings; the domain (fee bumps, cancel) does bigint arithmetic
claimTxMaxFeePerGas: toOptionalBigInt(entity.claimTxMaxFeePerGas),
claimTxMaxPriorityFeePerGas: toOptionalBigInt(entity.claimTxMaxPriorityFeePerGas),
```

A message with no claim transaction yet has `NULL` in both columns. Those have to stay `undefined` rather than becoming `0n`, so the caller still falls back to market fees instead of bumping zero.

## Tests

Two tests in the mapper's test file:

```ts
it("converts claim tx fee strings from the pg driver to bigint", () => {
  const entity = generateMessageEntity();
  const message = mapMessageEntityToMessage({
    ...entity,
    claimTxMaxFeePerGas: "3819885" as unknown as bigint,
    claimTxMaxPriorityFeePerGas: "3819878" as unknown as bigint,
  });
  expect(message.claimTxMaxFeePerGas).toBe(3819885n);
  expect(message.claimTxMaxPriorityFeePerGas).toBe(3819878n);
  expect(((message.claimTxMaxFeePerGas as bigint) * 110n) / 100n).toBe(4201873n);
});

it("keeps missing claim tx fees undefined", () => {
  const entity = generateMessageEntity();
  const message = mapMessageEntityToMessage({
    ...entity,
    claimTxMaxFeePerGas: null as unknown as bigint,
    claimTxMaxPriorityFeePerGas: undefined,
  });
  expect(message.claimTxMaxFeePerGas).toBeUndefined();
  expect(message.claimTxMaxPriorityFeePerGas).toBeUndefined();
});
```

The first test feeds the mapper what the driver actually returns, a string, and runs the same 110% bump the cancel path does. The `as unknown as bigint` casts are the point of the test: the entity type says `bigint`, so the only way to reproduce the real input is to override the type.

Both tests fail without the change. With it, the postman's build, lint, and full test suite (46 suites, 439 tests) pass.

The existing end-to-end suite doesn't cover the stuck-transaction cancel path, so I couldn't add an E2E case there. I did run the fix in the same lab, postman v1.0.1 with only the mapper changed.

## Status

The PR passed the automated review and the DCO check, and is waiting for a maintainer review.

## What I took from it

A column type in an ORM entity describes what you want, not what the driver gives you. When the two disagree, TypeScript has no way of knowing, and the mismatch shows up wherever the value is first used for arithmetic.

The same data can also reach the code by more than one road. Here the fees came from the chain on one path and from the database on the other, and only one of them was wrong. A path that runs only after other things have failed deserves its own test, because ordinary operation will never exercise it.
