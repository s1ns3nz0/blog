---
title: "Security Design Review: AWS EKS SaaS (6) - Authoring, Validation, and Publication"
description: Writing atomic, verifiable EKS SaaS requirements for tenant identity, network isolation, IRSA, and the provisioning pipeline, validated by code before publication.
pubDatetime: 2026-08-21T14:25:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
  - Kubernetes
featured: true
---

The previous article converted the EKS SaaS threat and blast-radius analysis into an owned work queue. The next step is to write requirements that engineers can implement and reviewers can test.

The result should not be a copied Kubernetes checklist. Each requirement must describe a property of this SaaS service, preserve the reason it exists, identify who owns the work, and state how the property can be verified.

## Table of contents

## A control, a threat, and a requirement are different artifacts

A control expresses a general safeguard. A threat describes a concrete failure path in the EKS SaaS architecture. A requirement states the condition that must be true.

For example, access enforcement is a control objective. A forged tenant identifier reaching the pooled product table is the threat. The requirement can state that the service must derive tenant context from a trusted identity and deny a request when the identity, route, and data key do not agree.

The control provides catalog traceability. The threat supplies architecture-specific context. The requirement becomes the property that can be tested against Kubernetes configuration, AWS IAM, application behavior, and deployed evidence.

## The four authoring rules

### Verifiable

A requirement must define a pass condition that two reviewers can evaluate in the same way. "Use secure namespace isolation" does not define what should be inspected or tested.

A verifiable version states that a tenant workload cannot connect to another tenant namespace except through explicitly approved service paths, and that the effective network policy denies all other connections. The reviewer can then inspect policy and run a connection test.

### Atomic

One requirement should express one obligation. Tenant authentication, tenant authorization, ingress routing, and network isolation often support the same boundary, but they can fail independently.

For the EKS SaaS service, the requirement to validate the caller's tenant identity should be separate from the requirement to enforce the Kubernetes network boundary. Splitting them makes partial implementation visible.

### State a property rather than an implementation recipe

The current sample uses NGINX Ingress, Cognito user pools, namespace-per-tenant, and IRSA. A durable requirement should survive a future move to another ingress controller, identity provider, or cluster topology.

"Create an NGINX rule named `tenant1-route`" is an implementation instruction. "A request must be routed only to the namespace and tenant service associated with its authenticated tenant context" states a security property.

Verification may inspect the current Ingress objects and NGINX configuration because those are the present implementation. The published requirement remains useful if the implementation changes.

### Make ownership executable

The requirement must match the responsibility split established in Part 5. A product team can change application authorization and data access. A platform team can change NetworkPolicy, ServiceAccount bindings, admission policy, and controller configuration. The SaaS operator owns tenant and provider-administration decisions.

Where a requirement crosses those boundaries, the record should state each part explicitly instead of assigning the whole obligation to an imaginary security team.

## Example: tenant identity and pooled data access

T-06 is translated into an atomic requirement that protects the pooled product table.

```yaml
- id: REQ-EKS-TENANT-CONTEXT-01
  managed:
    statement: >-
      The product service must derive tenant context from a validated
      authenticated identity and must reject a request when the tenant
      context is missing, forged, or inconsistent with the requested data.
    rationale: >-
      The product table is pooled across tenants, so a tenant-key error can
      expose or modify another tenant's records.
    sources: [AC-3, AC-6]
    threat_refs: [T-02, T-06]
    blast_radius_refs: [T-02, T-06]
    responsibility: team
    priority: high
    verification:
      method: negative_authorization_test
      expect:
        - forged_tenant_identifier_denied
        - missing_tenant_claim_denied
        - cross_tenant_record_access_denied
```

The requirement does not prescribe one JWT library or one controller implementation. It does define the behavior that protects the pooled data boundary.

## Example: namespace and network isolation

The Kubernetes platform requirement is separate because application authorization cannot replace network isolation.

```yaml
- id: REQ-EKS-NETWORK-ISOLATION-01
  managed:
    statement: >-
      A tenant namespace must deny network connections to other tenant
      namespaces and to node or control-plane addresses unless the path is
      explicitly approved for the service.
    sources: [SC-5, AC-4]
    threat_refs: [T-04]
    blast_radius_refs: [T-04]
    responsibility: platform
    priority: high
    verification:
      method: effective_network_policy_test
      expect: default_deny_with_approved_exceptions
```

