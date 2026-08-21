---
title: "Security Design Review: AWS EKS SaaS (8) - Evidence and Review"
description: Why an EKS SaaS requirement is a criterion rather than proof, and how the plugin ties NetworkPolicy, IRSA, and tenant-context requirements to evidence-based status.
pubDatetime: 2026-08-21T15:05:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
  - Kubernetes
featured: true
---

The EKS requirements describe properties that must hold. They do not prove that the cluster, workload, or AWS account currently satisfies those properties.

This stage connects each requirement to evidence from source, IaC, deployed Kubernetes state, AWS configuration, and behavioral tests.

## Table of contents

## Keep assurance states separate

```text
authored → trace-linked → semantically reviewed
         → implemented → evidenced → assessed
```

An authored requirement exists. A trace-linked requirement resolves its controls, threats, and blast-radius references. Implementation and evidence require inspection of the actual service or an approved test environment.

The plugin can define the verification contract and organize evidence requests. It must not mark an IRSA role, NetworkPolicy, or tenant route as implemented because a README says that it should exist.

## Evidence must match the pass condition

For `REQ-EKS-NETWORK-ISOLATION-01`, useful evidence includes the rendered NetworkPolicy objects, the deployed policies in each tenant namespace, and a test that attempts both an approved and an unapproved connection.

For `REQ-EKS-IRSA-SCOPE-01`, evidence must include the Pod and ServiceAccount, the role annotation, the OIDC trust policy, attached IAM policies, and an effective-permission test. A ServiceAccount annotation alone does not establish the resulting AWS authority.

For `REQ-EKS-TENANT-CONTEXT-01`, evidence includes application tests using forged and missing tenant claims, the deployed authentication configuration, and an observation that the protected DynamoDB operation is not executed after rejection.

## Intended, deployed, and behavioral evidence are different

```text
manifest or IaC
  → intended configuration

deployed Kubernetes and AWS state
  → current configuration

integration or runtime test
  → observed behavior
```

A plan that has not been applied is not proof of cluster state. A deployed policy without a negative test may still be bypassed through another role or route. Confidence increases when all three layers agree.

## Evidence status is explicit

```text
pass             evidence supports the property
conditional      property depends on an unresolved condition
fail             evidence contradicts the property
not_applicable   review establishes that it does not apply
undetermined     required evidence is unavailable
```

If the cluster API cannot be inspected, the result for an RBAC requirement is `undetermined`, not `pass`. If a ClusterRoleBinding visibly grants unrestricted access to tenant namespaces, the result is `fail`.

## Evidence becomes stale

A new controller version, changed ServiceAccount annotation, new Ingress object, modified IAM trust policy, or altered namespace label can invalidate earlier evidence. The requirement ID may remain stable, but the evidence must be recollected.

```text
June IRSA snapshot + July role-policy change
                    ↓
             June evidence is stale
```

The refresh process marks affected evidence for review instead of silently reusing it.

## Exceptions remain visible

```yaml
human:
  status: exception
  exception:
    approver: platform-owner
    reason: migration job temporarily accesses two tenant tables
    compensating_controls:
      - short-lived role session
      - approved maintenance window
    expires: 2026-12-31
```

An exception records the approver, accepted risk, compensating controls, and expiry. Removing the requirement would hide the risk and break the lifecycle history.

## Design and implementation reviews use the same contract

Design review asks how the platform will enforce default-deny networking, scoped IRSA, exact tenant routing, and restricted provisioning. Implementation review checks those same properties in the deployed cluster and AWS account.

The shared requirement ID keeps the design decision connected to the evidence and later reassessment.

## Output of the evidence stage

```yaml
- requirement_id: REQ-EKS-IRSA-SCOPE-01
  status: conditional
  evidence:
    - type: serviceaccount_manifest
      ref: artifacts/k8s/tenant-serviceaccount.yaml
    - type: iam_policy
      ref: artifacts/aws/tenant-role-policy.json
  gaps:
    - deployed_trust_policy_snapshot_missing
  next_review_trigger:
    - serviceaccount_annotation_changed
```

The record shows what supports the requirement, what is unknown, and which changes should trigger another review. It does not certify the EKS environment.
