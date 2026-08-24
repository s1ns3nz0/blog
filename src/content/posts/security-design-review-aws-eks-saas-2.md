---
title: "Security Design Review: AWS EKS SaaS (2) - CIA Impact and Baseline"
description: Calculating CIA impact for the AWS EKS SaaS reference architecture, where pooled and siloed DynamoDB models and a shared control plane both feed the result.
pubDatetime: 2026-08-20T15:10:00+09:00
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

The first article established the service profile for AWS's EKS SaaS reference architecture. It identified the shared control plane, tenant namespaces, tenant routing, Cognito identity flows, Kubernetes service accounts, and the two different DynamoDB partitioning models.

The next step is to decide how serious a compromise or outage would be and which control baseline should guide the requirements. This decision cannot be made from the word "EKS" alone. It depends on the data, the tenant model, the control-plane authority, and the operating promises attached to the service.

## Table of contents

## The calculation uses the profile, not model memory

The plugin combines data classification and confirmed operating conditions, then calculates confidentiality, integrity, and availability independently.

```text
data types + tenant context
              ↓
confidentiality impact
integrity impact
availability impact
              ↓
      highest CIA value
              ↓
NIST SP 800-53B baseline
OWASP ASVS level
```

The model interprets what the repository means. The service owner confirms the assumptions that code cannot establish, such as the recovery objective or the contractual availability promise. A deterministic script then selects the baseline from the bundled catalog.

This separation matters because a control identifier or baseline membership should not depend on what a model happens to remember. The same confirmed profile must produce the same result, and an invented control ID must fail validation.

## The operating assumptions must be explicit

The reference repository explains how to deploy the sample, but it does not define the commitments of a real SaaS provider. For this analysis, the service profile uses the following provisional operating context:

```yaml
users:
  - authenticated_tenant_users
  - tenant_administrators
  - provider_operators
  - public_prospective_tenants
user_regions:
  - KR
  - JP
region_storage: ap-northeast-2
availability:
  rto: rto_hours
  rpo: rpo_zero
  amplifiers:
    - revenue_direct
    - contractual_sla
```

These values are analysis inputs, not facts proven by the sample. If the real service is an internal demonstration with no customer SLA, the availability result may be lower. If it stores regulated health or financial records, confidentiality and integrity may be higher.

The plugin keeps those decisions visible so that a service owner can replace them before the requirements are treated as final.

## Confidentiality: tenant and platform data are both important

The tenant application stores product and order information. The shared services store tenant names, plans, contact information, authentication configuration, and user-related attributes. Logs, audit records, backups, and deployment metadata extend the data boundary beyond the DynamoDB tables.

The pooled product table makes confidentiality dependent on tenant-key enforcement. A caller who can bypass the condition may read the records of other tenants. The siloed order tables reduce the reach of one data-store mistake, but the provisioning and IAM paths can still grant access to multiple tables.

The control plane has a separate confidentiality concern. Tenant mappings connect domains, user pools, namespaces, and deployment resources. Disclosure of that mapping may reveal customer relationships and infrastructure details; unauthorized changes may be even more damaging.

For the stated SaaS scenario, confidentiality is Moderate. The result reflects customer-owned data and cross-tenant metadata, not a claim that every field is secret.

## Integrity: the tenant boundary is a data-integrity property

Integrity is also Moderate. The service must preserve the correctness of product and order records, but it must also preserve the relationship between a user, tenant, namespace, route, and data store.

An incorrect product price or order record affects one tenant's business activity. A changed tenant mapping can route a user to the wrong namespace or select the wrong Cognito configuration. A manipulated provisioning parameter can create a namespace with the wrong service account or deploy an image to the wrong tenant.

These are integrity failures even when no database row is directly modified. The service has made an incorrect security decision about which identity may reach which resource.

The same applies to onboarding and deletion. Registration, tenant management, CodeBuild, and CloudFormation collectively create and remove tenant resources. Those operations must be attributable, authorized, and recoverable because their state becomes part of the platform's security boundary.

## Availability: shared cluster and shared services raise the consequence

The sample runs shared services and tenant environments in one EKS cluster. A cluster failure, ingress failure, or misconfigured network policy can therefore affect more than one tenant.

