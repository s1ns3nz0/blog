---
title: "Security Design Review: AWS ECS SaaS (3) - Threat Analysis"
description: A STRIDE threat model across nine trust boundaries of the AWS ECS SaaS reference architecture, from tenant claim spoofing to a deployment role that can reach every tenant.
pubDatetime: 2026-08-17T23:58:40+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
  - threat-modeling
  - STRIDE
featured: true
---

Part 1 profiled the AWS ECS SaaS reference architecture as a control plane and an application plane sharing Cognito, API Gateway, ECS Fargate, and DynamoDB. Part 2 calculated Moderate confidentiality, integrity, and availability impact, and pulled in a Privacy baseline and a PIPA/ISMS-P overlay because the platform holds customer contact data.

This stage crosses that profile with the architecture's actual connections. Threat modeling on a multi-tenant SaaS platform has one question that matters more than any other:

> Where can one tenant's request, identity, or data cross into another tenant's boundary, and where can the control plane itself be reached from the application plane?

## Table of contents

## Nine trust boundaries

The plugin identified nine boundaries from the repository's control-plane and application-plane structure.

| Boundary | From | To |
|---|---|---|
| TB-1 | Anonymous public site | CloudFront and public web assets |
| TB-2 | Tenant user or tenant administrator | Cognito and the API Gateway tenant API |
| TB-3 | API Gateway authorizer | ALB and ECS application services |
| TB-4 | ECS task role | Tenant DynamoDB tables |
| TB-5 | Platform operator or tenant administrator | Tenant management API and control plane |
| TB-6 | Control-plane EventBridge event | CodeBuild, CloudFormation, and provisioning scripts |
| TB-7 | Provisioning custom resource Lambda | Tenant mapping DynamoDB table |
| TB-8 | Tenant application and control plane | CloudWatch and S3 access logs |
| TB-9 | AWS account operator or CI/CD pipeline | ECR, CDK, and CloudFormation deployment artifacts |

TB-4 through TB-9 sit entirely inside the platform. That is deliberate. A SaaS platform's most consequential threats are rarely at the public edge; they are in the boundaries between one tenant's data and the shared services, control plane, and deployment pipeline that touch every tenant at once.

## T-01: A forged tenant claim can address another tenant's data

Boundary TB-2. If a tenant user modifies or forges the tenant claim or `tenantPath` value, and API Gateway or a downstream service accepts the caller as a member of another tenant, that request now carries the wrong tenant's authority.

This is an Elevation of Privilege threat, and it reaches tenant identity, the tenant mapping, and customer data directly.

The resulting requirement (`REQ-TENANT-CLAIM-01`, shared with T-03) is specific: the service must derive the tenant identity used for authorization from a verified identity claim or a server-side tenant mapping, never from a client-controlled path or body value.

## T-02: A missing tenant-key condition exposes another tenant's DynamoDB records

Boundary TB-4. If a task role or application query omits the tenant-scoped `LeadingKeys` condition, a valid tenant user can read or modify another tenant's DynamoDB items directly.

This is the platform's most direct cross-tenant data path, reaching transaction history and customer data with no intermediate step.

The resulting requirement (`REQ-TENANT-DDB-01`) states that every tenant-scoped DynamoDB read and write must be constrained by the authenticated tenant key, with both a positive and a negative test.

## T-03: A downstream service can trust a forged tenant header instead of the authorizer

Boundary TB-3. The API authorizer may derive `tenantPath` correctly, but if a downstream ALB, reverse proxy, or service trusts a client-supplied header instead of the authorizer-derived value, cross-tenant routing becomes possible even though the front door did its job correctly.

The resulting requirements connect back to T-01's tenant-claim rule and add a route-and-method allowlist (`REQ-ROUTE-METHOD-01`, shared with T-08): every tenant API operation must enforce an explicit route-and-method allowlist before invoking its handler, so an unexpected path or method cannot reach a handler that assumes the authorizer's value was honored.

## T-04: A tenant administrator can reach platform-level management actions

Boundary TB-5. A tenant administrator who reaches a platform-level tenant-management action, such as onboarding, offboarding, tier changes, or another tenant's user management, has escalated from managing one tenant to managing the platform.

The resulting requirement (`REQ-PLATFORM-AUTHZ-01`) is that the tenant management API must authorize platform-level actions separately from tenant-user actions. AWS provides the identity and policy enforcement primitives; the team still has to define and enforce the distinct permission sets.

## T-05: Destructive offboarding can run before data is protected

Boundary TB-5. A destructive offboarding request could remove a tenant's infrastructure or data before retention, export, approval, or deletion conditions have been satisfied.

This is a Tampering threat against tenant data, backups, and tenant infrastructure at once, and it feeds two requirements: an immutable audit trail (`REQ-AUDIT-IMMUTABILITY-01`, shared with T-06 and T-11) and an offboarding gate (`REQ-OFFBOARD-RECOVERY-01`, shared with T-13) that requires export, retention, and recovery evidence before destructive resources are removed.

## T-06: A forged or replayed lifecycle event can provision the wrong tenant

Boundary TB-6. A forged or replayed tenant lifecycle event could cause provisioning or deprovisioning to run for the wrong tenant, the wrong tier, or a lifecycle state that already completed.

