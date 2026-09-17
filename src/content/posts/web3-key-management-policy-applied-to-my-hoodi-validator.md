---
title: "Where the Web3 Key Management Policy Is Already Implemented in My Hoodi Validator"
description: "Mapping specific clauses of the Web3 Cryptographic Key Management Policy against the Vault-based secret design already running in my Hoodi validator, and being honest about the gaps."
pubDatetime: 2026-09-17T11:00:00+09:00
tags:
  - Key Management
  - Vault
  - Hoodi
  - Validator
  - Secrets Management
  - PostgreSQL
  - Compliance
---

The [Web3 Cryptographic Key Management Policy](https://github.com/s1ns3nz0/kms-policy) was written after I had already built the Vault-based secret design for my Hoodi validator. That order matters here: this isn't a policy I'm designing infrastructure to satisfy, it's a policy I'm checking existing infrastructure against. Some of it lines up cleanly. Some of it doesn't, and I'd rather say so than round up.

This is a control-by-control comparison against what I described in [Vault Secret Management for Hoodi Validator](/posts/vault-secret-management-for-hoodi-validator/).

## Non-exportable Critical secret material (Section 9)

Section 9 requires that "Critical secret material, including Critical seeds, HD roots, private keys, and reconstructable shares, shall be non-exportable by default," protected by "approved hardware, threshold, or equivalent mechanisms."

In the running design, the validator keystore and its unlock password are delivered to the Web3Signer pod through Vault Agent's init-only injection (`agent-pre-populate-only: "true"`). Web3Signer loads the keystore, unlocks it, and signs locally. The private key is never returned across the signing API to Prysm Validator. That's the "signing keys stay in the signer" property, and it satisfies the non-exportability requirement in practice, though not through an HSM: the protection boundary is Vault plus the signer process, not dedicated signing hardware.

## Fail-closed signing (Section 10)

Section 10 requires that "a signer shall fail closed and shall not generate a signature when required authorization or transaction-policy controls do not succeed."

The signing fence in front of Web3Signer implements this at the transport level. It's a TLS passthrough proxy whose authority comes from a Kubernetes Lease; when that lease is lost, the design closes the listener and active connections rather than leaving the signing path open by default. It can't retract a request Web3Signer already accepted, which is exactly why it's described as complementary to, not a replacement for, persistent slashing protection.

## Exactly-once signing safety (Section 17.3)

This is the closest match in the whole policy. Section 17.3 requires that slashing-protection or equivalent safety state be "durable, integrity-protected, and monotonic," and that "a replacement signer shall not activate until the required safety state has been verified and transferred."

The deployment stores slashing-protection history in PostgreSQL, separately from the Vault-held keystore and password. As I wrote in the Vault post: "Recovering the password does not recover the history. A replacement signer with the correct key and password still needs the correct slashing-protection database state." That's the policy's exactly-once requirement, stated independently before I mapped it back to Section 17.3.

## Separate keys for separate purposes (Section 9 and 17.1)

Section 9 requires separate keys for separate security purposes; Section 17.1 requires validator, withdrawal, and recovery authority to be separately governed.

The design keeps at least three distinct secret groups: the Engine API JWT (execution-consensus authentication, shared only between Nethermind and Prysm Beacon), the client and server TLS material protecting the signing connection, and the validator keystore and password used only inside Web3Signer. Each has its own Vault path and its own blast radius. Withdrawal credentials are called out explicitly as "separately controlled and not ordinary runtime inputs to the validator client or signer in this design," which matches Section 17.1's requirement that withdrawal authority not be reachable through the same path as signing authority.

## Least-privilege separation of update paths (Section 5 and 10)

Section 5 requires that Critical-key administrators not hold overlapping approval paths for the same action; Section 10 requires access to be least-privileged and attributable.

The Vault policy design gives narrower scope to whoever rotates the signer and client TLS records than to whoever could touch the validator keystore, its password, or the slashing-database credential; the latter are explicitly excluded from that narrower grant. That's a real, if partial, instance of separation of duties: it stops routine certificate maintenance from becoming an implicit path to validator custody, even though it isn't yet the fully independent dual-control approval Section 5 describes for Critical-key actions.

## Where this isn't implemented yet

Being accurate here means listing what the Vault design doesn't cover, because the policy asks for more than a secrets store:

- **No formal Key Owner or Security Approval Authority role.** Section 5 requires named, accountable ownership per keying-material set. The current design has technical separation (different Vault paths, different policies) but no documented owner sign-off tied to those paths.
- **No documented exception process.** Section 16 requires every deviation from the policy to be logged with justification, compensating controls, and an expiry date. Nothing in the current deployment produces that record.
- **No recorded generation ceremony.** Section 8 requires generation and derivation to happen through "an approved CSPRNG or RBG" within a documented, approved procedure. The keystore's origin is not evidenced anywhere in the infrastructure I've described publicly.
- **No inventory record in the Section 6 sense.** Vault paths function as a de facto inventory, but there's no separate record capturing classification, cryptoperiod, or aggregate-authority relationships the way Section 6 and 17.2 require.

## The honest summary

The parts of the policy that map onto transport security, fail-closed behavior, and slashing-protection durability were already true of the running validator before the policy existed, because those properties came from following Web3Signer and Vault documentation directly. The parts that map onto governance, i.e. named ownership, exception tracking, generation evidence, are not yet true, because governance was never something the infrastructure itself could produce. That gap is the actual argument for writing the policy and eventually representing it in OSCAL: it turns "I did this correctly" into something that can be checked against a written requirement instead of taken on my word.

## References

- [kms-policy repository](https://github.com/s1ns3nz0/kms-policy)
- [Vault Secret Management for Hoodi Validator](/posts/vault-secret-management-for-hoodi-validator/)
- [Consensys: Web3Signer slashing protection](https://docs.web3signer.consensys.io/concepts/slashing-protection)
