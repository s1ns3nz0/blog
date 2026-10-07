---
title: "LND: Short Reads in NodeAnnouncement2 Address Decoders, Fixed"
description: "I reported that LND's NodeAnnouncement2 address decoders accepted truncated records by ignoring how many bytes Read returned. A maintainer confirmed it, found a second bug in the same parser, and fixed both in lnd#11219 with me as a co-author."
pubDatetime: 2026-10-07T22:40:00+09:00
tags:
  - Contribution
  - lnd
  - Lightning Network
  - Go
---

I reported a parser bug in [LND](https://github.com/lightningnetwork/lnd), Lightning Labs' Lightning node, as [issue #11211](https://github.com/lightningnetwork/lnd/issues/11211). A maintainer confirmed it, found a second bug in the same code, and fixed both in [PR #11219](https://github.com/lightningnetwork/lnd/pull/11219), which was merged on 7 October 2026 for LND 0.22.0. One of its commits lists me as co-author, and the release notes credit me.

## What the code does

Lightning nodes announce themselves to the network with a node announcement, which includes the addresses others can connect to. `NodeAnnouncement2` is the newer version of that message, and it encodes addresses as TLV records: a type, a length, and then a list of fixed-size entries.

| Address type | Entry size |
|---|---|
| IPv4 | 4-byte IP + 2-byte port = 6 bytes |
| IPv6 | 16-byte IP + 2-byte port = 18 bytes |
| Tor v3 | `tor.V3DecodedLen`-byte key + 2-byte port |

The decoders in `lnwire/node_announcement_2.go` read each entry's fields into fixed-size arrays.

## The bug I reported: ignoring the byte count

Each field was read like this:

```go
_, err := r.Read(ip[:])
if err != nil {
    return err
}
_, err = r.Read(port[:])
```

`io.Reader.Read` doesn't promise to fill the buffer. It returns how many bytes it read, and a conforming reader may return fewer than requested with a `nil` error. The decoder threw that count away. If the input ran short, the rest of the array kept whatever it already held, zeros on the first read, and the decoder built an address from it without complaint.

I reproduced it in `lnwire` unit tests on `master` at `88959ae`:

- IPv4: 5 bytes supplied for a 6-byte record;
- IPv6: 17 bytes for an 18-byte record;
- Tor v3: `tor.V3DecodedLen+1` bytes for a `tor.V3DecodedLen+2` record.

Each was accepted and returned an address. The issue proposed replacing the six fixed-width `Read` calls with `io.ReadFull`, which either fills the buffer or returns an error, and listed the tests to go with it: truncated records rejected, two complete addresses decoded, complete records decoded through `iotest.OneByteReader` (a reader that hands back one byte at a time, so a correct decoder must still work), and the existing fuzz targets still passing.

I also stated the limits. This was a parser correctness bug; I hadn't confirmed any network-wide gossip impact or a live exploit, and the report didn't claim one.

## The second bug the maintainer found

The maintainer, bitromortac, confirmed the report the next day and added something I'd missed: with more than one address, the earlier addresses got overwritten by the last.

The scratch arrays were declared once, outside the loop:

```go
var (
    numAddrs = int(l / ipv4AddrEncodedSize)
    addrs    = make([]*net.TCPAddr, 0, numAddrs)
    ip       [4]byte
    port     [2]byte
)
for len(addrs) < numAddrs {
    ...
    // each net.TCPAddr is built from ip[:], a slice of the same array
}
```

A Go slice is a view onto an array, not a copy. Every `net.TCPAddr` built from `ip[:]` pointed at the same four bytes, so each new read changed every address already in the list. After the loop, they all showed the last address read.

My tests had decoded two complete addresses, but that alone didn't show this. The aliasing only shows when you compare each decoded address against what was encoded, with distinct values.

## The fix

PR #11219 fixes both, in all three decoders. A small helper reads each field completely:

```go
// readAddrField fills b from an address list record. The TLV length declares
// every byte of the list, so an io.EOF at an address boundary is a truncation
// and returns io.ErrUnexpectedEOF.
func readAddrField(r io.Reader, b []byte) error {
    _, err := io.ReadFull(r, b)
    if errors.Is(err, io.EOF) {
        return io.ErrUnexpectedEOF
    }

    return err
}
```

`io.ReadFull` already returns `io.ErrUnexpectedEOF` when it reads some bytes but not all. When it reads none, it returns plain `io.EOF`, which usually means "clean end of input". Here it doesn't: the TLV length said how many bytes the list holds, so running out at an address boundary is still a truncation, and the helper says so.

And the arrays moved inside the loop, so each address owns its own:

```go
for len(addrs) < numAddrs {
    // Each address owns its arrays, so no two share bytes.
    var (
        ip   [4]byte
        port [2]byte
    )

    err := readAddrField(r, ip[:])
    ...
}
```

The PR adds `TestNodeAnn2AddrDecodeTruncated`, which checks IPv4, IPv6, and Tor v3 each with a short address, a short port, and a cut exactly at an address boundary, the case the `io.EOF` conversion exists for. The release notes for 0.22.0 describe the fix: decoded addresses "aliased one scratch array and truncated records decoded without an error".

## How the contribution ended up

I already had a working patch when I opened the issue, and asked whether I could take it. A maintainer pointed me to LND's [guidelines for new contributors](https://github.com/lightningnetwork/lnd/blob/master/docs/code_contribution_guidelines.md#new-contributors): PRs from new contributors aren't prioritised for review, and issue triage and PR review are the better way to build a track record. The fix stayed with the assigned maintainer.

bitromortac then credited me on the short-read commit with `Reported-by` and `Co-authored-by` trailers, and in the release notes. The merged commit, `lnwire: fix NodeAnnouncement2 short reads`, lists both of us as authors.

## What I took from it

`Read` returning without an error doesn't mean the buffer is full. For fixed-width binary fields, `io.ReadFull` is the default, and testing through `iotest.OneByteReader` is a cheap way to catch the difference.

The aliasing bug sat in the same few lines and I didn't see it. Fresh eyes on a confirmed report found more than the report did, which is a good argument for writing the report clearly enough that someone else can take it further.

And on a project like LND, a precise issue with a reproduction, a proposed fix, and honest limits was a contribution in itself, even without opening the PR.
