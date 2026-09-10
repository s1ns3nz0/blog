---
title: "EKS Security Controls Implemented in the Cluster Design"
description: "A technical overview of EKS security controls implemented across the cluster design."
pubDatetime: 2026-09-10T00:00:00+09:00
tags:
  - AWS
  - EKS
  - Kubernetes
  - Security
  - Hoodi
  - Validator
---

```text
Internet
   ✕ Public EKS API disabled
   ✕ Public node IPs disabled

Private VPC
   ├─ Private EKS API
   ├─ System node group
   │    └─ VPC endpoints: ECR, KMS, EKS auth, Logs, S3
   ├─ Hoodi consensus/execution node groups
   │    └─ Restricted NAT egress: HTTPS + required P2P ports
   ├─ Private GitOps/CD runner
   └─ Vault / validator namespaces
        └─ Default-deny NetworkPolicies + scoped identities
```

## Control Plane Access

| Control | Implementation | Security purpose |
|---|---|---|
| Private EKS endpoint | Private endpoint enabled. | Kubernetes API accepts traffic only through private network paths. |
| No public EKS endpoint | Public endpoint disabled. | Eliminates direct internet API access. |
| Private cluster security group | API ingress is limited to approved node and private-runner security groups. | Prevents arbitrary VPC resources from reaching the Kubernetes API. |
| Private operations path | SSM/private-runner architecture supports internal administration. | Avoids publicly exposed administrator access. |
| EKS API logging | API, audit, authenticator, controller manager, and scheduler logs enabled. | Records authentication and API mutation activity. |
| Log encryption and retention | KMS-backed CloudWatch logs retained for 365 days. | Protects audit data and supports investigation. |

### Important exception

```hcl
bootstrap_cluster_creator_admin_permissions = true
```

The initial creator has administrator access. This is useful for bootstrap but should not remain the ordinary administration model.

## Authentication and Authorization

| Control | Implementation | Security purpose |
|---|---|---|
| EKS access configuration | `authentication_mode = "API_AND_CONFIG_MAP"` | Supports EKS access entries and legacy `aws-auth` compatibility. |
| Dedicated access entries | Named EKS principals are created for private GitOps and bootstrap workflows. | Makes non-human cluster access explicit. |
| Namespace-scoped access | GitOps private runner uses `AmazonEKSViewPolicy` in `argocd` and `node-operator-dast`. | Prevents workload changes or unrelated namespace reads. |
| Kubernetes group binding | The runner uses a dedicated Kubernetes group for required custom-resource reads. | Avoids broad cluster privileges. |
| Dedicated service accounts | Validator client, signing fence, remote signer, database, Vault, and observability use separate identities. | Limits blast radius. |
| Disabled automatic token mounts | Sensitive workloads disable automatic service-account token mounts. | Reduces accidental Kubernetes API credential exposure. |

## Worker Node Security

| Control | Implementation | Security purpose |
|---|---|---|
| Private node IPs | Public IP assignment disabled. | Nodes are not directly internet-addressable. |
| IMDSv2 enforcement | `http_tokens = "required"` | Blocks IMDSv1 credential retrieval. |
| Metadata hop limit | `http_put_response_hop_limit = 1` | Reduces Pod-to-metadata credential theft paths. |
| Encrypted root volumes | EBS encryption uses the baseline KMS key. | Protects node-root data at rest. |
| Managed node groups | Separate managed system, consensus, and execution groups. | Supports controlled lifecycle management. |
| Controlled disruption | `max_unavailable = 1` | Limits simultaneous node loss during updates. |
| On-Demand capacity | `capacity_type = "ON_DEMAND"` | Avoids Spot interruption risk. |
| Node IAM role | Worker, ECR read-only, and CNI permissions are assigned. | Supports node operation without placing Vault/release permissions on every node. |

## Node Pool and Network Segmentation

| Node pool | Intended workload | Network model |
|---|---|---|
| System | Core EKS/platform services and internal dependencies. | Private VPC traffic plus S3 endpoint HTTPS; no general internet egress. |
| Consensus | Hoodi consensus clients. | Private VPC traffic plus limited HTTPS and consensus P2P ports through approved NAT. |
| Execution | Hoodi execution clients. | Private VPC traffic plus limited HTTPS and execution P2P ports through approved NAT. |

The system pool and Hoodi pools use different security groups. Blockchain peer-discovery requirements therefore do not automatically grant platform components internet egress.

### Hoodi egress rules

- TCP 443 for HTTPS
- TCP/UDP 30303 for execution P2P
- TCP/UDP 13000 for consensus P2P
- UDP 12000 for Prysm discovery
- TCP/UDP 9000 for consensus bootnodes

## VPC and AWS Service Access

| Control | Implementation | Security purpose |
|---|---|---|
| Deny-by-default VPC security group | Default security group has no ingress or egress. | Resources must explicitly opt into communication. |
| VPC interface endpoints | Private endpoints for EC2, ECR API, ECR Docker, EKS auth, KMS, and CloudWatch Logs. | Nodes reach AWS control services without broad internet routing. |
| S3 gateway endpoint | Private S3 service route. | Supports ECR image-layer download paths. |
| Endpoint security group | HTTPS only from approved node and runner security groups. | Prevents arbitrary VPC workloads from using sensitive endpoints. |
| VPC Flow Logs | All VPC traffic metadata is logged. | Supports network investigation and egress review. |
| No baseline public networking | No Internet Gateway, public subnet, or broad NAT is created by the baseline module. | Keeps default deployment exposure low. |

