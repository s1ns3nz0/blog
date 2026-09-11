---
title: "Hoodi Node Validator AWS Architecture Overview"
description: "An overview of the private AWS infrastructure supporting Hoodi execution and consensus workloads on Amazon EKS."
pubDatetime: 2026-09-11T00:00:00+09:00
tags:
  - Hoodi
  - Validator
  - AWS
  - Architecture
draft: false
---

![AWS infrastructure overview](/images/hoodi-node-validator-aws-architecture-overview.png)

This architecture supports Ethereum Hoodi execution and consensus workloads in a private Amazon EKS environment. It separates delivery, runtime compute, operator access, persistent data, and audit evidence into distinct AWS boundaries.

The diagram is an architectural overview. It shows the intended relationships between components and does not claim that every optional component is continuously running.

## Design Goals

The infrastructure is designed around three goals: keeping the Kubernetes control plane private, isolating validator-related workloads from ordinary platform services, and making operational activity traceable.

The system supports active validator sessions without requiring all expensive compute to run at all times. The system node group remains available for platform services, while validator node groups can be scaled when needed.

Security boundaries are applied at several levels: AWS identity, VPC networking, security groups, Kubernetes namespaces and policies, encrypted storage, and audit logging.

## AWS Account and Regional Layout

The primary environment is located in the Seoul Region, `ap-northeast-2`. The AWS account boundary contains the VPC, EKS cluster, container registry, logging services, storage, and operational tooling.

A secondary Region holds a replica of selected audit records. This provides a regional recovery copy without making the secondary Region an active validator environment.

According to AWS security best practices, I would normally design this architecture around a multi-account model. In that model, logging and audit resources should operate in a separate account within the same AWS Organization. However, I did not implement this control because this is a small portfolio project intended to demonstrate both my blockchain workload and AWS security design experience.

The architecture is intentionally private-first. Public-facing application load balancers and a public Kubernetes API are outside the intended design.

## Network Model

The Amazon VPC is the main network boundary for workload traffic. Kubernetes worker nodes run in private subnets and do not receive public IP addresses.

The EKS API endpoint permits private access only. A user on the public internet cannot directly run `kubectl` commands against the cluster.

The default VPC security group is configured as deny-all. Each service must use a dedicated security group and receive an explicit rule for required communication.

The diagram includes a NAT gateway and internet gateway to explain validator peer connectivity. The baseline infrastructure does not create public networking; it relies on an already approved NAT path for the dedicated Hoodi node pools.

## Restricted Outbound Connectivity

System workloads have no broad internet-egress rule. Their AWS service traffic stays within the VPC where private endpoints are available.

Execution and consensus clients require a limited exception because Ethereum peers are dynamic and cannot be represented by a stable IP allow-list.

Their dedicated node groups can use the approved NAT route for HTTPS and the specific TCP and UDP ports needed for execution and consensus peer communication.

This exception is isolated from the system node group. VPC Flow Logs capture accepted and rejected network flows, making outbound activity reviewable.

## Amazon EKS and Managed Compute

Amazon EKS provides the managed Kubernetes control plane. AWS operates the control-plane infrastructure, while the project operates workloads and managed EC2 node groups inside the VPC.

The cluster collects control-plane API, audit, authentication, controller-manager, and scheduler logs. Those logs are retained in CloudWatch for operational review.

The cluster uses three managed node groups:

| Node group | Main role | Typical state |
| --- | --- | --- |
| System | GitOps, Vault, observability, platform services | Kept available |
| Execution | Nethermind execution-client workload | Scaled for a session |
| Consensus | Prysm consensus-client workload | Scaled for a session |

The system pool uses a smaller instance class than the execution pool. Execution nodes require more capacity because they maintain execution-chain data and process execution workloads.

The execution and consensus pools can remain at zero when idle. This stops their EC2 compute cost while preserving the surrounding platform, network controls, and retained persistent volumes.

## Container Delivery and Deployment

GitHub Actions is the external CI/CD initiator. It authenticates to AWS through IAM and STS, which grant short-lived, scoped AWS access.

GitHub Actions pushes private images to Amazon ECR. EKS nodes then retrieve approved images from the private registry.

GitHub Actions can also trigger AWS CodeBuild. CodeBuild performs controlled release or deployment work and can produce release outputs in Amazon S3.

The final workload deployment inside the cluster is governed by GitOps. Argo CD reads reviewed workload definitions from its separate GitOps source and synchronizes them to the private EKS cluster.

This separates build-time automation from cluster reconciliation. A successful build alone does not mean a workload has been accepted or is healthy in Kubernetes.

## Private AWS Service Access

VPC endpoints provide private paths to selected AWS services. They reduce the need to route platform traffic through the public internet.

