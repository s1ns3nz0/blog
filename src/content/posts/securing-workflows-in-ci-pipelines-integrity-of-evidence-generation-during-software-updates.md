---
title: Securing Workflows in CI Pipelines - Integrity of Evidence Generation During Software Updates
description: How to ensure the integrity of evidence generation during software updates
pubDatetime: 2026-07-26T08:36:22+09:00
tags:
  - NIST SP 800-204D
  - CI/CD
  - CI/CD Security
  - GitHub Action
  - Supply Chain Security
featured: true
---

## Table of contents

## Overview
### Main Idea: Even if the process of creating and signing evidence is itself under attack, design the system so that an attacker cannot erase the update history or make a forged updated appear legitimate
- The software update process is typically carried out by a special class of software development tool called software update systems.
- Ensuring the security of these software update systems plays a critical role in the overall security of an SSC
- Threats to software update systems primarily target the evidence generation process so as to erase the trail of updates and prevent the ability to determine whether the updates were legitimate or not
- There are several types of software update systems
	+ Package managers that are responsible for all of the software installed on a system
	+ Application updaters that are only responsible for individual installed applications
	+ Software library managers that install software that adds functionality, such as plugins or programming language libraries
- The primary task performed by a software update system is to identify the files that are needed for a given update ticket and download trusted files.
- At first glance, it may appear that the only checks needed to establish trust in downloaded files are the various integrity and authenticity checks performed by verifying the signatatures on the metadata associated with individual files or the package.
- However, the very process of signature generation may be vulnerable to known attacks, so software update systems require many other security measures related to signature generation and verification
- The evolving framework for providing security for software update systems has incorporated many of these required security measures into specification and prescribed some others for future specifications.
- A framework is a set of libraries, file formats, and utilities that can be used to secure new and existing software update systems. 
- The framework should protect the signing operation by requiring the policy defined in Sec. 5.1.1 to be satisfied prior to performing the signing operation. The following are some of the consensus goals for the framework:
	+ The framework should provide protection against all known attacks on the tasks performed by the software update system, such as metadata(hash) generation, the signing process, the management of signing keys, the integrity of the authority performing the signing, key validation, and signature verification.
	+ The framework should provide a means to minimize the impacts of key compromise by supporting roles with multiple keys and threshold or quorum trust (with the exception of minimally trusted roles desinged to use a single key). The compromise of roles that use highly-vulnerable keys should not be used for any role that clients ultimately trust for files they may install. When keys are online, exceptional care should be taken in caring for them, such as storing them in a Hardware Security Module(HSM) and only allowing their use if the artifacts being signed pass the policy defined in Sec. 5.1.1.
	+ The framework must be flexible enough to meet the needs of a wide variety of software update systems.
	+ The framework must be easy to integrate with software update systems.
## TUF(The Update Framework)
### Overview
- TUF was launched almost a decade ago as a way to build system resilience against key compromises and other attacks that can spread malware or compromise a a repository.
- The primary goals behind its design are:
	+ To provide a framework(a set of libraries, file formats, and utilities) that can be used to secure new and existingn software update systems
	+ To provide the means to minimize the impact of key compromises
	+ To be flexible enough to meet the needs of a wide variety of software update systems.
	+ To be easy to integrate with existing software update systems.
