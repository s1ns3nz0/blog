---
title: "Security Design Review: AWS EKS SaaS (5) - Responsibility and Prioritization"
description: Splitting EKS SaaS work across AWS, the platform team, product teams, and the SaaS operator, and why IRSA and shared controllers need more than one owner.
pubDatetime: 2026-08-20T15:58:00+09:00
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

The first four articles built the EKS SaaS service profile, calculated its impact, modeled threats, and measured their blast radius. The next step is to turn those results into work that has an owner and an implementation order.

This stage is important because EKS security is split across several teams. AWS operates parts of the managed service. A platform team configures the cluster and its controllers. Product teams own application behavior and data access. SaaS operators manage tenants and provider workflows.

A control that is relevant to the service may therefore have more than one responsible party. The plugin records that split instead of labeling the whole control as inherited or team-owned.

## Table of contents

## Responsibility is resolved at the most specific level

The plugin uses the most specific evidence available when assigning ownership.

```text
EKS or service-specific mapping
          ↓ if absent
Kubernetes deployment-model mapping
          ↓ if absent
control-specific default
          ↓ if absent
control-family default
```

The mapping distinguishes four categories. `team` means the product or platform team implements the control. `shared` means AWS provides part of the mechanism while the customer configures or operates the rest. `org` covers governance, personnel, and organization-wide processes. `csp_claimed` records a provider responsibility that must be supported by current AWS assurance evidence.

This vocabulary avoids a common error in cloud reviews. EKS may provide a managed control plane, but it does not decide which Kubernetes groups may access the API, which ServiceAccount may assume an IAM role, or whether one tenant may reach another tenant's data.

## The EKS control plane has a different owner from the tenant application

Cluster API access, admission controls, node configuration, add-ons, NGINX Ingress, External DNS, and network policies are usually platform responsibilities. The product team should not be expected to repair a cluster-wide controller, but it must provide workload requirements that the platform can enforce.

Tenant application teams own authorization logic, tenant-context validation, data-access conditions, container dependencies, and service-level logging. The SaaS operator owns tenant onboarding policy, provider-admin workflows, and decisions about which operator may create, modify, or delete tenant resources.

Some controls are shared across all three groups. For example, AWS provides IAM evaluation and EKS identity integration. The platform team configures IRSA and cluster access. The product team defines the actions and resources its workload needs. The operator decides whether a tenant-specific role is permitted to perform a requested business operation.

## Tenant isolation requirements are high priority

The product service's pooled DynamoDB path and the shared ingress path both have cross-tenant blast radius. Requirements protecting them are prioritized above controls whose effects remain within one Pod or one tenant table.

The application team must derive tenant context from a trusted identity and enforce it before the data operation. The platform team must ensure that namespace, network, and ingress policy do not create a competing route around that check.

The negative test is jointly owned. The product team verifies that a forged, missing, or conflicting tenant identifier is rejected. The platform team verifies that the request cannot bypass the intended ingress and namespace boundary through an alternate service path.

## IRSA responsibility is shared across boundaries

The ServiceAccount-to-IAM-role relationship illustrates why a single owner is insufficient.

AWS provides the IAM and EKS mechanisms. The platform team creates the trust policy, OIDC provider configuration, and ServiceAccount binding. The product team declares the minimum AWS actions and resources required by the workload. The service owner confirms whether those resources are tenant-specific or shared.

If any one of these decisions is missing, the resulting permission may be broader than intended. A product team can write a narrow policy that is attached to the wrong role. A platform team can create a correct binding for a role that already has excessive permissions.

The requirement therefore names all relevant evidence: Pod, ServiceAccount, annotation, trust policy, attached policy, and effective resource scope.

## Shared controllers require platform ownership

NGINX Ingress, External DNS, admission components, and other cluster-wide controllers can affect multiple tenants. The platform team owns their deployment, administrative endpoints, permissions, upgrade process, and configuration review.

AWS may provide the underlying cluster operation, but it does not own the controller configuration installed by the customer. A provider assurance report cannot prove that an NGINX administrative endpoint is restricted or that an ingress rule cannot route to another namespace.

Because these components have `runtime_scope: cluster` and `control_scope: cluster_control`, a controller compromise or misconfiguration receives a high priority even if no individual tenant record is directly exposed in the initial path.

## Provisioning roles connect operations to platform risk

Registration, CodePipeline, CodeBuild, and tenant management collectively create tenant environments. The SaaS operator owns who may initiate the operation. The platform team owns the pipeline and Kubernetes permissions. The organization may own approval, separation-of-duties, and access-review processes.

The pipeline's AWS role and Kubernetes identity must be limited to the resources and namespaces required for the approved onboarding step. Tenant-supplied parameters cannot be allowed to select arbitrary namespaces, service accounts, images, or cluster-wide objects.

These requirements are high priority because the blast-radius graph reaches `tenant_scope: all` and `control_scope: platform` when the pipeline can modify shared objects or create unrestricted bindings.

## Provider administration is not ordinary tenant administration

The provider administration application has authority over tenant policies and settings. Its identity pool is separate from tenant users, but that separation does not define the full authorization model.

The SaaS operator must distinguish read-only support, tenant-scoped administration, and platform-wide actions. The product and platform teams must enforce those distinctions in APIs, service policies, and Kubernetes or AWS operations.

Platform-wide actions should require stronger approval and auditability. A tenant administrator should not be able to invoke the same endpoint simply because both users have valid Cognito tokens.

## Priority is derived from scope and evidence

The plugin records the reasons behind a priority rather than relying on a single severity adjective.

```yaml
priority: high
priority_reasons:
  - cross_tenant_scope
  - cluster_control
  - cloud_identity_boundary
  - threat_linked
review_required: true
```

An item is normally raised when it protects a shared boundary, reaches the EKS API, controls cloud identity, affects platform recovery, or is linked to a confirmed threat. An unknown relationship creates a review task and a conservative priority floor, but it is not treated as proof that the final risk is High.

This produces an explainable work queue. Two requirements may both relate to least privilege, while the IRSA role for a tenant workload is prioritized differently from a read-only service account because their reachable data and control scopes differ.

## Example: a responsibility-aware requirement

The tenant workload role can be represented as a requirement with multiple responsibility parts.

```yaml
- id: REQ-EKS-IRSA-SCOPE-01
  managed:
    statement: >-
      A tenant workload may assume only the AWS role and actions approved
      for its ServiceAccount, namespace, and tenant data boundary.
    threat_refs: [T-05, T-06]
    blast_radius_refs: [T-05, T-06]
    responsibility: shared
    csp_part: IAM and EKS identity enforcement
    platform_part: ServiceAccount, trust policy, and namespace binding
    team_part: minimum actions and approved data resources
    priority: high
    verification:
      method: effective_identity_policy_review
```

The requirement remains one security property, but the implementation work is distributed. This is more useful than assigning the whole item to "AWS" or "developers" and leaving the boundary between the roles unreviewed.

## What this stage produces

The output is an owned and prioritized work list containing control references, threat references, blast-radius references, responsibility parts, verification expectations, and unresolved decisions.

```yaml
work_item:
  service: aws-eks-saas-reference-architecture
  id: REQ-EKS-INGRESS-TENANT-ROUTING-01
  responsibility: platform
  threat_refs: [T-03]
  blast_radius_refs: [T-03]
  priority: high
  priority_reasons:
    - cross_tenant_scope
    - cluster_control
  review_required: true
```

At this point, the work has an owner and an order, but it is not yet the final requirement document. The next stage will write the work items as atomic, verifiable requirements and validate that every control, threat, and blast-radius reference resolves correctly.
