---
title: "Security Design Review: AWS EKS SaaS (4) - Blast Radius"
description: Calculating blast radius across the AWS EKS SaaS reference architecture, from a contained siloed order table to a provisioning pipeline that can reach the whole account.
pubDatetime: 2026-08-20T15:38:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - EKS
  - SaaS
  - Plugin
  - Kubernetes
featured: true
---

The previous article identified threats in the EKS SaaS architecture. The next question is how far each threat could travel if the underlying failure occurred.

That question matters because a tenant application compromise, a shared ingress failure, and a provisioning-role compromise are not equivalent. All three may involve Kubernetes, but their reachable tenants, data, runtime resources, and recovery domains are very different.

The plugin therefore calculates blast radius separately from CIA impact and threat likelihood. CIA impact describes how harmful a loss would be. Blast radius describes the scope that a particular path can reach.

## Table of contents

## Blast radius is a graph problem

The EKS sample is represented as nodes and edges rather than a flat list of Kubernetes resources.

```text
tenant request
  → CloudFront and Route 53
  → NGINX Ingress
  → tenant namespace
  → ServiceAccount and IRSA role
  → DynamoDB table or pooled partition

provider operation
  → shared management service
  → CodePipeline / CodeBuild
  → EKS API
  → namespaces, ingress, and AWS resources
```

Each node represents a resource, trust boundary, data store, identity, or management capability. Each edge records a possible transition and its evidence. A discovered connection remains reviewable and carries a confidence value rather than being treated as proof simply because two resource names appear in the same file.

## The dimensions make scope deterministic

For every threat, the plugin follows reachable paths and records the broadest value for five dimensions.

```text
tenant_scope
  one | subset | all

data_scope
  record | tenant_dataset | shared_dataset | platform_dataset

runtime_scope
  pod | namespace | cluster | account | region

control_scope
  feature | tenant_operations | cluster_control | platform

recovery_scope
  local | tenant_recovery | cluster_recovery | platform_recovery | regional_recovery
```

The vocabulary is intentionally bounded. A value such as `subset` has a defined order and can be compared across threats. The model may explain the result in prose, but it does not invent a new severity adjective that changes meaning from one run to the next.

The output also includes a short summary for reviewers: `contained`, `tenant`, `cross_tenant`, `cluster`, or `account_region`. The detailed dimensions remain the source of truth.

## Example: pooled product-table access

T-06 concerns a product service that reaches a pooled DynamoDB table. The service is supposed to derive the tenant key from trusted identity context and enforce it through IAM conditions.

The path is:

```text
tenant user
  → product API
  → product Pod
  → tenant ServiceAccount
  → IRSA role
  → pooled product table
```

If the application accepts a forged tenant identifier or the IAM condition is missing, the path can reach records belonging to the tenants sharing that table.

```yaml
blast_radius:
  tenant_scope: subset
  data_scope: shared_dataset
  runtime_scope: namespace
  control_scope: feature
  recovery_scope: tenant_recovery
coarse_scope: cross_tenant
```

The result does not claim that all tenants are exposed. It says that the path is not contained within one tenant and should receive a high-priority negative authorization test.

## Example: a siloed order-table role

The order service uses a separate DynamoDB table per tenant. A compromise of one order Pod with a correctly scoped IRSA role is more contained.

```text
tenant order Pod
  → tenant ServiceAccount
  → tenant-specific IAM role
  → one tenant order table
```

The calculated result may be:

```yaml
blast_radius:
  tenant_scope: one
  data_scope: tenant_dataset
  runtime_scope: namespace
  control_scope: feature
  recovery_scope: tenant_recovery
coarse_scope: tenant
```

The silo does not eliminate risk. A wrong trust-policy condition, a shared deployment role, or an exposed Kubernetes API can widen the path beyond the table. The calculation reflects the reviewed path, not an assumption that "one table per tenant" is a complete security boundary.

## Example: a compromised NGINX Ingress controller

NGINX Ingress is shared across tenant namespaces. If its configuration or administrative endpoint is compromised, an attacker may alter routing rules for many tenants.

```text
Ingress controller
  → tenant-specific ingress objects
  → multiple tenant namespaces
  → product and order services
```