- [TUF docs](https://theupdateframework.io/docs/overview/)
### Roles and Metadata
- [Roles and Metadata docs](https://theupdateframework.io/docs/metadata/)
- The concept of roles allows TUF to only trust information provided by the correctly designated party.
- [Root Metadata(root.json)](https://raw.githubusercontent.com/theupdateframework/tuf/develop/tests/repository_data/repository/metadata/root.json)
	+ Specifies the other top-level roles
- [Targets Metadata(targets.json)](https://raw.githubusercontent.com/theupdateframework/tuf/develop/tests/repository_data/repository/metadata/targets.json)
	+ Target files are the actual files that clients want to download, such as the software updates they are trying to obtain. The targets.json metadata file lists hashes and sizes of target files.
- [Delegated Targets Metadata(role1.json)](https://raw.githubusercontent.com/theupdateframework/tuf/develop/tests/repository_data/repository/metadata/role1.json)
	+ When the Targets role delegates trust to other roles, each delegated role will provide one signed metadata file. As is the case with the directory structure of top-level metadata, the delegated files are relative to the base URL of metadata available from a given repository mirror.
- [Snapshot Metadata(snapshot.json)](https://raw.githubusercontent.com/theupdateframework/tuf/develop/tests/repository_data/repository/metadata/snapshot.json)
	+ The snapshot.json metadata file lists version numbers and/or hashes of all of the targets metadata files. This file ensures that clients will see a consistent view of all files on the repository. 
- [Timestamp Metadata(timestamp.json)](https://raw.githubusercontent.com/theupdateframework/tuf/develop/tests/repository_data/repository/metadata/timestamp.json)
	+ The timestamp.json metadata file lists the hashes and size of the snapshot.json file.
	+  This is the first and potentially only file that needs to be downloaded when clients search for updates. 
### Role-Key Mapping
- Ensure that a single signing key is not allocated to all tasks
```
Root role
├─ offline key A
├─ offline key B
└─ offline key C
   threshold: 2 of 3

Targets role
├─ release approver key A
├─ release approver key B
└─ release approver key C
   threshold: 2 of 3

Snapshot role
└─ controlled automation key

Timestamp role
└─ short-lived online automation key
```
- Keep the root private key and other infrequently used keys — as opposed to frequently used keys such as the timestamp key — offline or in highly protected environments.
- When you use online keys:
	+ HSM or Cloud KMS
	+ Short-lived workload identity
	+ Possible for specific workflow
### Required Workflow
```
Build workflow
↓
Generate the artifact, SBOM, and provenance
↓
Policy workflow
↓
OPA evaluates test results, vulnerability findings, environment evidence, and approval evidence
↓
Approval through a protected signing environment
↓
Signing using an HSM/KMS or GitHub OIDC-based identity
↓
Generate TUF targets metadata
↓
Threshold approval
↓
Publish snapshot and timestamp metadata
↓
Store evidence in immutable storage
```
#### Workflow Principles
- Seperate `Build` and `Signing`([Artifact attestations](https://docs.github.com/en/enterprise-cloud@latest/actions/concepts/security/artifact-attestations?utm_source=chatgpt.com))
- Verify Policy before signing([Using artifact attestations and reusable workflows to achieve SLSA v1 Build Level 3](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/increase-security-rating?utm_source=chatgpt.com)
- Allowed signing job
## What to be signed
- Artifact: artifact SHA-256, SBOM digest, Provenance digest, Environment attestation digest, Policy result digest, Update metadata digest
- Connect all digests to single release manifest rather than sign individual files

## Preventing Evidence Deletion and Tampering
### Ensure to store attestation securly
#### Github Attestations
- Using GitHub Attestations API: Atteststations incorporated with GitHub repository is stored so that can be retrieved by REST API, Recorded in the seperate public immutable transparency log
#### Sigstore Bundle
- `actions/attest` provide attestation bundle directory path as output
#### Download Attestation Bundle
- [Verifying attestations offline](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/verify-attestations-offline?utm_source=chatgpt.com)
### Files saved in Immutable Storage
```
evidence/
└── example-payment-service/
    └── sha256-<artifact-digest>/
        ├── artifact/
        │   └── application.tar.gz
        ├── digests/
        │   ├── artifact.sha256
        │   ├── sbom.sha256
        │   └── environment-predicate.sha256
        ├── attestations/
        │   ├── provenance.sigstore.json
        │   ├── environment.sigstore.json
        │   └── sbom.sigstore.json
        ├── metadata/
        │   ├── build-manifest.json
        │   ├── environment-predicate.json
        │   └── release-manifest.json
        ├── policy/
        │   ├── build-policy-result.json
        │   └── promotion-policy-result.json
        ├── approvals/
        │   └── release-approval.json
        └── verification/
            ├── provenance-verification.json
            ├── environment-verification.json
            └── verification-record.json
```
- GitHub Action artifact repositories and logs are only stored 90 ~ 400 days
- Leverage external WORM storage such as AWS S3 Object Lock, Azure Immutable Blob Storage, GCS Bucket Lock
	+ Requirements
		* Object versioning
		* WORM or Object Lock
		* Lock retention period
		* KMS encryption
		* Seperate writer and deleter
		* Retention change by MFA or quorum
		* Cross-Origin Replication
		* Access Log activation
		* Artifact Digest based path
	+ Allocate permissions depending on the roles
		+ CI evidence writer
		+ Auditor
		+ Retention Administrator
- Re-verify after upload
```
Generate the artifact
↓
Calculate the artifact’s SHA-256 digest
↓
Generate provenance, SBOM, and environment attestations
↓
Store the attestations in the GitHub Attestations API
↓
Download the attestation bundles
↓
Create an evidence package for each artifact digest
↓
Upload the evidence package to WORM/Object Lock storage
↓
Recalculate and verify the digest of the uploaded object
↓
Record the storage receipt
↓
During promotion, verify the artifact, attestations, and storage evidence
```





