---
title: "web3-utils: An RPC Retry That web3 7 Quietly Broke"
description: "In stakefish/web3-utils.py, RPC timeout retries checked for ValueError, but web3 7 raises Web3RPCError. Reproducing it by mocking at the provider, then a review that showed the fix would also retry transaction submission, and the allowlist that followed."
pubDatetime: 2026-10-06T15:00:00+09:00
modDatetime: 2026-10-06T19:30:00+09:00
tags:
  - Contribution
  - Python
  - Ethereum
---

I reproduced and fixed an RPC timeout retry bug in [`stakefish/web3-utils.py`](https://github.com/stakefish/web3-utils.py), in [PR #52](https://github.com/stakefish/web3-utils.py/pull/52). The existing test passed, yet the retry never handled the exception web3 actually raises.

The cause was a change in exception types between web3 versions. Along the way I learned how much a test's trustworthiness depends on where the mock goes.

## web3 changed the exception

In web3 6.x, a JSON-RPC error response surfaced as a `ValueError`. From 7.0.0 it surfaces as `Web3RPCError`, which is not a subclass of `ValueError`.

| web3 version | Exception for an RPC error response | `isinstance(e, ValueError)` |
|---|---|---|
| 6.x | `ValueError` | `True` |
| 7.0.0 and later | `Web3RPCError` | `False` |

The repository requires `web3>=7`, but its timeout retry condition still checked the old type:

```python
def is_timeout_value_error(e) -> bool:
    return isinstance(e, ValueError) and "request failed or timed out" in str(e)
```

Even with the timeout message in the error, the first condition was false, so nothing was retried.

The type changed in 7.0.0; the version I reproduced the bug with was web3 8.0.0. Those are two different facts, and the post keeps them apart.

## HTTP 200, and the request still failed

The node response used to reproduce it:

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "error": {
    "code": -32603,
    "message": "request failed or timed out"
  }
}
```

The HTTP status is `200`, but the body carries `"error"`. The HTTP request itself succeeded; it's web3, decoding the body afterwards, that raises `Web3RPCError`.

The retry wrapper has to look at that exception and decide whether to call again. With the old condition accepting only `ValueError`, it gave up after the first attempt.

## Why the existing test passed

The existing test mocked the function web3 uses to build its RPC call, and had it throw a hand-made `ValueError`:

```python
mocker.patch(
    "web3.module.retrieve_blocking_method_call_fn",
    return_value=trigger_fake_error(
        error_to_raise=ValueError(rpc_timeout_error),
    ),
)
```

That skips the step where web3 decodes the response and creates the exception. In production, web3 raises `Web3RPCError`; in the test, the mock handed the code exactly the `ValueError` it expected.

The final check was weak too:

```python
mocked_fn.assert_called()
```

It confirms the mock was called at least once. It says nothing about whether the request was retried.

## Moving the mock so web3 still decodes the response

Instead of running a real node, I mocked `HTTPProvider.make_request`.

At first I didn't see why that method was the right one; `mocker.patch.object`'s signature alone doesn't tell you what object to pass. So I followed `HTTPProvider`'s source. `make_request` decodes the HTTP response body and returns the result:

```python
response = self.decode_rpc_response(raw_response)
return response
```

So it returns the response as a dict. Returning a fake error dict there leaves everything after it, including web3's own response handling, running as it would in production:

```text
get_block(123)
→ retry wrapper
→ HTTPProvider.make_request returns the fake response
→ web3 processes it and raises Web3RPCError
→ the retry wrapper sees that exception and decides
```

That's also why `return_value` is a dict and not a JSON string. At this point the JSON is already decoded, so no `json.dumps()` is needed.

## The reproduction test

The test became:

```python
def test_rpc_timeout_error_retry(mocker):
    make_request = mocker.patch.object(
        HTTPProvider,
        "make_request",
        return_value={
            "jsonrpc": "2.0",
            "id": 0,
            "error": {"code": -32603, "message": "request failed or timed out"},
        },
    )

    web3 = retryable_web3()
    with pytest.raises(Web3RPCError):
        web3.eth.get_block(123)

    assert make_request.call_count == 2
