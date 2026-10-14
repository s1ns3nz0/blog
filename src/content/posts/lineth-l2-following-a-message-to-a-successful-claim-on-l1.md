---
title: "Lineth L2 Transaction Lifecycle (6) - Following an L2 Message to a Successful Claim on L1"
description: "The transaction from block 23,851 sent 0.02 ETH from L2 to L1 through the message service. I followed its message hash from the MessageSent event, through the postman, to the MessageClaimed event and a successful claim receipt on L1 six minutes later."
pubDatetime: 2026-10-14T18:13:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

In [part 1](/posts/lineth-l2-following-a-transaction-through-besu-and-maru/), I followed a transaction into L2 block 23,851 and stopped at its receipt:

```text
0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d
```

That transaction went to the L2 message service, and it emitted a `MessageSent` event. This post follows that message to L1. Its message hash is the thread that ties together the L2 request, the postman, and the claim on L1.

All timestamps are UTC.

## What a claim is

Sending a message on L2 doesn't run anything on L1. The two chains execute separately.

A claim is the transaction on the destination chain that processes the message. For an L2 to L1 message, the L1 message service checks the proof that the message was included, makes sure it hasn't been processed before, and calls the recipient with the message's value and calldata. On success it emits:

```solidity
event MessageClaimed(bytes32 indexed _messageHash);
```

Finalization and claiming are separate operations. Finalization, covered in [part 4](/posts/lineth-l2-following-a-blob-from-creation-to-finalization-on-l1/), records the L2 state and its message commitments on L1. A claim then processes one message against that.

The [postman](/posts/lineth-postman-stuck-claim-cancel-bigint/) automates delivery, but the claim event doesn't say who submitted the claim.

## The L2 receipt

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast receipt -r "$L2" \
    0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d \
    --json' \
  | jq '{
      transactionHash,
      status,
      blockNumber,
      logs: [.logs[] | {address, topics, data}]
    }'
```

```text
status:      0x1
blockNumber: 0x5d2b → 23851
```

It emitted a log from the L2 message service at `0xe537d669ca013d86ebef1d64e40fc74cadc91987`, with these topics:

```json
[
  "0xe856c2b8bd4eb0027ce32eeaf595c21b0b6b4644b326e5b7bd80a1cf8db72e6c",
  "0x000000000000000000000000b3c150df38e91149e260c3233f3121810d4d2976",
  "0x000000000000000000000000b3c150df38e91149e260c3233f3121810d4d2976",
  "0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7"
]
```

## Reading the topics

The message service defines the event as:

```solidity
event MessageSent(
  address indexed _from,
  address indexed _to,
  uint256 _fee,
  uint256 _value,
  uint256 _nonce,
  bytes _calldata,
  bytes32 indexed _messageHash
);
```

A log has three parts:

| Field | What it holds |
|---|---|
| `address` | The contract that emitted the event |
| `topics` | The event ID, then the indexed arguments |
| `data` | The non-indexed arguments, ABI-encoded |

So the topics read:

| Position | Meaning | Value |
|---|---|---|
| `topics[0]` | Event signature hash | `MessageSent` |
| `topics[1]` | Sender on L2 | `0xb3c150df38e91149e260c3233f3121810d4d2976` |
| `topics[2]` | Recipient on L1 | `0xb3c150df38e91149e260c3233f3121810d4d2976` |
| `topics[3]` | Message hash | `0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7` |

`topics[0]` is the Keccak-256 hash of the signature with argument names and `indexed` stripped:

```text
MessageSent(address,address,uint256,uint256,uint256,bytes,bytes32)
```

An address is 20 bytes and a topic is 32, so addresses are left-padded with zeros.

Sender and recipient are the same address, but on different chains. This is someone sending ETH to themselves on L1.

## Decoding the data

The non-indexed fields are in `data`. Decoded against the event definition:

| Field | Value |
|---|---|
| `_fee` | 0.0009 ETH |
| `_value` | 0.02 ETH |
| `_nonce` | 460 |
| `_calldata` | `0x` (empty) |

0.02 ETH to the same address on L1, with no function call. The 0.0009 ETH fee pays for delivery on L1 and is separate from the gas for the L2 transaction. `_nonce` 460 is the message service's message number, not the sender's account nonce.

`bytes` is variable-length, so its slot in the ABI encoding holds an offset to the contents instead of the contents. The offset here is `0x80` (128 bytes), and the length stored there is zero.

## The postman sees it

Searching Loki for the message hash returned postman records. The first:

```text
time=2026-10-14T03:54:17.132Z level=INFO logger=L2MessageSentEventProcessor msg="MessageSent event stored." direction=L2_TO_L1 messageHash=0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7 blockNumber=23851 transactionHash=0x2c991a9f89566e395bba83d34b885fa88151ab7313c791cdb54ca912641d8a7d
```

Three identifiers match the L2 receipt:

```text
L2 block:       23851
L2 transaction: 0x2c991a…d8a7d
Message hash:   0x826bfd…b0eb7
```

The postman picked up the message 1.5 seconds after RPC Besu imported the block. The same storage record repeats until 03:54:20.674. That's the postman writing the same event again, not the message being executed or claimed more than once.

## The claim on L1

I pulled every `MessageClaimed` event from the L1 rollup contract and filtered for this message hash:

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast logs -r "$L1" \
    --address 0xdc64a140aa3e981100a9beca4e685f962f0cf6c9 \
    --from-block 0 \
    --to-block latest \
    "MessageClaimed(bytes32)" \
    --json' \
  | jq '.[]
    | select(
        .topics[1] ==
        "0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7"
      )
    | {
        transactionHash,
        blockNumber,
        blockTimestamp,
        messageHash: .topics[1]
      }'
```

