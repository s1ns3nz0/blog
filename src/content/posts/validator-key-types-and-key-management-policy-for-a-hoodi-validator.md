---
title: "Validator Key Types and Key Management Policy for a Hoodi Validator"
description: "The key types, classification model, and Web3-specific principles from the Web3 Cryptographic Key Management Policy that apply directly to a node validator."
pubDatetime: 2026-09-17T10:00:00+09:00
tags:
  - Key Management
  - Validator
  - Hoodi
  - Ethereum
  - Vault
  - PKI
  - Security
---

Most of the [Web3 Cryptographic Key Management Policy](https://github.com/s1ns3nz0/kms-policy) is organization-wide: inventory, classification, access control, and lifecycle apply to every key the Company holds. A smaller part of it is written specifically for validator and on-chain authority. This post pulls out that part: which key types a node validator involves, how the policy classifies them, and the six Web3-specific principles in Section 17 that govern them.

## The key types in scope

Section 2 lists what counts as in-scope keying material. The subset relevant to a validator deployment is:

- Validator signing keys
- Withdrawal credentials
- Transaction and treasury keys
- Governance and smart-contract authorities
- HD wallet roots, seeds, and mnemonics, and the private keys derived from them
- Encrypted keystores
- Threshold or MPC shares
- Remote-signer credentials
- Service credentials used to reach key-management services

Section 3 adds a specific definition for this category: **Web3 keying material** means "blockchain account keys, validator signing keys, withdrawal credentials, treasury keys, contract deployer keys, smart-contract upgrade or governance authority, and related recovery material." The policy treats this as one family of material with shared handling requirements, not a collection of unrelated secrets.

## Classification: impact tier is separate from authority type

Section 7 defines three impact tiers, Critical, High, and Standard, based on what compromise would cost: asset exposure, protocol control, consensus participation, recoverability, or organizational trust.

A validator signing key is a clean example of why the policy insists on keeping impact classification separate from authority type. Section 7 states this directly: "The Company shall distinguish impact classification from authority type. Authority types include validator, asset-control, protocol-control, application-security, infrastructure-security, and recovery authority." A public validator identity or a withdrawal address is public information, but Section 7 also notes that "a public key, address, certificate, trust anchor, or verification record may still be Critical or High when its integrity, binding, or authority relationship is material." Publishing a value doesn't make it low impact if forging or misbinding it can redirect validator authority.

## Inventory fields specific to Web3 material

Section 6 requires every inventory record to carry the standard fields (owner, classification, algorithm, cryptoperiod, protection boundary), but it adds one clause specifically for this material:

> "For Web3 material, the network, protocol role, public identifier, wallet or authority relationship, and relevant signing or recovery dependency."

It also requires the inventory to "represent aggregate authority" by tracking relationships "among seeds, HD roots, derived keys, addresses, controlled assets, validator identities, contract roles, recovery arrangements, and signing authorities." A single seed can reach many validators and many withdrawal addresses; the inventory is required to say so, not just list each derived key as if it stood alone.

## Section 17: the six Web3-specific principles

Section 17 is where the policy stops generalizing from NIST key management guidance and states protocol-specific requirements outright. It opens with a scope note: these controls are "not represented as direct NIST requirements unless separately mapped as such."

**17.1 Authority separation.** Validator signing, withdrawal, treasury, transaction, contract deployment, contract upgrade, governance, and recovery authority must be separately inventoried, classified, and governed. A shared design (one key backing more than one of these) requires a documented risk assessment, and shared material "shall not silently expand authorization beyond its documented aggregate authority."

**17.2 Aggregate authority and wallet governance.** The Company has to assess what related material can reach in total, not evaluate each key in isolation. This is the inventory requirement above, restated as a governance obligation: an HD root's risk is the sum of everything it can derive.

**17.3 Validator safety.** This is the section most specific to running a validator: signing authority must be bound to its network, validator identity, and signing domain, and where a protocol penalizes conflicting signatures, "the Company shall permit only one active signing authority for a validator and network" unless an equivalent exactly-once design is in place. Slashing-protection state has to be "durable, integrity-protected, and monotonic," and a replacement signer cannot activate until that state has been verified and transferred. If any of that is uncertain, the required behavior is to fail closed and escalate.

**17.4 Protocol and asset-control authority.** Treasury, withdrawal, governance, and contract-upgrade authorities need transaction authorization controls sized to their classification, and the destination of any authority transfer has to be validated before the transfer completes.

**17.5 Threshold, MPC, multisig, and remote signing.** These mechanisms have to be documented down to custody, quorum, and independent trust domains, and the policy is explicit that they "shall not be treated as interchangeable or as substitutes for accountable governance and transaction authorization." A shared root administrator or recovery path can't quietly defeat the quorum they're supposed to enforce.

**17.6 Protocol-mandated cryptography and lifecycle.** Where a protocol dictates an algorithm, key format, or signing convention, that's documented as an interoperability constraint with its own migration and exit plan, since it can't simply be swapped out the way an internal cryptographic choice could.

## Why this is a separate section at all

Sections 6 through 16 of the policy could apply to any organization managing cryptographic keys. Section 17 exists because a validator's failure modes don't look like a typical enterprise key compromise: a validator with a duplicated signing key gets slashed, not just breached, and a compromised withdrawal credential moves staked assets on-chain with no notice period. The rest of this series, particularly the post on what actually got implemented, follows this section specifically.

## References

- [kms-policy repository](https://github.com/s1ns3nz0/kms-policy)
- [Vault Secret Management for Hoodi Validator](/posts/vault-secret-management-for-hoodi-validator/)
