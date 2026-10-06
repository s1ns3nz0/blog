---
title: "eth2-monitor: Release Binaries That Overwrite Each Other"
description: "stakefish/eth2-monitor's release workflow builds eight OS and architecture combinations into two file names, so only the Windows builds survive. An issue asking which platforms the release is meant to ship."
pubDatetime: 2026-10-06T09:00:00+09:00
tags:
  - Contribution
  - CI/CD
  - GitHub Actions
  - Ethereum
---

While reading through the release build for [`stakefish/eth2-monitor`](https://github.com/stakefish/eth2-monitor), I found that binaries for different operating systems are written to the same file name. I opened [issue #32](https://github.com/stakefish/eth2-monitor/issues/32) to ask which platforms the release is meant to support.

Everything below was checked against commit `19197e7` on 6 October 2026.

## The code

[Lines 58–67 of the build workflow](https://github.com/stakefish/eth2-monitor/blob/19197e720bbac567de99710697616116d9dfe391/.github/workflows/main.yml#L58-L67):

```bash
build () {
  GOARCH=$1 GOOS=$2 make eth2-monitor && install -v bin/eth2-monitor build/eth2-monitor-$1
}

mkdir -p build
for arch in amd64 arm64; do
  for os in linux darwin freebsd windows; do
    build "$arch" "$os"
  done
done
```

`$1` is the architecture and `$2` is the operating system. The compile step uses both, but the output file name only uses the architecture.

So for each architecture, the inner loop builds Linux, then macOS, then FreeBSD, then Windows, and each build overwrites the previous one at the same path. Eight combinations get built, and two files are left at the end: the Windows binaries.

`install` copies a file and sets its permissions, replacing the destination if it exists. Swapping it for `cp` wouldn't help; the problem is the name, not the command.

## What the release actually ships

The [v7.0.0 release](https://github.com/stakefish/eth2-monitor/releases/tag/v7.0.0) has two binaries and a checksum file. I downloaded them, checked them against `sha256sums.txt`, and ran `file` on each:

| File | Format |
|---|---|
| `eth2-monitor-amd64` | PE32+ executable, x86-64, for MS Windows |
| `eth2-monitor-arm64` | PE32+ executable, Aarch64, for MS Windows |

Both checksums matched, so these are the files the workflow published, and both are Windows executables. Someone on Linux who downloads `eth2-monitor-amd64`, the obvious choice for a validator monitoring host, gets a binary that won't run.

I didn't run the full Go cross-compile myself. What I checked is the output path collision in the workflow and the format of the files actually released.

## What the issue asks

The overwrite is certain. What the maintainers intend isn't. Shipping only Windows is possible, if unlikely for a tool that monitors Ethereum validators.

The repository has no `CONTRIBUTING` guide and no issue or PR templates, and the README doesn't say the release is Windows-only. So instead of opening a fix directly, the issue asks:

> Is the release meant to ship all eight OS and architecture combinations, or only Windows? If it's all of them, I can prepare a PR that puts the OS in the file name.

## Fixes, depending on the answer

- **All platforms:** include both OS and architecture in the name, such as `eth2-monitor-linux-amd64`, add `.exe` for Windows, and check that the build produces eight artifacts with a checksum for each.
- **Windows only:** drop the other OS builds, which today cost CI time and produce nothing.

The point of asking first is to keep two things apart: what I observed, which is the path collision and the files it produced, and what the project intends to support, which only the maintainers can say. Once that's settled, the fix is a small CI change.