```json
{
  "transactionHash": "0xa656d30453f57df5c2bc63e6eed3a50f7bfce45877e6c64088ad281b8578795f",
  "blockNumber": "0x18e11",
  "blockTimestamp": "0x6acefe5a",
  "messageHash": "0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7"
}
```

```text
blockNumber:    0x18e11    → 101905
blockTimestamp: 0x6acefe5a → 2026-10-14T04:00:26Z
```

The message hash sits in a different topic position in each event:

```text
L2 MessageSent:    topics[3]
L1 MessageClaimed: topics[1]
```

That's just where each event definition puts it. The value is the same, and that's what links the L2 message to the L1 claim.

## The claim receipt

```bash
k -n lineth-l2 exec deploy/l2-users -- sh -c \
  'cast receipt -r "$L1" \
    0xa656d30453f57df5c2bc63e6eed3a50f7bfce45877e6c64088ad281b8578795f \
    --json' \
  | jq '{
      transactionHash,
      blockNumber,
      status,
      from,
      to,
      gasUsed,
      claimEvents: [
        .logs[]
        | select(
            .topics[1] ==
            "0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7"
          )
        | {address, topics, data, blockTimestamp}
      ]
    }'
```

```json
{
  "transactionHash": "0xa656d30453f57df5c2bc63e6eed3a50f7bfce45877e6c64088ad281b8578795f",
  "blockNumber": "0x18e11",
  "status": "0x1",
  "from": "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
  "to": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  "gasUsed": "0x12ae5",
  "claimEvents": [
    {
      "address": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
      "topics": [
        "0xa4c827e719e911e8f19393ccdb85b5102f08f0910604d340ba38390b7ff2ab0e",
        "0x826bfdf9b4a801b09eb8f7042587780002b161bc7c2510c81244938f68bb0eb7"
      ],
      "data": "0x",
      "blockTimestamp": "0x6acefe5a"
    }
  ]
}
```

`status: 0x1` means the claim transaction succeeded, and the `MessageClaimed` event in it names the message it processed.

The receipt's `to` is the L1 message service, not the message's recipient. The service processes the claim and calls the recipient itself.

The claim was sent from `0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc`. `MessageClaimed` records only the message hash, so the event alone doesn't tie that account to the postman.

## The timeline

| UTC | What happened |
|---|---|
| 03:54:15.643 | Sequencer hands out the block 23,851 payload with the transaction |
| 03:54:15.652 | RPC Besu imports it |
| 03:54:17.132 | Postman stores the `MessageSent` event |
| 04:00:26 | L1 block 101,905 with the successful claim |

About six minutes from the L2 block to the claim on L1. That isn't postman processing time. An L2 to L1 claim needs the block finalized on L1 first, so the gap includes proving and finalizing block 23,851 as well as the claim itself.

## End to end

```text
Successful L2 transaction in block 23851
    ↓
MessageSent
  recipient = 0xb3c150…d2976 on L1
  value     = 0.02 ETH
  fee       = 0.0009 ETH
  number    = 460
  calldata  = empty
    ↓
Postman stores the same message hash
    ↓
Successful L1 claim in block 101905
    ↓
MessageClaimed with the same message hash
```

Parts 2 to 5 followed other block ranges through proving, signing, and finalization. This one closes the loop on the transaction from part 1: its 0.02 ETH was claimed on L1.