```

`mocker.patch.object(target, "attribute", return_value=...)` replaces an attribute of an object for the duration of the test and restores it afterwards. The mock it returns records its calls, so `call_count` gives the number of requests.

## Checking the exception and the count separately

The `pytest.raises` block checks which exception finally comes out. The mock returns an error every time, so even with retries the call ends in an exception; that part is expected.

Whether it retried is a separate assertion:

```python
assert make_request.call_count == 2
```

The existing test helper stops retrying with:

```python
return retry_state.attempt_number > 1
```

The condition becomes true on the second attempt, so the expected total is two: the first try and one retry.

The count check has to sit outside the `with` block. Once `get_block()` raises, nothing after it inside the block runs.

## Watching it fail first

With the new test in place and the implementation untouched:

```bash
python -m pytest tests/test_retryable_eth_module.py -k rpc_timeout -q
```

```text
AssertionError: assert 1 == 2
1 failed, 8 deselected
```

The `Web3RPCError` check passed. The request count was one, not two. That's the bug, reproduced: given the real exception type, the wrapper doesn't retry.

## The fix

Import `Web3RPCError` and check for it:

```python
from web3.exceptions import Web3RPCError


def is_timeout_value_error(e) -> bool:
    """Check if a Web3RPCError is due to an rpc request timeout."""
    return isinstance(e, Web3RPCError) and "request failed or timed out" in str(e)
```

Since the package requires `web3>=7`, the check targets the exception those versions raise. I kept the function's name to keep the change small.

The test then passed: the first attempt failed, the wrapper retried, the second failed and stopped, for a count of `2`. The full suite passed as well:

```bash
python -m pytest tests/ -q
```

```text
44 passed in 101.24s
```

## When the fix didn't seem to take

For a while I kept getting `assert 1 == 2` after making the fix. I'd cloned the repository again to work separately from my first copy, and the file I was editing wasn't the file the tests imported.

This shows which file Python actually loads, and the function it contains:

```bash
python -c 'import inspect; import web3_utils.retryable_eth_module as m; print(m.__file__); print(inspect.getsource(m.is_timeout_value_error))'
```

The printed function still had `isinstance(e, ValueError)`. Once I edited the file in the right folder, the test passed.

VS Code's import warning was a separate case of the same problem. The import worked in the terminal, but the editor was using a different Python interpreter. `python -c 'import sys; print(sys.executable)'` gave the virtual environment's interpreter path, and pointing VS Code at it cleared the warning.

When a change doesn't seem to apply, check which file and which interpreter are actually running before anything else.

## From fork to PR

With the test and fix in place, I bumped the package version from `0.12.3` to `0.12.4`.

Without write access to the repository, I forked it and set up two remotes: `upstream` for stakefish's repository and `origin` for my fork. I pushed the branch to the fork and opened a PR against `main`:

```text
fix: retry RPC timeout errors raised as Web3RPCError
```

That's [PR #52](https://github.com/stakefish/web3-utils.py/pull/52). It changes four files: the retry condition, its test, and the version in `setup.cfg` and `.bumpversion.cfg`.

## Review: fixing the check switched retries on for everything

A maintainer's review came back with a blocking issue I hadn't considered.

Under `web3>=7`, the old timeout check had never matched anything, so in practice timeout retries were off. My fix turned them on, and the retry wrapper applies to `retrieve_caller_fn`, which every `Eth` method goes through. There was no list of which methods it should cover, and the default stop condition is `stop_never`. That meant transaction submission would now be retried too.

The review explained why that's dangerous. A `-32603 "request failed or timed out"` response doesn't mean the node rejected the transaction; it may well have accepted and broadcast it.

| Method | What a retry after a timeout does |
|---|---|
| `eth_sendTransaction` | The node signs again with the next nonce and can broadcast a second, duplicate transaction |
| `eth_sendRawTransaction` | The same signed transaction is sent again, so a broadcast that succeeded comes back as `already known` or `nonce too low` |

The request was to exclude state-changing methods, or retry only read-only ones. The non-blocking points:

- matching a substring of `str(e)` is loose: also check that `e.rpc_response` has error code `-32603`;
- consider web3's `RequestTimedOut`, the subclass it raises for messages it recognises as timeouts;
- the test covers only sync `get_block`, so add an `AsyncEth` case and a case proving `send_raw_transaction` is not retried.

That second point was the same thing I'd noticed while tracing web3's validation code: a geth `"request timed out"` message produces `RequestTimedOut`, which my string check wouldn't have caught.

The blocking point was the bigger lesson. A condition that never matched was hiding how wide the retry reached. Making it match turned on every path behind it, including ones that must never repeat.

## The second commit

I pushed [`7bee864`](https://github.com/stakefish/web3-utils.py/pull/52/commits/7bee864), "fix: restrict RPC retries to safe methods".

**An allowlist of 31 RPC methods.** `RETRYABLE_RPC_METHODS` lists the read-only and simulation calls: node and fee queries, block and transaction queries, receipts, account state, logs, and `eth_call`, `eth_estimateGas`, `eth_createAccessList`, `eth_simulateV1`. Transaction submission, signing, filter creation and polling, subscriptions, and any method not on the list are excluded.

**The allowlist gates every retry condition, not just timeouts.** The wrapper now combines them with `retry_all`:

```python
retry=retry_all(
    retry_if_exception(lambda e: method.json_rpc_method in RETRYABLE_RPC_METHODS),
    retry_any(
        retry_if_exception_type((BlockNotFound, TransactionNotFound, ConnectionError, ...)),
        retry_if_exception(is_retryable_http_error),
        retry_if_exception(is_timeout_value_error),
    ),
)
```

That's a wider change than the review strictly asked for. Before this commit, a `ConnectionError` on `send_raw_transaction` was already retried. A dropped connection after the request was sent leaves the same uncertainty as a timeout, so it's excluded now as well, and a test pins that down.

**A stricter timeout check:**

```python
def is_timeout_value_error(e) -> bool:
    if isinstance(e, RequestTimedOut):
        return True
    if not isinstance(e, Web3RPCError):
        return False
    response = e.rpc_response or {}
    error = response.get("error", {})
    return error.get("code") == -32603 and "request failed or timed out" in error.get("message", "")
