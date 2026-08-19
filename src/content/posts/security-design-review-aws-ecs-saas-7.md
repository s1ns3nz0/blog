---
title: "Security Design Review: AWS ECS SaaS (7) - Refresh and Lifecycle"
description: Refreshing the ECS SaaS security contract as isolation tiers, tenant data, and integrations change, without losing approvals, evidence, or requirement history.
pubDatetime: 2026-08-19T09:45:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
featured: true
---

The previous article published a validated security contract for the ECS SaaS service. That contract is useful only while it remains connected to the service that it describes.

ECS task definitions, IAM policies, tenant-isolation settings, deployment workflows, data stores, and recovery objectives can all change. A new requirement set must therefore be derived as a controlled update, not generated as an unrelated replacement document.

## Table of contents

## Refreshing means comparing two service states

The plugin compares the current repository and operating context with the previously approved profile and requirement set.

```text
current repository and operating context
                    +
published profile, requirements, and decisions
                    ↓
             explicit change set
                    ↓
          recalculated and reviewed contract
```

The comparison starts with facts that can be discovered from code, infrastructure, and configuration. It then asks for confirmation only where the change depends on a business or operating decision that the repository cannot establish.

This prevents every refresh from repeating the entire service interview while still preventing silent assumptions from carrying forward.

## Changes that matter in the ECS SaaS architecture

Adding a Cognito authorizer to tenant routes changes the trust boundary. Moving from Basic to Premium isolation changes the runtime and data scope of some paths. Replacing a shared DynamoDB table with tenant-specific tables changes the graph and the verification targets.

Adding a new platform operator workflow can be even more significant than adding a user-facing endpoint. A new operation that creates, updates, or deletes tenant infrastructure changes the control-plane threat model and may introduce a new account-wide path.

The plugin also watches for changes outside application code. A broader CodeBuild role, a new CloudFormation custom resource, a new EventBridge rule, a changed log destination, or a new external integration can widen the blast radius without changing the frontend or ECS task image.

## The profile delta is shown before requirements change

The refresh output makes the cause of a new requirement visible.

```diff
 isolation_tier:
-  basic
+  premium

 data_types:
   - basic_contact
   - transaction_history
+  - identity_attributes

 external_integrations:
+  - analytics-provider
    data_sent: [tenant_identifier, device_identifier]

 availability:
   rto: rto_hours
   rpo: rpo_zero
+  amplifiers: [revenue_direct, contractual_sla]
```

Each changed field has a downstream consequence. A new identity attribute can increase confidentiality and privacy scope. An analytics flow introduces a new trust boundary and retention question. A contractual SLA strengthens the availability requirements even if the ECS deployment remains unchanged.

Showing the delta lets the service owner review the reason for the change rather than approving only an opaque list of newly generated requirements.

## Approval belongs to the exact profile

The plugin binds approval to a digest of the profile and relevant decision inputs. When the digest changes, the earlier approval no longer applies automatically.

```text
approved profile digest
          ≠
current profile digest
          ↓
old approval invalidated
          ↓
impact, baseline, and affected requirements reviewed again
```

This matters for changes that look operational. If an ECS service moves from shared to dedicated infrastructure, the owner still needs to confirm whether the intended isolation tier, recovery model, and tenant commitments have changed.

A repository field that says `confirmed` is not accepted as proof of approval. The repository is an input to the review and could contain copied or fabricated values. Approval must come from plugin-owned review state that matches the current profile digest.

## Recalculate impact even when the baseline name stays the same

An architecture change may leave the system impact at Moderate while changing the actual requirements substantially.

For example, adding customer identity attributes may keep the overall CIA result at Moderate, but it can activate privacy controls and new deletion requirements. Adding a revenue SLA may keep the same security baseline while increasing the priority of recovery, monitoring, and dependency-failure requirements.

The baseline selects a starting control set. Data types, privacy triggers, external flows, isolation tier, and operational commitments add context around that set. An unchanged `NIST-800-53B-Moderate` label therefore does not mean that the old requirement list is still complete.

## Update the threat and blast-radius models incrementally

Existing threat IDs remain stable when the service changes. The plugin adds new nodes, edges, trust boundaries, and threats without renumbering the historical model.

Suppose the platform adds an analytics provider and an asynchronous tenant-deletion worker. The updated model may introduce a provider boundary, a message replay threat, and a deletion-retention threat. Existing tenant authorization threats remain active unless evidence shows that they were resolved.

The blast-radius graph is recalculated for the changed paths. A new deployment role may turn a previously contained path into `tenant_scope: all` and `control_scope: platform`. A Premium tenant stack may narrow one runtime path while leaving the shared provisioning role unchanged.

If a threat is resolved, its record remains with resolution evidence. If a requirement is replaced, the lifecycle records `superseded_by` rather than deleting the old ID. The history must explain why an item disappeared from the active work set.

## Classify requirement changes instead of overwriting them

The refresh process assigns a lifecycle state to each changed requirement.

```text
added       new service behavior creates a new obligation
proposed    existing obligation changes and needs review
unchanged   current evidence still matches the requirement
superseded  a reviewed requirement is replaced by another ID
retired     the protected capability no longer exists, with evidence
```

An existing requirement should not be silently edited in place when its meaning changes. For example, a requirement for a shared DynamoDB table should not be rewritten to describe tenant-specific tables while preserving the old review history. The change should show the old and new properties and identify the decision that caused the transition.

## Preserve exceptions and evidence across refreshes

A temporary exception remains attached to the requirement until it expires or is closed. A refresh may invalidate its compensating controls if the affected IAM role, route, or recovery path changes.

Evidence also has a lifecycle. A prior IAM policy snapshot becomes stale after a role-policy change. A test proving tenant isolation against a Basic service cannot automatically prove the same property after a routing or isolation-tier change.

The plugin carries forward the evidence references for unchanged requirements and marks affected evidence for recollection. This avoids both extremes: discarding useful history on every run and treating old evidence as proof of the current deployment.

## What this stage produces

The result is a reviewable delta and an updated requirement contract.

```yaml
refresh:
  previous_profile_digest: sha256:...
  current_profile_digest: sha256:...
  approval_required: true
changes:
  - type: added
    requirement_id: REQ-ANALYTICS-RETENTION-01
  - type: proposed
    requirement_id: REQ-PLATFORM-ROLE-SCOPE-01
  - type: evidence_stale
    requirement_id: REQ-TENANT-DDB-01
```

The plugin does not declare that the updated service is compliant. It records what changed, which impact and threat decisions must be reconsidered, which requirements remain valid, and which evidence must be collected again.

That lifecycle is what allows the ECS SaaS security review to remain useful after the initial design phase. Requirements keep their IDs, history, ownership, and traceability while still responding to the service as it evolves.