The platform also relies on shared registration, tenant management, user management, DNS, CloudFront, and provisioning workflows. A failure in one of these components can prevent onboarding, authentication, routing, or tenant recovery even when the product and order Pods are healthy.

Under the provisional hours-level RTO, zero-data-loss RPO, revenue dependency, and customer SLA assumptions, availability is Moderate. The value comes from the service promise and shared dependencies, not from Kubernetes being difficult to operate.

If the actual sample is used only as a tutorial and an outage is acceptable for days, the owner should lower the availability input. The plugin should then recalculate rather than preserve the Moderate value by habit.

## The system impact is the highest CIA value

The preliminary result is:

| Dimension | Level | Reason |
|---|---|---|
| Confidentiality | Moderate | Tenant business data, identity attributes, mappings, logs, and backups are handled. |
| Integrity | Moderate | Product and order records, tenant routing, IAM bindings, and onboarding state must remain correct. |
| Availability | Moderate | Shared EKS services, ingress, provisioning, and the declared recovery objectives affect multiple tenants. |
| System impact | Moderate | The highest value across the three dimensions is Moderate. |

The plugin uses the highest CIA value rather than averaging the dimensions. A public landing page might have Low confidentiality impact, but that does not lower the impact of the shared tenant-management service or the pooled product data path.

This high-water-mark rule keeps a critical dimension from disappearing inside a low average. It is particularly useful in a SaaS platform where different components have very different data and authority while still sharing a cluster and control plane.

## Selecting the NIST baseline

With the provisional Moderate system impact, the plugin selects the NIST SP 800-53B Moderate baseline from the bundled catalog. The baseline provides the starting control set for access enforcement, auditability, configuration management, incident response, contingency planning, system integrity, and supply-chain protection.

The baseline does not mean that the EKS sample already implements those controls. It defines the requirements that must be addressed and assigned. Some controls may be provided by AWS, some by the organization, and others by the platform or product team.

For example, AWS operates the managed EKS control plane. The customer still configures cluster access, Kubernetes RBAC, service-account permissions, network policies, admission controls, image provenance, and tenant authorization. The baseline is therefore a starting contract, not an inheritance declaration.

## Selecting the OWASP ASVS level

The tenant-facing and administration applications start at OWASP ASVS Level 2. They are internet-facing web applications with authenticated users, tenant-specific authorization, dynamic identity configuration, and operations that create or modify customer environments.

Level 2 is appropriate as a starting point for meaningful business data and a multi-tenant authorization model. It gives later testing a clear expectation for authentication, session handling, access control, input validation, error handling, logging, and dependency management.

The provider administration application deserves focused review even when the tenant application is simple. A provider operator can manage tenant settings and start lifecycle operations, so the relevant requirements must consider stronger authorization, separation of duties, auditability, and recovery.

## Privacy and contractual overlays remain separate

The presence of user attributes, contact information, tenant metadata, and possible Korean and Japanese users creates privacy questions. A customer data-processing agreement or local privacy obligation may add requirements for notice, retention, deletion, access requests, and cross-border processing.

Those obligations are tracked as overlays rather than folded into the CIA arithmetic. Moderate confidentiality impact does not remove a privacy duty, and declaring a privacy regulation does not prove compliance.

The service owner must confirm the applicable jurisdictions, data-controller or processor role, support-access model, backup retention, and deletion expectations. The plugin records unresolved items instead of asserting that the AWS region alone answers them.

## What this stage produces

The stage produces a versioned decision record for the EKS SaaS review.

```yaml
service: aws-eks-saas-reference-architecture
system_impact: moderate
cia:
  confidentiality: moderate
  integrity: moderate
  availability: moderate
baseline:
  nist_800_53: moderate
application_security:
  owasp_asvs: level_2
overlays:
  - customer_data_processing
  - tenant_data_deletion
  - availability_sla
assumptions_requiring_confirmation:
  - rto_and_rpo
  - user_regions
  - privacy_applicability
  - shared_cluster_production_acceptability
```

This output does not certify the sample or claim that the EKS cluster is secure. It records why the next requirements were selected and which assumptions must be confirmed before threat modeling and blast-radius analysis proceed.

The next stage will model the paths through the shared control plane, NGINX ingress, tenant namespaces, Kubernetes identities, AWS IAM, and the two DynamoDB partitioning models.