The result is broader than a single Pod:

```yaml
blast_radius:
  tenant_scope: subset
  data_scope: tenant_dataset
  runtime_scope: cluster
  control_scope: cluster_control
  recovery_scope: cluster_recovery
coarse_scope: cluster
```

If the controller also has access to shared services or sensitive Kubernetes secrets, the data scope may increase. The graph forces those connections to be reviewed rather than assuming that an ingress component only handles HTTP routing.

## Example: a provisioning pipeline compromise

T-08 concerns CodePipeline and CodeBuild, which create namespaces, apply Kubernetes manifests, and deploy tenant microservices. A role or build input that can escape its intended tenant scope may reach the EKS API and shared AWS resources.

```text
CodeBuild role
  → build commands and kubectl
  → EKS API
  → namespaces, ingress, service accounts, and controllers
  → tenant workloads and AWS IAM mappings
```

The result is platform-wide when the role can modify shared objects or create arbitrary service-account bindings.

```yaml
blast_radius:
  tenant_scope: all
  data_scope: platform_dataset
  runtime_scope: cluster
  control_scope: platform
  recovery_scope: platform_recovery
coarse_scope: cluster
```

If the AWS role can also modify the EKS cluster, IAM policies, or account-level infrastructure, the runtime and coarse scope may reach `account_region`. This is why deployment permissions are prioritized above a contained tenant feature even when both map to least-privilege controls.

## Example: the tenant-management service

Tenant management stores the mapping between tenant names, domains, Cognito configuration, namespaces, and deployment data. A compromise of this service can affect authentication and routing without directly reading every tenant table.

```text
tenant-management service
  → tenant metadata table
  → Cognito and routing configuration
  → ingress and provisioning workflows
```

Its data scope may be `platform_dataset`, while its runtime scope is shared-service or cluster. The control scope is `tenant_operations` or `platform` because it can alter how multiple tenant requests are interpreted.

This example demonstrates why blast radius is not just a count of records. A small mapping table can have a broad control and recovery scope because many downstream decisions depend on it.

## Confidence and review are part of the calculation

The plugin distinguishes evidence-backed relationships from inferred ones.

```text
confirmed
  Directly supported by manifests, IaC, application code, or reviewed configuration

inferred
  Derived from a discovered connection or architecture assumption

unknown
  The available material cannot establish the scope
```

An unknown dimension creates a review task and a conservative priority floor. It does not mean that the final business impact is automatically High. It means that the owner must resolve the missing relationship before accepting the risk.

For example, an IRSA annotation may be visible while the role trust policy is unavailable. The graph can record a possible cloud-identity edge with `confidence: inferred`, but it must not present the effective AWS permissions as confirmed.

## The result feeds requirement priority

Blast radius remains attached to the requirement that addresses the threat.

```yaml
- id: REQ-EKS-IRSA-SCOPE-01
  managed:
    statement: >-
      A tenant workload may assume only the AWS role and actions approved
      for that tenant service and namespace.
    threat_refs: [T-05]
    blast_radius_refs: [T-05]
    priority: high
    priority_reasons:
      - cross_tenant_scope
      - cloud_identity_boundary
      - review_required
```

The requirement author can now explain why the check is urgent. It protects a cloud identity boundary whose compromise could move from one Pod to multiple tenants or the AWS account.

## What this stage produces

The EKS blast-radius result preserves the detailed dimensions, affected assets, confidence, and review work.

```yaml
threat_id: T-08
coarse_scope: cluster
blast_radius:
  tenant_scope: all
  data_scope: platform_dataset
  runtime_scope: cluster
  control_scope: platform
  recovery_scope: platform_recovery
confidence: inferred
review_required: true
affected_assets:
  - id: eks-api
    responsibility: shared
  - id: codebuild-provisioner
    responsibility: team
```

This output does not claim that the sample is currently exploitable. It shows how far a reviewed or hypothesized failure path could travel and which assumptions still need evidence.

The next stage will use these results to assign responsibility and priority. AWS, the platform team, the application team, and the SaaS operator may own different parts of the same control, especially where Kubernetes identity crosses into AWS IAM.
