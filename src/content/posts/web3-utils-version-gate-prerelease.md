---
title: "web3-utils: A Version Gate That Couldn't Read Prereleases"
description: "stakefish/web3-utils.py's CI version gate compared versions by keeping only their numeric parts, so beta and rc numbers turned into patch numbers. It rejected valid promotions and let a downgrade through. A PR that switches to packaging.version."
pubDatetime: 2026-10-07T09:00:00+09:00
tags:
  - Contribution
  - Python
  - CI/CD
  - GitHub Actions
---

[`stakefish/web3-utils.py`](https://github.com/stakefish/web3-utils.py) has a CI check that makes every change to the package bump its version. It compared versions incorrectly whenever a prerelease was involved: it rejected valid promotions like beta to rc, and accepted a downgrade from a release to a beta. I fixed it in [PR #51](https://github.com/stakefish/web3-utils.py/pull/51).

This is a separate fix from [the RPC retry PR](/posts/web3-utils-rpc-timeout-retry-web3rpcerror/) in the same repository.

## The version gate

The gate came in with [#37](https://github.com/stakefish/web3-utils.py/pull/37). On a pull request, `scripts/check_version_bump.py` compares the version in `setup.cfg` against the base branch, and fails if the package changed without the version going up.

The project versions with `bumpversion`, and its configuration allows prereleases:

```ini
parse = (?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)((?P<stage>[^.]*)\.(?P<devnum>\d+))?
serialize =
	{major}.{minor}.{patch}{stage}.{devnum}
	{major}.{minor}.{patch}

[bumpversion:part:stage]
values =
	b
	rc
	stable
```

So a release line can go `0.12.0b.1` → `0.12.0rc.1` → `0.12.0`, and the README describes exactly that path: `bumpversion stage` moves a beta to `rc`, and an `rc` to stable.

## How it compared

```python
def _as_tuple(version: str) -> tuple:
    # Deliberately not packaging.version: this repo's bumpversion serialize can emit `0.12.0b.1`, which
    # is not PEP 440 and would raise rather than compare. Numeric parts are enough to order releases.
    return tuple(int(part) for part in version.split(".") if part.isdigit())
```

Split on dots, keep the parts that are all digits, compare the tuples. For a prerelease, that throws away the wrong things:

```text
"0.12.0b.1".split(".")  →  ["0", "12", "0b", "1"]
keep digits only        →  (0, 12, 1)
```

`0b` isn't all digits, so the patch number goes with it, and the beta's counter `1` slides into the patch position. To the gate, `0.12.0b.1` is the same as `0.12.1`.

Running the old function against a few real transitions:

| Change | Old tuples | Old result | Correct result |
|---|---|---|---|
| `0.12.0b.1 → 0.12.0rc.1` | `(0,12,1)` → `(0,12,1)` | Reject: equal | Accept: beta to rc |
| `0.12.0rc.1 → 0.12.0` | `(0,12,1)` → `(0,12,0)` | Reject: looks lower | Accept: rc to stable |
| `0.12.0b.99 → 0.12.1` | `(0,12,99)` → `(0,12,1)` | Reject: looks lower | Accept: next patch |
| `0.12.3 → 0.12.0b.4` | `(0,12,3)` → `(0,12,4)` | Accept: looks higher | Reject: a downgrade |

The first three block the exact promotion path the README documents. The last one is worse: a beta of an older version passes as an upgrade, because its counter `4` is read as patch `4`.

## The premise in the comment

The comment gives the reason for not using `packaging.version`: `0.12.0b.1` isn't PEP 440 and would raise.

It doesn't raise. PEP 440 allows a separator between a prerelease marker and its number, and `packaging` normalises it:

```python
>>> from packaging.version import Version
>>> Version("0.12.0b.1")
<Version('0.12.0b1')>
>>> Version("0.12.0rc.1") > Version("0.12.0b.1")
True
```

So the format this repository serialises is one `packaging` already understands, prerelease ordering included: `b` < `rc` < stable. The workaround was built on a premise that wasn't true, and it lost the information that ordering needs.

## The fix

Compare with `packaging.version.Version`, and fail clearly on a version it can't parse:

```python
from packaging.version import InvalidVersion, Version

try:
    head_release = Version(head_version)
    base_release = Version(base_version)
except InvalidVersion as exc:
    print(f"::error::Invalid release version: {exc}")
    return 1

if head_release <= base_release:
    ...
```

An invalid version used to be impossible to notice; now it's a CI error with a message, not a traceback.

`packaging` isn't installed in the version-check job by default, so the PR adds `requirements-version-check.txt` with a pinned `packaging==26.3`, installs it in `.github/workflows/version-check.yml`, and has `requirements-dev.txt` include the same file so local runs and CI use one pin.

Everything else the script checks stays as it was: that `setup.cfg` and `.bumpversion.cfg` agree, that the package actually changed, and that the tag doesn't already exist.

## Testing the script as CI runs it

The tests don't import the comparison function. They run the real script against a throwaway Git repository, the way the workflow does:

1. create a repository in `tmp_path` and write the base version to both `setup.cfg` and `.bumpversion.cfg`;
2. commit a package file, and keep that commit as the base ref;
3. write the head version, change the package file, and commit again;
4. run `check_version_bump.py <base_ref>` as a subprocess and check its exit code.

Ten cases cover promotions, ordinary bumps, downgrades, an unchanged version, a spelling that only differs by normalisation (`0.12.0b.1` → `0.12.0b1`, which is the same version and so must fail), and invalid versions on either side. Every case also asserts there's no `Traceback` in stderr, and the invalid ones check for the `::error::` message.

Against the old code, 6 of the 10 failed and 4 passed. With the fix, all 10 passed on macOS and Linux. The full suite passed on macOS with Python 3.14.6, along with `black --check` and `isort --check --diff`.

The change only touches CI tooling and tests, so the PR doesn't bump the package version.

## What I took from it

When code works around a library, the reason in its comment is worth checking. This one said `packaging` couldn't parse the project's versions; it could. The replacement was simpler but dropped exactly the part of the version that tells a beta from a release.

And a gate is tested best the way it runs. Calling the script against real commits checked the parsing, the comparison, the exit code, and the error output together, which a unit test of the tuple function alone wouldn't have.