The resulting requirement (`REQ-LIFECYCLE-AUTH-01`) requires tenant lifecycle events to be authenticated, authorized, and bound to the requested tenant and isolation tier before provisioning or deprovisioning begins. It shares the audit-immutability requirement with T-05 and T-11, since a forged lifecycle event is exactly the kind of action that needs a durable record.

## T-07: Repeated onboarding can exhaust control-plane capacity

Boundary TB-6. Repeated tenant onboarding requests can trigger expensive ECS, CloudFormation, CodeBuild, and Cognito provisioning work until account quotas or control-plane capacity are exhausted. This is a Denial of Service threat aimed at the control plane rather than at any single tenant's application.

The resulting requirement (`REQ-CAPACITY-ISOLATION-01`, shared with T-12) requires quotas or rate limits that prevent one tenant from exhausting shared provisioning or runtime capacity, with AWS supplying the underlying throttling primitives and the team configuring tenant-aware limits and alarms.

## T-08: Unvalidated provisioning input can escape its declared tenant scope

Boundary TB-6. If a provisioning script accepts an unvalidated `tenantId`, tier, tenant name, or source-version value, it can deploy resources or retrieve source artifacts outside the intended tenant scope.

The resulting requirement (`REQ-PROVISION-INPUT-01`) requires tenant provisioning inputs to be validated against an allowlist before they reach CloudFormation, CodeBuild, or a shell command, closing the same class of problem the movie-rating series addressed with input validation ahead of DynamoDB access.

## T-09: The shared mapping Lambda can rewrite any tenant's routing

Boundary TB-7. The custom resource Lambda that maintains the tenant mapping table has broad read-write access by default. A compromise of that one shared function can rewrite mappings for multiple tenants and redirect routing or lifecycle operations.

The resulting requirement (`REQ-MAPPING-LAMBDA-01`) restricts that custom resource to only the actions and resource scope required to read and update the mapping table, the same least-privilege argument this series has made for every shared execution role.

## T-10: Tenant and customer data can leak into shared logs

Boundary TB-8. Tenant identifiers, email addresses, authorization context, or customer data can appear in shared application or access logs and become readable by operators who do not administer that tenant. This is an Information Disclosure threat, and the log destination is shared across every tenant, so one over-verbose log line has a wider blast radius than it would in a single-tenant service.

The resulting requirement (`REQ-LOG-SANITIZATION-01`) requires application and control-plane logs to exclude authentication secrets, raw tokens, and unnecessary tenant customer data, with redaction applied at log construction rather than after the fact. It also feeds `REQ-API-ERROR-01`, shared with T-01, which keeps stack traces, credentials, and other tenants' identifiers out of public error responses.

## T-11: Deployment roles can modify infrastructure beyond their pipeline stage

Boundary TB-9. A compromised CodeBuild project or deployment role could modify shared infrastructure, tenant templates, or source artifacts beyond what its specific pipeline stage actually needs. This is an Elevation of Privilege threat at the deployment layer, and it can reach every tenant environment at once rather than one tenant's data.

The resulting requirement (`REQ-DEPLOY-SCOPE-01`) restricts deployment identities to the stacks, repositories, and environments required by their pipeline stage, and it shares the audit-immutability requirement with T-05 and T-06.

## T-12: Pooled tenants can starve each other of shared capacity

Boundary TB-4. A pooled tenant or shared ECS service can consume shared CPU, memory, connection pools, or DynamoDB capacity and degrade availability for other tenants when there is no tier-specific quota or throttle in place.

This shares its resulting requirement, `REQ-CAPACITY-ISOLATION-01`, with T-07: both are the same underlying problem, one triggered by onboarding volume and the other by steady-state pooled usage.

## T-13: Offboarding can delete customer data without recovery evidence

Boundary TB-4. A tenant table configured with `RemovalPolicy.DESTROY`, or an incomplete offboarding workflow, can delete customer data without a verified export, retention check, or recovery point ever having been confirmed.

This shares `REQ-OFFBOARD-RECOVERY-01` with T-05: the destructive-offboarding gate has to hold regardless of whether the trigger was a rushed administrative action or a removal policy left at its default.

## Turning threats into requirements

Thirteen threats produced thirteen requirements. Eleven were assigned High priority; the public-error-response requirement and the route-and-method allowlist were assigned Medium, since both are defense-in-depth around a boundary that a higher-priority requirement already covers directly.

Several requirements cover more than one threat, which is expected rather than a sign of double-counting: T-05, T-06, and T-11 all converge on the same need for an audit trail the runtime cannot alter, and T-07 and T-12 both resolve to the same tenant-aware capacity limits.

## What Part 3 established

- Nine trust boundaries separate the control plane, the application plane, and the shared services that sit between them.
- The most consequential threats are internal: tenant-key conditions, the shared mapping Lambda, and deployment-role scope, not the public entry point.
- Thirteen service-specific threats produced thirteen requirements, eleven of them High priority.
- Several requirements are shared across threats where the same underlying property, an immutable audit trail or tenant-aware capacity limits, closes more than one scenario at once.

Part 4 takes these same threats and calculates how far each one could actually spread: which tenants, which data, and whether the reachable scope stays inside one service or extends to the control plane and the AWS account itself.
