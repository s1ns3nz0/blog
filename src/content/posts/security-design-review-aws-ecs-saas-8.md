---
title: "Security Design Review: AWS ECS SaaS (8) - Evidence and Review"
description: Why an ECS SaaS requirement is a criterion rather than proof, and how the plugin ties tenant-isolation, IAM, and audit requirements to evidence-based status.
pubDatetime: 2026-08-19T09:48:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - ECS
  - SaaS
  - Plugin
featured: true
---

The previous article described how the ECS SaaS security contract is refreshed when the architecture or operating context changes. The next question is whether the resulting requirements are actually implemented and remain effective.

A requirement is not evidence. It is the condition against which design, implementation, and operation are reviewed.

## Table of contents

## Keep the assurance stages separate

The plugin keeps the assurance lifecycle explicit.

```text
authored
   ↓
trace-linked
   ↓
semantically reviewed
   ↓
implemented
   ↓
evidenced
   ↓
assessed
```

An authored requirement exists as a statement. A trace-linked requirement points to its control, threat, blast-radius result, and responsibility. A semantically reviewed requirement has been checked by a reviewer for meaning and verification method.

The later states need implementation or operational evidence. The plugin can define the contract and organize the evidence request, but it must not mark an ECS service as implemented merely because a README or generated requirement says that it should be.

## Evidence must match the requirement

Each ECS SaaS requirement needs evidence that directly supports its pass condition.

For `REQ-TENANT-DDB-01`, relevant evidence includes the task role policy, the application authorization path, a deployed configuration snapshot, and a negative test showing that one tenant cannot access another tenant's records.

For a control-plane authorization requirement, the evidence should include the route or service policy, the identity-to-role mapping, and tests for both an authorized platform operator and an unauthorized tenant administrator. A general statement that Cognito is enabled does not prove that a tenant administrator cannot invoke a platform-wide lifecycle operation.

For a deployment-role requirement, the evidence must cover the CodeBuild and CloudFormation role policies, the resolved infrastructure plan, and an attempted operation outside the approved account, environment, or resource scope.

For auditability, the evidence must show an actual lifecycle event containing the actor, operation, target tenant, outcome, and correlation identifier. An ECS task invocation metric proves that a task ran; it does not prove who changed a tenant mapping.

## Separate intended configuration from deployed state

Infrastructure as code answers what the team intended to deploy. The running AWS environment answers what is configured now. Runtime or integration tests answer whether the required behavior occurs.

```text
IaC declaration
      ↓
deployed ECS, IAM, API, and data configuration
      ↓
behavioral verification
```

Consider the task-role least-privilege requirement. Terraform or CDK may show a policy limited to a tenant table. The deployed IAM role must show the same policy after interpolation and attachment. A test should then confirm that access to an unrelated table is denied.

None of these layers replaces the others. An unapplied plan is not proof of deployment. A one-time runtime test does not prove that the configuration remains reproducible. A deployed policy without a negative test may still permit an unintended action through another role or service path.

## Verification metadata is the handoff point

Each requirement contains a verification method, target, and expected result.

```yaml
verification:
  method: negative_authorization_test
  target: tenant-service-to-dynamodb
  expect: cross_tenant_request_denied
```

This metadata can be handed to a future verification runner or review workflow. The current plugin defines what should be checked and how the result should be interpreted. It does not claim that every method is automatically executed against a production account.

The distinction is important for safe automation. A source inspection can verify that a policy declaration does not contain a wildcard. It cannot prove that another attached policy or permission boundary does not reintroduce the same authority without inspecting the resolved deployment state.

## Status is based on evidence, not confidence of prose

The review status has a defined meaning.

```text
pass             current evidence supports the property
conditional      the property is partly satisfied or depends on a condition
fail             current evidence contradicts the property
not_applicable   review establishes that it does not apply
undetermined     required evidence is unavailable
```

If the repository contains a task role but the deployed policy cannot be inspected, the least-privilege result is `undetermined`, not `pass`. If the role visibly includes a broad account-level permission, the result is `fail`.

An unavailable production account is also not automatically a failure. It means that the review has not established the current state. The missing access and required evidence should remain visible in the review queue.

## Evidence can become stale

Evidence is tied to the state that produced it. A task-definition update, new ECS service, changed API Gateway route, modified tenant-mapping table, or expanded deployment role can invalidate an earlier result.

```text
August IAM evidence
        +
September role-policy change
        ↓
August result requires re-review
```

The requirement ID can remain stable while its evidence is recollected. The refresh process from Part 7 identifies which requirements are affected and marks their previous evidence as stale rather than silently reusing it.

## Exceptions remain part of the contract

If a requirement cannot be satisfied immediately, it remains active with an explicit exception.

```yaml
human:
  status: exception
  exception:
    approver: platform-owner
    reason: temporary migration role needs two tenant stacks
    compensating_controls:
      - session duration limited to one hour
      - role disabled outside the migration window
    expires: 2026-12-31
```

An acceptable exception names the approver, explains the accepted risk, records compensating controls, and includes an expiry date. Removing the requirement from the file would hide the risk and make later review harder.

## Design review and implementation review use the same contract

During design review, the team explains how each requirement will be met. For example, it identifies which routes receive Cognito authorization, how tenant claims reach the service, where lifecycle audit events are stored, and how tenant data is restored within the recovery objective.

During implementation review, the reviewer checks whether those properties exist in the deployed system. The checks include unauthorized cross-tenant requests, task-role access to an unrelated table, control-plane actions by the wrong role, audit events for denied operations, and recovery of tenant mappings.

Using the same requirement IDs at both points preserves continuity. The design decision becomes an implementation check rather than a separate document that cannot be compared later.

## What this stage produces

The output is an evidence-aware review record.

```yaml
- requirement_id: REQ-TENANT-DDB-01
  status: conditional
  evidence:
    - type: iac_policy
      ref: artifacts/iam/task-role-policy.json
    - type: integration_test
      ref: artifacts/tests/cross-tenant-denial.xml
  gaps:
    - deployed_role_snapshot_missing
  next_review_trigger:
    - task_role_policy_changed
```

This record does not certify the service. It shows which evidence supports a requirement, what remains unknown, and what future changes should trigger another review.

That is the point of carrying requirements through the lifecycle. The ECS SaaS design review becomes a traceable handoff from architecture to implementation and operation, rather than a one-time security document that loses value after deployment.