## Kubernetes Network Isolation

| Control | Implementation | Security purpose |
|---|---|---|
| VPC CNI enforcement | `enableNetworkPolicy = "true"` | Enables Kubernetes NetworkPolicy enforcement. |
| Default-deny policy | Ingress and egress default-deny policies use an empty Pod selector. | Every Pod needs explicit network allowances. |
| DNS exception | TCP/UDP 53 egress is allowed only to `kube-system`. | Enables service discovery without broad egress. |
| Remote-signer policy | Only signing-fence Pods may connect to the signer on port 9000. | Limits unauthorized signing requests. |
| Vault egress policy | Remote signer may contact Vault only on TCP 8200. | Prevents general Vault or internet reachability. |
| Namespace segmentation | Validator, Vault, node-operator, observability, and DAST components are separated. | Limits lateral movement between workload domains. |

## AWS Workload Identity

| Workload | Identity design | Allowed authority |
|---|---|---|
| EBS CSI controller | Dedicated EKS Pod Identity association. | EBS lifecycle and approved KMS operations. |
| Vault | Dedicated Pod Identity association. | Vault KMS operations only. |
| GitOps private CD runner | Dedicated CodeBuild IAM role and EKS access entry. | Read-only EKS and approved ECR/chart access. |
| GitHub mirror workflows | GitHub OIDC role per mirror purpose/environment. | Push to intended private ECR repositories. |
| Release workflow | GitHub OIDC role bound to release environment. | Scoped release artifact, KMS, and CodeBuild signer actions. |

## Secrets and Validator Protection

| Control | Implementation | Security purpose |
|---|---|---|
| Vault Kubernetes auth | Service account, namespace, and Vault audience are bound. | Limits token issuance to intended workloads. |
| Short-lived Vault tokens | Typical TTL is five minutes; maximum TTL is ten minutes. | Limits useful lifetime of stolen tokens. |
| No default Vault policy | `token_no_default_policy = true` | Prevents unplanned default capabilities. |
| Set-scoped secret paths | Secret paths include validator-set-specific segments. | Prevents cross-validator secret access. |
| Explicit Vault denies | Metadata, Transit, auth, and system paths are denied to signer identities. | Blocks listing and Vault administration. |
| TLS/mTLS signer path | Validator client uses client certificate, private key, and CA bundle. | Protects the signing channel. |
| Lease-based signing fence | Exact Lease holder, client Pod UID, and IP are validated. | Prevents duplicate or stale signing authority. |

## Workload Hardening

| Control | Implementation | Security purpose |
|---|---|---|
| Non-root execution | `runAsNonRoot: true` with explicit non-root IDs. | Reduces container privilege. |
| No privilege escalation | `allowPrivilegeEscalation: false` | Limits escalation through process privileges. |
| Dropped capabilities | `capabilities.drop: ["ALL"]` | Removes unnecessary kernel privileges. |
| Read-only root filesystem | `readOnlyRootFilesystem: true` | Makes persistence and tampering harder. |
| RuntimeDefault seccomp | `seccompProfile.type: RuntimeDefault` | Reduces risky system-call exposure. |
| Resource limits | CPU and memory requests/limits defined. | Reduces noisy-neighbor and exhaustion risks. |
| No host access | Baseline rejects host namespaces and hostPath volumes. | Limits direct host-compromise paths. |
| Private digest-only images | Baseline expects private ECR SHA-256 references. | Prevents mutable or unreviewed runtime images. |

## Supply Chain and Deployment Controls

| Control | Implementation | Security purpose |
|---|---|---|
| Private ECR repositories | Private copies of reviewed images and charts. | Removes runtime dependence on public registry pulls. |
| Immutable image tags | ECR tag mutability disabled. | Prevents post-approval tag replacement. |
| Digest verification | Mirror workflows compare source and ECR digests. | Confirms copied content matches reviewed source. |
| Pinned GitHub Actions | Actions use full commit SHAs. | Reduces action tag-replacement risk. |
| Trusted PR evidence gate | Trusted scanner/policy code is separate from PR checkout. | Prevents PRs weakening their own checks. |
| Policy-as-code | Rego/Conftest gates evaluate Terraform and manifests. | Rejects defined insecure configurations before promotion. |
| Release signing path | Bundle digest, provenance, SBOM, signature, and scan evidence are checked. | Binds releases to reviewed source and artifacts. |

## Monitoring, Audit, and Recovery

| Control | Implementation | Security purpose |
|---|---|---|
| EKS control-plane logs | API, audit, authenticator, scheduler, and controller logs. | Detects access and configuration activity. |
| VPC Flow Logs | All VPC traffic metadata logged. | Supports network investigation and egress review. |
| KMS-protected audit storage | Audit/control-plane log groups use a dedicated key. | Protects log confidentiality and integrity at rest. |
| Evidence retention | CI stores normalized non-secret policy evidence for 90 days. | Retains review evidence without retaining secret candidates/raw logs. |
| Retained stateful volumes | Stateful workload volumes are preserved across scale/delete events. | Supports recovery of expensive blockchain client state. |
| Temporary private operations host | Optional SSM-based private operations access. | Provides a controlled internal recovery path. |