Private access is especially useful for ECR, S3, KMS, EC2, EKS authentication, and Systems Manager-related services.

ECR image layers are backed by S3. The node security groups explicitly allow HTTPS traffic to the AWS-managed S3 prefix list so that private image pulls can succeed.

This design makes image delivery a controlled AWS-internal path, while reserving NAT-based internet egress for the validator clients that require peer communication.

## Storage and Encryption

Amazon EBS provides persistent volumes for Kubernetes workloads. This is important for blockchain-client data, which must survive Pod restarts and node replacement.

Worker-node root volumes and EBS-backed Kubernetes volumes are encrypted. The instance metadata service requires IMDSv2 tokens, which reduces exposure to metadata-service credential attacks.

AWS KMS manages encryption keys for AWS service data such as EBS volumes, audit logs, and CloudWatch log groups.

KMS protects AWS-managed storage encryption. Application-level credentials and signing materials follow their own workload-level controls and are not represented as ordinary Kubernetes configuration.

## Operator Access Through Systems Manager

The operator access path is intentionally indirect:

```text
Operator → AWS Systems Manager → EC2 operations host → private EKS API
```

The operations host is a private EC2 instance without inbound public access. It uses AWS Systems Manager Session Manager rather than SSH exposed to the internet.

The host is allowed to reach private SSM endpoints over HTTPS. It is separately allowed to reach the private EKS API over HTTPS.

This produces a controlled administration path for maintenance windows. The host can be created for an operation and removed after the operation ends.

The access path also avoids distributing a broadly reachable Kubernetes administration endpoint. Operator sessions can be correlated with AWS audit records and Systems Manager activity.

## Internal Load Balancing

The internal Network Load Balancer supports private service connectivity inside the VPC. It is not a public entry point for validator or Kubernetes management traffic.

Its role is to provide stable private routing where a service needs a load-balanced endpoint. It remains inside the private network boundary.

## Observability and Evidence

CloudWatch is the main operational logging and monitoring destination. It receives EKS control-plane logs, VPC Flow Logs, and service telemetry.

CloudTrail records AWS API actions. It answers questions such as who changed a resource, which AWS API was called, and when the call occurred.

AWS Config records configuration history. It helps show how a resource changed over time and whether its current configuration matches required expectations.

These services complement one another:

| Service | Primary question answered |
| --- | --- |
| CloudWatch | What is the system doing now? |
| CloudTrail | Who performed an AWS action? |
| AWS Config | How did the configuration change? |
| VPC Flow Logs | What network traffic was accepted or rejected? |

## Audit Storage and Replication

Audit evidence is stored in private Amazon S3 buckets. The storage controls include blocked public access, ownership enforcement, encryption, versioning, lifecycle policies, and server-access logging.

S3 stores records such as audit data, validator-audit material, and snapshot-related access logs. Lifecycle rules control retention and storage-class transitions.

Selected S3 access logs replicate one way from Seoul to Tokyo. The destination preserves the same object keys and serves as a disaster-recovery copy.

The replication path is intentionally one-way. It does not create a bidirectional loop, and it does not replicate deletions by default.

## Terraform State and Infrastructure Control

Terraform state is stored remotely in Amazon S3 with DynamoDB used for state locking. This prevents local state files from becoming the source of truth for shared infrastructure.

Remote state helps prevent concurrent infrastructure changes from conflicting. It also keeps the deployment process consistent across approved operator environments.

Infrastructure controls are separated from workload delivery. Terraform establishes AWS foundations, while Argo CD reconciles Kubernetes applications.

## A Typical Validator Session

A normal session begins with the system pool available and the execution and consensus pools idle or scaled down.

An operator uses the Systems Manager path to reach the private cluster. The validator node groups are then scaled up for the session.

Kubernetes schedules the execution and consensus workloads onto their dedicated nodes. The clients retrieve approved images, attach their persistent volumes, and establish their allowed peer connections.

During operation, CloudWatch, CloudTrail, AWS Config, VPC Flow Logs, and S3-backed audit storage collect evidence across different layers of the environment.

At the end of the session, client workloads are scaled down before the dedicated worker pools are returned to zero. Persistent volumes and platform services remain available for a later restart.

## Overall Security Posture

The architecture does not rely on a single control. It combines private networking, limited egress, scoped AWS roles, temporary operator access, persistent-data encryption, GitOps deployment controls, and independent audit records.

The most important separation is between always-on platform services and validator client compute. The platform remains private and stable, while the validator pools receive only the additional connectivity needed to participate in Ethereum peer networks.

This keeps the validator environment operationally practical without turning the whole Kubernetes platform into an internet-facing system.
