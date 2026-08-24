---
title: "Security Design Review: AWS EKS SaaS (9) - CI/CD Verification"
description: Gating EKS SaaS deployments on requirement IDs, from rendering Helm and Kustomize manifests to running tenant-boundary tests across Cognito pools.
pubDatetime: 2026-08-21T15:10:00+09:00
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

The previous stage connected EKS requirements to implementation and operational evidence. This stage brings the repeatable checks into CI/CD so that a changed manifest, IAM policy, image, or provisioning script is reviewed before it changes the cluster.

The pipeline is not a complete compliance assessor. It is a set of deterministic gates and review handoffs tied to requirement IDs.

## Table of contents

## The pipeline evaluates affected requirements

```text
pull request or deployment change
          ↓
affected requirement IDs
          ↓
manifest, policy, image, and behavior checks
          ↓
pass | fail | review_required
          ↓
deployment decision and evidence artifact
```

This is more useful than storing one scanner score. A new ClusterRoleBinding can be connected to `REQ-EKS-PROVISIONER-SCOPE-01`; a changed tenant route can be connected to `REQ-EKS-INGRESS-TENANT-ROUTING-01`.

## Validate the requirement contract first

The pipeline verifies that control IDs exist in the bundled catalog and that threat and blast-radius references resolve to the reviewed EKS models. It checks unique IDs, required fields, profile digest, catalog version, and supported verification methods.

An invented control identifier or stale threat reference fails the build. The security decision cannot be accepted when its traceability is broken.

## Inspect Kubernetes and IAM changes

The pipeline renders Helm, Kustomize, or raw manifests before inspection. It checks changes to Namespace, ServiceAccount, Role, ClusterRoleBinding, NetworkPolicy, Ingress, admission configuration, and workload security context.

The effective review must include cloud identity. A ServiceAccount annotation is compared with the IAM trust policy, attached permissions, and approved tenant resources. A new wildcard action or a binding that reaches every namespace creates a high-priority failure or review gate.

## Run tenant-boundary tests

Static checks cannot prove that tenant routing and data access behave correctly. The pipeline should run tests in an isolated environment using identities from different tenants.

The tests submit a forged tenant path, a missing tenant claim, a token from the wrong Cognito pool, and a request for another tenant's product or order. They also attempt an unapproved Pod-to-Pod connection and an operation outside the ServiceAccount's AWS data scope.

The expected result is explicit denial before the protected service or data operation is reached.

## Verify image provenance and deployment scope

The EKS workload must be built from reviewed source and deployed by immutable image digest. The pipeline records the digest, scan result, source revision, and registry origin.

Provisioning jobs receive an additional check. Their AWS and Kubernetes identities must be limited to the approved tenant namespace and resource set. A buildspec that accepts an arbitrary namespace or image reference is not safe merely because the job runs inside CodeBuild.

## Distinguish blocking failures from review work

```text
fail
  Deterministic evidence contradicts the requirement.

review_required
  The change affects a requirement but automation cannot decide it.

pass
  Checks support the property and no required evidence is missing.
```

An unrestricted ClusterRoleBinding can fail the build. A new external integration may create `review_required` because privacy, retention, and data-flow decisions need an owner.

## Publish the deployment result

```yaml
deployment_review:
  requirement_set: eks-saas-v1.2
  source_revision: 4f8c...
  image_digest: sha256:...
  checks:
    - requirement_id: REQ-EKS-TENANT-CONTEXT-01
      status: pass
      evidence: artifacts/tests/cross-tenant-denial.xml
    - requirement_id: REQ-EKS-PROVISIONER-SCOPE-01
      status: review_required
      reason: new ClusterRoleBinding
  decision: review_required
```

The result preserves the requirement IDs, profile version, manifest revision, and image digest used for the deployment decision. A later reviewer can reconstruct what was checked.

## What automation can and cannot prove

CI/CD can validate references, render manifests, inspect RBAC and IAM, run tenant-boundary tests, verify image provenance, and detect changes that widen the blast radius.

It cannot prove legal compliance, establish that an organizational access review is effective, or demonstrate a complete disaster recovery exercise without additional evidence. Those items remain accountable review work.

The outcome is a controlled path from the EKS security contract to deployment, not a claim that a green pipeline makes the service secure by itself.