This property can be implemented with Calico, the Amazon VPC CNI network-policy capability, or another supported mechanism. The requirement remains focused on the effective boundary.

## Example: IRSA and cloud identity

The ServiceAccount-to-IAM relationship needs a requirement that names the complete chain.

```yaml
- id: REQ-EKS-IRSA-SCOPE-01
  managed:
    statement: >-
      A tenant workload may assume only the AWS role approved for its
      ServiceAccount and namespace, and that role must permit only the
      actions and resources required by the workload.
    sources: [AC-6, IA-3]
    threat_refs: [T-05, T-06]
    blast_radius_refs: [T-05, T-06]
    responsibility: shared
    priority: high
    verification:
      method: effective_identity_policy_review
      target: pod_serviceaccount_trust_policy_iam_policy
```

The verification target is intentionally broader than a YAML annotation. A reviewer must follow the Pod, ServiceAccount, role annotation, OIDC trust policy, attached IAM policies, and effective resource scope.

## Example: provisioning pipeline permissions

The CodePipeline and CodeBuild path receives a separate requirement because it can create namespaces, ingress rules, service accounts, and tenant workloads.

```yaml
- id: REQ-EKS-PROVISIONER-SCOPE-01
  managed:
    statement: >-
      A tenant provisioning job must be limited to the approved tenant
      namespace and resources for the onboarding operation and must not
      create unrestricted cluster-wide roles or bindings.
    sources: [AC-6, CM-5]
    threat_refs: [T-08]
    blast_radius_refs: [T-08]
    responsibility: shared
    priority: high
    priority_reasons:
      - platform_scope
      - cloud_identity_boundary
    verification:
      method: pipeline_and_rbac_review
```

This requirement links AWS build permissions and Kubernetes RBAC. A narrowly scoped AWS role does not compensate for a Kubernetes identity that can create a ClusterRoleBinding.

## Validation is deterministic

The model may draft the statement and rationale, but the plugin validates the references and structure with code. Every control ID must exist in the bundled catalog. Every threat and blast-radius reference must resolve to the reviewed EKS models.

The validator also checks unique IDs, required fields, approved responsibility values, supported verification methods, and the profile and catalog versions used to derive the set. An invented control ID or unresolved threat reference fails the build.

This prevents a plausible document from becoming a published security contract while it still contains broken traceability. It also makes the change reviewable in version control.

## Language checks protect testability

The linter flags words such as "appropriate," "adequate," "secure," and "regularly" when the requirement does not define an observable condition or interval.

It also detects compound obligations. A sentence that requires tenant authentication, route validation, network isolation, and audit logging should normally be split into separate requirements. Each property needs its own pass or fail result and its own evidence.

The linter does not determine whether the architecture is secure. It checks whether the requirement is precise enough for a reviewer or verification tool to make that determination.

## Publication creates a versioned security contract

After validation, the plugin publishes the requirements with the service-profile digest, catalog version, threat-model version, and blast-radius version used during derivation.

```text
EKS service profile
      + CIA and baseline decision
      + Kubernetes and cloud threats
      + blast-radius graph
      + responsibility mapping
                ↓
       validated requirements
                ↓
          published contract
```

The published artifact is not a compliance certificate and does not claim that the reference sample is production-ready. It is a stable contract that can be used for design review, implementation planning, testing, and future refresh.

## What this stage produces

The output is an atomic and traceable requirement set.

```yaml
requirement_set:
  service: aws-eks-saas-reference-architecture
  profile_digest: sha256:...
  baseline: NIST-800-53B-Moderate
  application_security: OWASP-ASVS-Level-2
  threat_model_version: eks-saas-threats-v1
  blast_radius_version: eks-saas-blast-graph-v1
  validation: passed
```

The next stage will explain how this contract changes when the cluster topology, tenant-isolation model, IAM bindings, ingress implementation, or operational commitments change. The requirement IDs and their evidence history must remain stable even as the EKS service evolves.
