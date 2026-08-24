---
title: "Security Design Review: AWS EKS SaaS (7) - Refresh and Lifecycle"
description: Refreshing the EKS SaaS security contract as ingress, cluster topology, and IAM bindings change, without losing prior approvals, evidence, or requirement history.
pubDatetime: 2026-08-21T15:00:00+09:00
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

The EKS SaaS security contract is useful only while it describes the current cluster, tenant model, and operating context. Kubernetes manifests, IAM bindings, ingress controllers, isolation tiers, and provisioning workflows can change without changing the product's visible features.

This stage compares the current service with the previously reviewed profile and requirements. It produces a visible delta instead of replacing the old contract with an unrelated generated document.

## Table of contents

## Changes that trigger a refresh

Moving from namespace-per-tenant to separate clusters changes the runtime boundary. Replacing NGINX Ingress changes the routing and controller trust boundary. Adding a ClusterRoleBinding, an admission controller, or a new IRSA role changes the possible path from a workload to the Kubernetes API or AWS account.

Changes outside Kubernetes also matter. A new Cognito flow, a new external integration, a different DynamoDB partitioning model, a broader CodeBuild role, or a changed RTO can alter the impact, threat model, or blast radius.

The plugin compares repository evidence with the stored profile and asks the owner only about decisions that code cannot establish.

```text
current manifests, IaC, and operating context
                    +
published profile, requirements, and review decisions
                    ↓
               explicit delta
                    ↓
          recalculated security contract
```

## Show profile changes before recalculating requirements

An illustrative profile delta might look like this:

```diff
tenant_model:
-  namespace_per_tenant
+  mixed_namespace_and_cluster_tiers

ingress:
-  nginx
+  aws_load_balancer_controller

data_partitioning:
  product: pooled_with_tenant_key
+ external_integrations:
+  - analytics_provider

availability:
  rto: rto_hours
+ amplifiers: [contractual_sla, revenue_direct]
```

Each change has a downstream effect. A new controller adds a cluster-wide trust boundary. A new analytics provider creates a data-flow and retention question. A different isolation tier changes tenant and runtime scope even if the application code is unchanged.

## Previous approval is bound to the profile digest

The plugin binds profile approval to a digest of the reviewed inputs. When the digest changes, the earlier approval is not silently reused.

```text
approved profile digest ≠ current profile digest
                         ↓
              previous approval invalidated
                         ↓
       impact, threats, and affected requirements reviewed
```

This prevents a new ClusterRoleBinding or a broader pipeline permission from continuing under an approval granted for a different service. A repository field containing `confirmed` is not accepted as proof of owner approval because repository content is untrusted input.

## Recalculate impact even when the baseline is unchanged

The system may remain Moderate after a change, while the requirement set changes substantially. Adding user attributes can activate privacy requirements. Adding an external data processor can create retention and transfer requirements. Adding a second cluster can change recovery and operational controls.

The NIST baseline is only the starting control set. Kubernetes deployment shape, cloud identity, data flows, privacy triggers, and recovery commitments add requirements around it.

## Update threats and blast radius incrementally

Existing threat IDs remain stable. New ingress, identity, admission, supply-chain, or recovery threats are added without renumbering historical findings.

The blast-radius graph is recalculated for changed paths. A tenant workload that previously reached one namespace may now reach a shared controller. A new cluster tier may contain one path while a shared provisioning role still reaches every tenant.

Resolved threats remain with resolution evidence. Replaced requirements use lifecycle links such as `superseded_by`; they are not deleted from history.

## Requirement lifecycle states

```text
added       new architecture or obligation creates a requirement
proposed    existing requirement meaning changed and needs approval
unchanged   current evidence still matches the property
superseded  a reviewed requirement was replaced by another ID
retired     the protected capability no longer exists, with evidence
```

Exceptions and evidence are carried forward only when the changed architecture still supports them. A policy snapshot for an old ServiceAccount becomes stale after its IAM annotation or trust policy changes.

## Output of the refresh stage

```yaml
refresh:
  previous_profile_digest: sha256:...
  current_profile_digest: sha256:...
  approval_required: true
changes:
  - type: proposed
    requirement_id: REQ-EKS-INGRESS-TENANT-ROUTING-01
  - type: added
    requirement_id: REQ-EKS-ANALYTICS-RETENTION-01
  - type: evidence_stale
    requirement_id: REQ-EKS-IRSA-SCOPE-01
```

The output records what changed and which decisions must be revisited. It does not claim that the new EKS design is compliant or secure until the updated requirements and evidence are reviewed.