```

`RequestTimedOut` counts on its own. Any other `Web3RPCError` needs both the `-32603` code and the message, read from the structured response instead of the exception's string form.

## Verifying the review's points

The tests grew to match each point in the review:

| Review point | Test |
|---|---|
| Only read-only methods retry | `test_rpc_retry_policy`, run over 44 method cases × both timeout types (`rpc_response` and `RequestTimedOut`) |
| Transaction submission never retries | `test_send_raw_transaction_timeout_does_not_retry`, `test_send_raw_transaction_connection_error_does_not_retry` |
| Filter polling isn't retried | `test_get_filter_changes_timeout_does_not_retry` |
| Code and message must both match | `test_timeout_message_with_other_rpc_code_does_not_retry` |
| `get_block` picks its RPC method from its argument | `test_rpc_timeout_error_retry`, with a block number and a block hash |
| Async is covered | async read cases |

The `get_block` case matters because its RPC method isn't fixed: a number calls `eth_getBlockByNumber` and a hash calls `eth_getBlockByHash`. The allowlist check has to see whichever one is actually sent, and the test runs both.

The suite went from 44 tests to 140, all passing along with the formatting checks. I re-ran it on `7bee864` while writing this:

```text
140 passed in 105.66s
```

I replied on the PR with what changed and asked for another look. The PR is still open.

## What I took from it

When a library changes major versions, it's not just function signatures that move; exception types can change too. Code that doesn't follow can receive the same error message and behave differently.

A test also has to recreate the conditions the code really runs under. Here that meant returning a response dict and letting web3 build the exception, instead of building the exception myself.

And for anything where the count matters, like retries, "was it called" isn't enough. The test has to check both that the real exception came out and how many requests were made.

The review added one more. Before making a dead condition work again, ask what it guards. A retry is only safe for a request that can be repeated, and the code has to say which requests those are.
