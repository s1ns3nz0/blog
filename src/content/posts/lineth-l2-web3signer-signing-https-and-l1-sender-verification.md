---
title: "Lineth L2 Transaction Lifecycle (5) - Web3Signer: Transaction Signing, HTTPS, and L1 Sender Verification"
description: "Where the Coordinator's L1 transactions get signed. What Web3Signer signs, how the Coordinator reaches it over mutual TLS, and a check that the public keys in the config derive to the exact senders in the blob and aggregation receipts."
pubDatetime: 2026-10-14T18:12:00+09:00
tags:
  - Lineth L2 Lifecycle
  - Ethereum
  - Layer 2
  - SRE
---

The [previous post](/posts/lineth-l2-following-a-blob-from-creation-to-finalization-on-l1/) showed the blob transaction and the finalization transaction coming from two different accounts. This post explains why: both are signed by Web3Signer, with a different key for each.

It covers what Web3Signer signs, how the Coordinator reaches it over HTTPS, and a check that the configured keys match the senders in the L1 receipts. I look at the two paths that submit to the rollup contract, blob submission and aggregation submission. Message anchoring uses a separate signing path and isn't covered here.

## What Web3Signer signs

Web3Signer signs the Ethereum transactions the Coordinator prepares. A transaction has fields like:

| Field | What it's for |
|---|---|
| Chain ID | Which chain it's for |
| Nonce | Its position in the sender's sequence |
| Destination | The contract or account being called |
| Value | ETH transferred |
| Calldata | The function and its arguments |
| Gas limit and fee fields | Execution limits and fees |
| Blob fields | For type `0x3`: the blob versioned hashes and the blob fee cap |

Web3Signer signs the transaction's signing payload with the selected key. Ethereum recovers the sender's address from the signature, so changing any signed field breaks the signature for that sender.

For a blob transaction, the versioned hashes are signed. The blob data itself travels separately, in the sidecar.

### Signing isn't proving

An aggregation submission carries a rollup proof in its calldata. Web3Signer signs the transaction that carries it. It doesn't make the proof and it doesn't vouch for L2 execution. A valid signature says the key holder authorized the transaction. Whether the contract call succeeded is in the receipt.

```text
Prover
  Writes a proof response
       ↓
Coordinator
  Encodes the contract call, builds the transaction
       ↓
Web3Signer
  Signs with the selected key
       ↓
Coordinator
  Sends the signed transaction to L1
       ↓
L1 contract
  Runs the call
```

## A public key picks the signer

The Coordinator config holds a public key for each signing path. The public key tells Web3Signer which private key to sign with. Nothing is encrypted with it.

The request amounts to: sign this transaction with the key that matches this public key. Web3Signer sends back the signature, and the private key never leaves Web3Signer.

## Two submission paths

Both paths in the deployed config use Web3Signer:

| Signing path | What it signs |
|---|---|
| Blob submission | Transactions publishing compressed L2 data on L1 |
| Aggregation submission | Transactions finalizing an L2 range |

Both point at the same endpoint, `https://web3signer:9000`, each with its own public key. One signing service, two sender accounts: one for publishing data and one for finalizing.

## Where HTTPS is set up

```text
Coordinator: HTTPS client
          ↕
Web3Signer: HTTPS server
```

Certificates come from Kubernetes Secrets, and both services load them at startup.

### Web3Signer, the server

```text
--tls-keystore-file=/tls-files/web3signer-keystore.p12
--tls-keystore-password-file=/tls-files/web3signer-keystore-password.txt
--tls-known-clients-file=/tls-files/known-clients.txt
--http-listen-port=9000
```

The keystore is Web3Signer's TLS identity. The known-clients file lists the client certificates it accepts. The `web3signer-tls` Secret is mounted at `/tls-files`, and the deployment describes port 9000 as mutual TLS.

### Coordinator, the client

The blob signer:

```toml
[l1-submission.blob.signer]
type = "Web3signer"

[l1-submission.blob.signer.web3signer]
endpoint = "https://web3signer:9000"
max-pool-size = 10
keep-alive = true

[l1-submission.blob.signer.web3signer.tls]
key-store-path = "/tls-files/coordinator-client-keystore.p12"
trust-store-path = "/tls-files/web3signer-truststore.p12"
```

The aggregation signer uses the same TLS paths. The `coordinator-tls` Secret is mounted at `/tls-files`.

