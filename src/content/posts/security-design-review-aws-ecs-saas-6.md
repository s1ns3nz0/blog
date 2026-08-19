---
title: "Security Design Review: AWS ECS SaaS (6) - Authoring, Validation, and Publication"
description: Turning the ECS SaaS work queue into atomic, verifiable requirements, validated by code and published as a versioned security contract.
pubDatetime: 2026-08-19T09:40:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
featured: true
---

The previous article produced an owned and prioritized work queue. Each item had a responsibility, a threat reference, a blast-radius reference, and an explanation of why it should be addressed.

That work queue is not yet a security contract. The next step is to turn it into requirements that engineers can implement and reviewers can verify.

For the ECS SaaS architecture, a useful requirement must describe a property of the tenant service or control plane. It must also preserve the reason for the property, the team that owns it, and the evidence that can demonstrate it.

## Table of contents

## A control, threat, and requirement serve different purposes

A NIST control provides a general safeguard. A threat describes a concrete failure in this architecture. A requirement states the condition that must be true.

For example, least privilege is the control objective. A compromised ECS task role reaching another tenant's DynamoDB data is the threat. The requirement can then state that the task role must be limited to the actions and resources needed by that tenant service, with an explicit tenant boundary enforced before the data operation.

Keeping these artifacts separate preserves traceability. A requirement can change when the architecture changes without losing the control that motivated it or the threat that made it urgent.

## The four authoring rules

### Verifiable

Two reviewers should be able to reach the same conclusion about whether the requirement passes. Phrases such as "use strong authorization" or "protect tenant data appropriately" do not define a pass condition.

A stronger requirement says that every tenant-management request must be authenticated before provisioning begins, authorized for the requested tenant operation, and rejected when the caller lacks that permission. The API configuration, IAM policy, and negative tests can then be inspected against the same statement.

### Atomic

One requirement should express one obligation. Authentication and authorization are related but independent. If they are combined, a review may pass because the caller is identified even though the caller is allowed to perform the wrong operation.

For the ECS control plane, these become separate requirements: identify the actor before a lifecycle action, authorize the actor for that lifecycle action, and record the outcome. The IDs can still share the same threat and blast-radius references.

### Durable across implementation changes

The requirement should state a property, not force a particular AWS resource name or framework. The current implementation may use Cognito, API Gateway, IAM conditions, and ECS task roles, but a future design could change the identity provider or ingress path.

"Attach the authorizer named `tenant-admin-authorizer` to route X" is an implementation instruction. "A request that creates or deletes a tenant must be associated with an authenticated and authorized platform operator before infrastructure changes begin" is a durable security property.

Verification can still inspect the current API Gateway and IAM configuration. The published requirement remains meaningful if the architecture evolves.

### Executable by the actual organization

The profile does not assume that a dedicated security team will perform every review. Requirements should identify work the delivery team, platform team, or organization can actually own.

If central logging is an organizational service, the product requirement should state the events the ECS service must emit and the organization requirement should state retention and access review. It should not pretend that a review has already happened simply because a policy document exists.

## A requirement keeps its traceability

The plugin preserves the relationships established in earlier stages.

```yaml
- id: REQ-TENANT-DDB-01
  managed:
    statement: >-
      A tenant service must not read or modify another tenant's records,
      including when a request supplies a forged or missing tenant identifier.
    sources: [AC-3, AC-6]
    threat_refs: [T-02]
    blast_radius_refs: [T-02]
    responsibility: team
    priority: high
    verification:
      method: negative_authorization_test
      expect: cross_tenant_request_denied
```

The statement describes the required behavior. The control references explain the safeguard family. The threat and blast-radius references explain why the requirement exists and why it is high priority. The verification block gives the implementation and review process a concrete starting point.

This linkage is particularly important for a multi-tenant service. A requirement that says only "enforce access control" cannot show whether it protects the tenant data path, the provisioning path, or an internal administrative function.

## The ECS SaaS authoring set

The high-priority set normally includes separate requirements for tenant authorization, tenant-mapping integrity, task-role scope, deployment-role scope, lifecycle audit events, and recovery protection.

The tenant authorization requirements cover both the application plane and the control plane. The application plane must prevent one tenant from reaching another tenant's records. The control plane must prevent an operator or service identity from changing a tenant it was not authorized to manage.

The IAM requirements cover different roles rather than one generic "least privilege" statement. An ECS task role should be limited to the service's data access. A CodeBuild or CloudFormation role should be limited to its pipeline stage and approved resource set. A role that can modify every tenant stack needs a separate requirement because its blast radius is platform-wide.

The audit requirement covers successful and denied lifecycle attempts. An ECS task log showing that a request arrived is not enough to prove who changed a tenant mapping or triggered deletion. The event must identify the actor, operation, target, result, and correlation identifier.

The recovery requirement covers the state that must be restored, not merely whether a backup exists. Tenant mappings, deployment definitions, and acknowledged transaction state must be recoverable within the profile's stated objectives.

## Validation is deterministic where it should be

The model may draft the statement and rationale, but the plugin validates references with code. Every control ID must exist in the bundled NIST catalog. Every threat reference must exist in the threat model. Every blast-radius reference must resolve to a calculated result.

The validator also checks structural properties. IDs must be unique. Required fields must be present. Responsibility values must use the approved vocabulary. Verification methods must be known. A requirement with an invented control ID or an unresolved threat reference fails the build.

This prevents a plausible-looking document from becoming the source of truth before it is internally consistent. It also makes changes reviewable in version control: a reviewer can see whether a requirement was added, changed, superseded, or rejected by validation.

## Quality checks for requirement language

The linter checks for wording that cannot be tested reliably. Terms such as "appropriate," "adequate," "secure," and "regularly" are flagged unless the requirement defines an observable condition or a measurable interval.

It also checks for compound obligations. A statement that requires authentication, authorization, logging, and recovery in one paragraph should normally be split into separate IDs. Independent obligations need independent pass or fail results.

The linter does not decide whether the architecture is secure. It checks whether the requirement is precise enough for a human or verification tool to make that decision.

## Publication creates a versioned security contract

After authoring and validation, the plugin publishes the requirements together with the profile digest, catalog version, threat-model version, and blast-radius calculation used to derive them.

```text
service profile
      + impact and baseline decision
      + threat model
      + blast-radius result
      + responsibility mapping
                ↓
       validated requirements
                ↓
          published contract
```

The published artifact is not a compliance certificate. It is a stable contract for design review, implementation work, testing, and later refresh. It records what was required, why it was required, who owned it, and which assumptions were in force at publication time.

## What this stage produces

The final output is a set of atomic requirement records that can move into the rest of the SDLC.

```yaml
requirement_set:
  service: aws-ecs-saas
  profile_digest: sha256:...
  baseline: NIST-800-53B-Moderate
  application_security: OWASP-ASVS-Level-2
  threat_model_version: ecs-saas-threats-v1
  blast_radius_version: ecs-saas-blast-graph-v1
  validation: passed
```

The next stage can use these IDs to plan implementation evidence and review status. If a tenant route, IAM role, isolation tier, or recovery objective changes, the requirement set can be refreshed against the new profile rather than regenerated as an unrelated document.
