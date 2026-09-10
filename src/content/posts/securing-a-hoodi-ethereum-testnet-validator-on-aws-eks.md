---
title: "Private EKS Security Design Review"
description: "A confidentiality-focused security design review of a private EKS environment."
pubDatetime: 2026-09-10T00:00:00+09:00
tags:
  - Ethereum
  - Hoodi
  - AWS
  - EKS
  - Kubernetes
  - CIA
  - Defense-In-Depth
  - Security
---

## EKS Security Controls Through the CIA Model

I applied security controls across multiple layers: the Kubernetes API, worker nodes, workloads, IAM identities, secrets, container images, networking, and operational access. I began by analyzing system components through the CIA model. Here is a brief introduction to the security concepts I used.

### Defense in Depth

Defense in depth is a security principle that applies multiple security controls across multiple layers.

### CIA Model

The CIA model is a simple way to ask three questions about every system component:

- **Confidentiality:** Can an unauthorized person access sensitive data or credentials?
- **Integrity:** Can an unauthorized person alter the system, its data, or its behavior?
- **Availability:** Can legitimate users and workloads continue using the system when needed?

#### Confidentiality

Consider EKS from this perspective: Can an unauthorized identity or principal access organizational data? If a component is compromised, what data can it access?

- Who can reach the Kubernetes API?
- Can nodes or pods be reached from the internet?
- Can a compromised pod steal cloud credentials?
- Who can read Kubernetes secrets, operational secrets stored in a secrets vault, or logs?
- Does network access expose data to unnecessary systems?

A strong EKS confidentiality design includes:

1. No public API endpoint unless there is a compelling business reason.
2. No public IP addresses for worker nodes.
3. Separate IAM roles for distinct functions.
4. Secrets delivered only to the minimum required workloads.
5. Network routes that allow only required destinations.
6. Encryption for persistent data and sensitive logs.

##### Confidentiality Control Overview

| Control | How It Protects Confidentiality |
| --- | --- |
| Private EKS API endpoint | Prevents direct public internet access to the Kubernetes API. |
| Private subnets and no public node IPs | Reduces exposure of worker nodes and workloads to unsolicited inbound traffic. |
| Security group segmentation | Separates control-plane, system-node, and Hoodi-node traffic paths. |
| Restricted node egress | System nodes can access private VPC services and S3 endpoints, while only Hoodi nodes receive limited P2P and HTTPS egress. |
| VPC endpoints | Allow nodes to reach ECR, KMS, EKS authentication, and logging services without broad internet access. |
| IAM role separation and Pod Identity | Prevent node, EBS CSI, Vault, GitOps, and release workloads from sharing a broad AWS identity. |
| IMDSv2 with a hop limit of 1 | Helps prevent workload-level access to node IAM credentials through metadata service abuse. |
| KMS encryption | Encrypts EBS node volumes and audit and control-plane logs. |
| Vault path-scoped policies | Limit validator components to their designated runtime-secret paths and deny access to Vault administrative paths. |
| Kubernetes NetworkPolicies | Restrict workload-to-workload access, such as allowing validator signing traffic only through designated components. |

#### Integrity

Consider the following questions: Who can modify the environment, and how? How can you demonstrate that your tracking evidence is valid?

- Who can change Kubernetes resources?
- Who can change Terraform, IAM policies, or security groups?
- Can an attacker deploy an unreviewed image?
- Can a compromised CI workflow modify production infrastructure?
- Can workloads impersonate one another or bypass signing restrictions?
- Can auditors trust the logs and deployment evidence?

A strong EKS integrity design answers the following questions:

1. Is every production change reviewed and traceable?
2. Does every deployment use an immutable artifact?
3. Can CI operate only within its intended cloud permissions?
4. Can workload identities modify resources beyond their intended tasks?
5. Can stale or duplicated stateful workloads cause conflicting actions?
6. Can the team reconstruct who changed the cluster and when?

##### Integrity Control Overview

| Control | What It Prevents | Why It Matters |
| --- | --- | --- |
| Terraform-managed EKS configuration | Ad hoc, undocumented infrastructure changes. | Infrastructure changes become reviewable as code. |
| EKS access entries | Unclear or unmanaged Kubernetes access. | IAM principals can receive explicit, scoped cluster access. |
| Namespace-scoped `ViewPolicy` | GitOps verification tooling from changing workloads or reading all namespaces. | The private runner can inspect only approved namespaces. |
| Immutable ECR repositories | Replacement of an already approved artifact under the same tag. | A deployment should reference the exact image that was reviewed. |
| Digest-pinned images | Workloads silently receiving changed image content. | An image digest identifies immutable content. |
| Trusted CI control plane | Pull request code replacing scanner rules or policy logic. | Pull request source is treated as data rather than trusted control code. |
| Policy checks | Unsafe Terraform, mutable images, privileged Pods, or risky workflows reaching promotion. | Static checks detect deterministic policy violations before deployment. |
| OIDC-bound AWS roles | Another GitHub repository or environment assuming a cloud role. | OIDC claims bind AWS authority to the intended repository and environment. |
| Validator signing fence | Two validator clients signing concurrently. | Duplicate signing can cause slashing or operational corruption. |
| Lease-based authority | A stale or replaced Pod continuing to sign. | The fence closes connections when Lease authority is lost. |
| EKS control-plane audit logs | Undetected Kubernetes API mutations. | Logs support accountability and incident investigation. |

#### Availability

Consider the following questions: What situations can occur in the environment? Can legitimate users and workloads remain available in those situations?

A strong EKS availability design answers the following questions:

- Can operators still access the cluster during an incident?
- Can workloads pull images and access required cloud services?
- Can a workload failure exhaust shared cluster capacity?
- Can updates drain too many nodes at once?
- What happens if private DNS, VPC endpoints, IAM, or SSM fail?
- Is critical state retained during replacement or recovery?

##### Availability Control Overview

| Control | What It Protects Against | Why It Matters |
| --- | --- | --- |
| Separate system, consensus, and execution node groups | A single workload category consuming all capacity. | Platform services can remain available if blockchain clients are overloaded. |
| Managed node groups | Manual node-lifecycle errors. | EKS integrates node replacement and updates with the control plane. |
| `max_unavailable = 1` | Too many nodes becoming unavailable during an update. | Stateful node workloads are less likely to be disrupted simultaneously. |
| On-Demand capacity | Spot Instance termination. | Stateful blockchain workloads may require stable capacity. |
| Retained PVCs | Loss of persistent client data during rescheduling or scaling changes. | Execution and consensus clients may retain large, expensive-to-rebuild state. |
| Private VPC endpoints | Loss of access to ECR, KMS, logs, or EKS-related AWS services when public egress is unavailable. | Private nodes still need AWS services to start and operate. |
| System-node restricted egress | A compromised or misbehaving platform component creating broad outbound dependencies. | Limits the attack surface, but requires correct endpoint configuration. |
| Control-plane logs and VPC Flow Logs | Slow diagnosis of node, API, or network failures. | Observability reduces recovery time. |
| Default-deny NetworkPolicies | Lateral traffic overload or accidental dependencies. | Explicit dependency paths are easier to test and operate. |