| Store | What it holds |
|---|---|
| Client keystore | The Coordinator's client certificate and its TLS key |
| Truststore | What the Coordinator uses to check Web3Signer's server certificate |

These TLS keys have nothing to do with the Ethereum signing keys.

## What mutual TLS does

With mutual TLS, each side checks the other's certificate:

```text
Coordinator connects to Web3Signer
    ↓
Coordinator checks Web3Signer's server certificate
    ↓
Web3Signer checks the Coordinator's client certificate
    ↓
Signing requests and responses go over that connection
```

TLS protects the connection. The Ethereum signature authenticates the transaction.

| Mechanism | Job |
|---|---|
| HTTPS/TLS | Encrypt the connection, authenticate both ends |
| Ethereum public key | Pick the signing key, derive the account address |
| Ethereum private key | Sign the transaction |

Web3Signer doesn't decrypt anything with the Ethereum private key. TLS decryption and transaction signing are separate steps with separate keys.

## The blob signer matches the blob sender

The blob path's public key:

```text
9d9031e97dd78ff8c15aa86939de9b1e791066a0224e331bc962a2099a7b1f0464b8bbafe1535f2301c72c2cb3535b172da30b02686ab0393d348614f157fbdb
```

For a 64-byte public key, the Ethereum address is the last 20 bytes of its Keccak-256 hash:

```bash
k -n lineth-l2 exec deploy/l2-users -- \
  cast keccak \
  0x9d9031e97dd78ff8c15aa86939de9b1e791066a0224e331bc962a2099a7b1f0464b8bbafe1535f2301c72c2cb3535b172da30b02686ab0393d348614f157fbdb \
  | awk '{print "0x" substr($0, length($0)-39)}'
```

```text
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc
```

If the key is in uncompressed form with a leading `04`, drop the `04` before hashing.

The blob transaction from the previous post, for L2 blocks 25805..25884:

```json
{
  "transactionHash": "0x963a7ef7c4f95b3fb80e2f0e82f04b2cdb769bb6b3e5724fdaa61468dc0b9bb3",
  "blockNumber": "0x1b4ee",
  "status": "0x1",
  "from": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  "to": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  "gasUsed": "0x1cc63"
}
```

`from` is exactly the derived address. That's the type `0x3` transaction with one versioned hash, included in L1 block 111,854.

## The aggregation signer matches the finalization sender

The aggregation path's public key:

```text
ba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4
```

```bash
k -n lineth-l2 exec deploy/l2-users -- \
  cast keccak \
  0xba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4 \
  | awk '{print "0x" substr($0, length($0)-39)}'
```

```text
0x70997970c51812dc3a010c7d01b50e0d17dc79c8
```

An aggregation submission for L2 blocks 26125..26204:

```text
2026-10-14 07:13:43.390+0000
AggregationSubmitterImpl
submitted aggregation=[26125..26204]80
transactionHash=0x810d2c20768f8b9a688f8590623a0c310556781cf8de88671d0cb166c45803ca
nonce=308 gasPriceCaps=null
```

Its receipt:

```json
{
  "transactionHash": "0x810d2c20768f8b9a688f8590623a0c310556781cf8de88671d0cb166c45803ca",
  "blockNumber": "0x1bb5f",
  "status": "0x1",
  "from": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "to": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
  "gasUsed": "0x68653"
}
```

Same match. The transaction succeeded in L1 block 113,503 and emitted `DataFinalizedV3` for 26125..26204. The finalization transaction in the previous post, for 25805..25884, came from the same `0x7099…79c8`.

## One service, two accounts

| Path | Derived address | Receipt sender |
|---|---|---|
| Blob | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | Exact match |
| Aggregation | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | Exact match |

The Coordinator signs through one Web3Signer endpoint and picks a different identity per path. Each account has its own nonce sequence, so the blob nonces (304 in the previous post) and the aggregation nonces (308 here) count independently.

The chain of evidence:

```text
Coordinator configured to sign through Web3Signer over mTLS
    ↓
Each submission path selects a public key
    ↓
Each public key derives to an Ethereum address
    ↓
That address is the sender on the L1 receipt
```

The match proves which key signed each transaction. It doesn't say which software held the key; any holder of that key would produce the same sender.

In the series so far, the Coordinator builds the transaction, Web3Signer signs it, and the L1 receipts and events show what it did. The [next post](/posts/lineth-l2-following-a-message-to-a-successful-claim-on-l1/) goes back to the transaction from the first post and follows its message to a claim on L1.
