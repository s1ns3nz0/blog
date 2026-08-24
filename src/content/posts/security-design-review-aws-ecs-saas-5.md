---
title: "Security Design Review: AWS ECS SaaS (5) - Responsibility and Prioritization"
description: Turning the ECS SaaS baseline, threats, and blast-radius results into an owned, prioritized work queue, with the control plane and tenant isolation tier driving priority.
pubDatetime: 2026-08-19T09:35:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - ECS
  - SaaS
  - Plugin
featured: true
---

The first four articles established the service profile, calculated the CIA impact, modeled threats, and measured their blast radius. The next question is practical: who must address each risk, and which work should happen first?

This stage turns the analysis into an owned work queue. A control can be relevant without belonging entirely to the product team. A threat can be serious without being the first item to implement. Responsibility and priority must be resolved together.

## Table of contents

## The work queue combines four sources

The plugin joins the NIST baseline, the threat model, the blast-radius graph, and the AWS responsibility model.

```text
NIST baseline
      + service threats
      + blast-radius dimensions
      + provider responsibility
                ↓
       owned, prioritized work
```

The result is not a list of generic controls. It explains what must be configured or operated for this ECS SaaS service, who owns that action, and why the item has its current priority.

## AWS responsibility does not mean application responsibility disappears

The architecture uses managed services including ECS Fargate, Elastic Load Balancing, API Gateway, Cognito, DynamoDB, EventBridge, CodeBuild, and CloudFormation. AWS operates important parts of those services, but the customer still controls how they are configured and connected.

The plugin therefore uses four responsibility categories. `team` means the delivery team owns the implementation. `shared` means AWS supplies a mechanism while the team configures or operates its part. `org` covers organization-wide process and governance. `csp_claimed` records a provider responsibility that must be supported by current assurance evidence.

Calling a control "inherited" solely because the service is managed would hide the customer's configuration work. Calling it entirely team-owned would ignore the provider's operating responsibility. The split is recorded in the requirement itself.

## Control-plane controls receive special treatment

The control plane creates tenants, maps tenant identities to resources, and starts provisioning and deletion workflows. It is not just another ECS service.

A tenant application compromise may affect one tenant or the tenants sharing a Basic or Advanced service. A control-plane compromise can change the routing table, issue infrastructure changes, or delete tenant environments across the platform.

For that reason, control-plane paths are prioritized even when the underlying NIST control is the same. Access enforcement for a tenant API and access enforcement for a tenant-provisioning API both map to authorization controls, but the latter carries a broader control scope and recovery scope.

The requirement must identify the protected operation, not merely the AWS product. "Protect API Gateway" is too vague. "A request that creates or deletes a tenant must be authenticated, authorized for that tenant-management operation, and recorded with an actor and outcome" is testable and tied to the actual risk.

## Tenant isolation changes priority, not just architecture diagrams

The isolation tier is used when prioritizing requirements.

In Basic mode, tenant workloads share services and capacity. A missing tenant condition, weak request routing, or resource-exhaustion event can cross the boundary of one tenant and affect a subset of customers.

Advanced mode separates services while retaining a shared cluster. This narrows some runtime paths, but cluster-level permissions and shared control-plane resources remain important.

Premium mode gives each tenant a dedicated cluster. That reduces the reach of certain application failures, yet the provisioning role, tenant mapping, and shared deployment pipeline can still affect every tenant. Dedicated runtime capacity is therefore not treated as a substitute for control-plane least privilege.

The blast-radius dimensions make this distinction visible. A requirement connected to `tenant_scope: all`, `control_scope: platform`, or `recovery_scope: platform_recovery` is normally raised ahead of a requirement whose path is contained within one task or one tenant recovery domain.

## Example: tenant data access

The threat model includes a failure in which an ECS task accesses another tenant's DynamoDB records because the tenant condition is missing or incorrectly derived.

The requirement is owned by the team because the team defines the application authorization logic and the IAM policy condition. AWS provides DynamoDB's policy enforcement mechanism, but it does not know which claim or tenant identifier the application should use.

The item is high priority because its blast radius is cross-tenant. The same defect in a Premium deployment may be contained by separate tables or stacks, but the shared Basic and Advanced paths still require a negative test proving that one tenant cannot read or modify another tenant's records.

The work item should preserve all three relationships: the source threat, the affected data store, and the blast-radius result. That traceability lets a reviewer see why a tenant-key condition is more urgent than a low-impact documentation control.

## Example: deployment and provisioning roles

CodeBuild and CloudFormation are used to build and provision tenant infrastructure. A role with broad permissions can modify shared networking, ECS services, DynamoDB tables, or other account resources.

This is usually a shared responsibility. AWS provides IAM evaluation and the deployment services. The organization may define account guardrails and approval rules. The delivery team must still scope the role to the pipeline stage, environment, and resources it is allowed to change.

The priority is high when the graph reaches `tenant_scope: all`, `runtime_scope: account`, or `control_scope: platform`. A deployment error is not automatically a security incident, but a role that can change the whole account creates a platform-wide failure path and needs stronger review, separation of duties, and recovery evidence.

## Example: logging and auditability

CloudWatch can store logs, and AWS can provide control-plane events. Neither proves that a tenant lifecycle action was attributable.

The team must emit an audit event containing the actor, operation, target tenant, result, and correlation identifier. The organization may own retention and access-review policy. AWS provides the managed logging service and its underlying availability claims.

The requirement is prioritized according to the actions it covers. A failed tenant deletion attempt and a successful platform-wide provisioning change should both be recorded, but the latter needs stronger alerting and review because its control scope is broader.

## From priority labels to implementation order

The plugin does not assign priority from one severity word. It records the reasons that led to the result.

```yaml
priority: high
priority_reasons:
  - cross_tenant_scope
  - platform_control
  - recovery_impact
  - threat_linked
review_required: true
```

An item is generally raised when it protects a shared boundary, reaches the control plane, affects platform recovery, or is linked to a confirmed threat. An unknown scope also creates a review task. Unknown does not mean the final impact is High; it means the owner must resolve the missing fact before the risk can be accepted.

This makes the queue explainable. Two requirements may both map to AC-6, yet one can be urgent because it protects the provisioning role while the other can wait because it concerns a contained tenant task.

## What this stage produces

The output is a set of requirement work records with a stable identifier, control references, threat references, blast-radius references, responsibility, evidence expectations, and priority rationale.

```yaml
- id: REQ-TENANT-DDB-01
  managed:
    responsibility: team
    threat_refs: [T-02]
    blast_radius_refs: [T-02]
    priority: high
    priority_reasons:
      - cross_tenant_scope
    verification:
      method: negative_authorization_test
```

At this point the work is owned and ordered, but it is not yet the final published security contract. The next stage writes these records as atomic, verifiable requirements and validates their control and threat references before publication.
