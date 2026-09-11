---
title: "Kubernetes Namespace Design for a Hoodi Validator"
description: "A security-focused guide to designing Kubernetes namespace boundaries for a Hoodi validator architecture."
pubDatetime: 2026-09-11T00:00:00+09:00
tags:
  - Kubernetes
  - EKS
  - Hoodi
  - Validator
  - Security Design
---

## The Core Principle

**Design Kubernetes namespaces around ownership, trust, and operational lifecycle.**

The practical test is:

> Does this namespace allow us to assign a distinct owner, permission set, security policy, resource budget, or lifecycle?

A namespace groups resources that should be administered under a common set of permissions and policies. It provides a scope for controls; creating a namespace does not automatically isolate its workloads. [Kubernetes: Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)

Your architecture applies this principle by separating blockchain-node operation, validator signing, observability, and Vault administration. The following examples describe the declared configuration, including templates that require activation.

## 1. Group Resources With Common Ownership

Resources managed under the same operational responsibility often belong together. This makes deployment permissions, troubleshooting responsibilities, and resource budgets easier to assign.

A namespace should answer: **Who is responsible for these workloads, and who may change them?**

### Application to This Architecture

`node-operator` groups Nethermind and Prysm Beacon. They jointly maintain the Ethereum node, so their synchronization, compatibility, availability, and maintenance are closely related.

`validator-operations` groups Prysm Validator, Signing Fence, Web3Signer, and the slashing database. These components collectively perform signing and protect signing history. Their operation requires different authority from maintaining a synchronized node.

`validator-observability` and `vault` establish separate scopes for logging infrastructure and secret-management infrastructure.

These boundaries support distinct ownership, but namespace names do not assign permissions. Human operators and deployment automation need RBAC bindings that reflect the intended division of responsibility. The inspected workload permissions do not establish the complete administrator permission model. [Kubernetes: RBAC Good Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)

## 2. Separate Different Trust and Privilege Requirements

Workloads with materially different access requirements often deserve separate namespaces.

An internet-connected node client, a sensitive signing service, and a collector that reads host files have different security requirements. Separate namespaces allow administrators to apply different RBAC permissions, Pod Security levels, and network policies. [Kubernetes: Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)

### Application to This Architecture

The execution and consensus clients communicate with external peers. Validator signing components hold more sensitive authority and follow a narrower application path. Separating them allows the administrator to restrict access to signing infrastructure without preventing node synchronization.

Both `node-operator` and `validator-operations` declare restricted Pod Security. The node-specific admission policy adds requirements such as non-root execution, read-only root filesystems, digest-pinned images, and prohibition of host-path mounts.

The observability collector needs a read-only host-log mount. Its namespace therefore permits a different privilege profile. This concentrates the exception in an identifiable administrative scope.

Vault occupies another platform boundary because permission to operate an application should not automatically grant permission to administer its secret-management service.

These separations reduce exposure only when the associated controls enforce them. Namespaces still share cluster infrastructure and should not be treated as equivalent to separate clusters for mutually untrusted workloads. [Kubernetes: Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)

## 3. Align Resources With Their Lifecycle

Group resources that are provisioned, maintained, and retired together. Separate them when their approval requirements, recovery procedures, or maintenance schedules differ.

Namespace deletion also affects the resources contained within it, making lifecycle boundaries an administrative concern.

### Application to This Architecture

The node clients use StatefulSets and persistent storage because Pod replacement should not require discarding their blockchain data. Their operation includes synchronization, client upgrades, and storage maintenance.

The signing system has a different lifecycle. Its base configuration establishes boundary resources and contracts, while signing workloads require a separately rendered runtime release. Zero-replica templates separate preparation from activation.

Web3Signer and the slashing database share a namespace because their recovery procedures are closely coupled. Restoring the signer safely depends on preserving appropriate signing history.

Storage retention supports this lifecycle but does not replace recovery planning. The declared storage configuration uses retention settings, while backups and restore validation remain separate responsibilities. Kubernetes distinguishes StatefulSet storage identity from the provisioning and retention behavior of its storage resources. [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/), [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)

## 4. Make Communication Explicit

Namespace boundaries do not block network traffic by default. Use NetworkPolicy to define permitted communication across—and within—those boundaries.

For sensitive domains, a common approach is default-deny followed by explicit allowances for application traffic and dependencies such as DNS. Enforcement requires a compatible network implementation. [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

### Application to This Architecture

The node, validator, and observability namespaces declare default-deny ingress and egress policies. Additional rules permit their operational dependencies.

The application communication design includes:

| Connection | Purpose |
|---|---|
| Prysm Beacon → Nethermind | Engine API operations |
| Prysm Validator → Prysm Beacon | Validator duties and Beacon API interaction |
| Prysm Validator → Signing Fence → Web3Signer | Controlled signing requests |
| Web3Signer → slashing database | Check and record signing history |
| Log collector → approved infrastructure endpoints | Metadata access and log forwarding |

The validator-to-beacon policy combines a namespace selector with a workload selector. It identifies the intended application in the intended namespace, rather than permitting access to every Pod there.

The Fence adds another control: it forwards the existing TLS connection only while its Lease authority remains valid. Its Kubernetes permissions are scoped to a named Lease and client Pod.

Two qualifications matter. First, node-client internet egress is restricted by port rather than by trusted destination identity. Second, some base validator policies select components without distinguishing validator sets. Because NetworkPolicy permissions are additive, broader rules must be considered when evaluating isolation between multiple sets. [Kubernetes: NetworkPolicy behavior](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## 5. Establish Independent Resource Budgets

Namespaces provide a scope for aggregate resource quotas. Administrators can budget CPU, memory, storage consumption, and object counts by application, team, or environment.

Per-container limits constrain individual workloads; namespace quotas constrain their combined consumption. [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

### Application to This Architecture

The workload definitions declare CPU and memory requests and limits. The node admission baseline also requires those declarations.

However, no ResourceQuota or LimitRange objects were found in the inspected deployment manifests. The architecture therefore demonstrates workload-level resource controls, but not established namespace-wide budgets.

Separate namespaces provide useful places to add those budgets:

- `node-operator`: capacity for synchronization and blockchain storage.
- `validator-operations`: capacity for signing services and the slashing database.
- `validator-observability`: limits on collector growth and buffering.
- `vault`: capacity managed according to its platform deployment requirements.

Quotas would limit aggregate consumption, but would not reserve dedicated nodes or guarantee application availability. Resource budgeting must remain consistent with scheduling capacity and workload requirements.

## 6. Keep the Number of Boundaries Meaningful

A separate namespace is useful when it creates a meaningful difference in ownership, permissions, security policy, resource budget, or lifecycle.

There is no requirement to create one namespace per Pod, Deployment, or microservice. Excessive subdivision can add policy and operational complexity without providing useful isolation.

### Application to This Architecture

Keeping Nethermind and Prysm Beacon together is reasonable because they share the responsibility of operating the node. Their specific access to one another can still be constrained inside that namespace.

Keeping the validator client, Fence, signer, and slashing database together reflects their shared signing workflow. Internal policies and workload identities provide finer-grained controls within that domain.

Separating observability is justified by its host access. Separating Vault is justified by its platform authority.

The decision may change as the platform grows. If validator sets belong to different operators, require independent deployment authority, or must be isolated from one another, separate namespaces may become appropriate. Additional labels alone would not establish those administrative boundaries.

In this architecture, the four existing domains have identifiable reasons for separation. The administrator’s task is to ensure that effective permissions and policies preserve those reasons. [Kubernetes: Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
