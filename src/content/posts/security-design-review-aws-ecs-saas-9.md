---
title: "Security Design Review: AWS ECS SaaS (9) - CI/CD Verification"
description: Five deterministic gates that connect ECS SaaS requirements to CI/CD, from validating the requirement contract to tenant-boundary tests and image provenance.
pubDatetime: 2026-08-19T09:50:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - ECS
  - SaaS
  - Plugin
featured: true
---

The previous article showed how ECS SaaS requirements are checked against design, deployment, and operational evidence. The final step is to bring the checks into the delivery workflow so that a security decision is not revisited only after production has changed.

This stage does not turn the pipeline into a complete compliance assessor. It places deterministic gates around the requirements that can be checked before deployment and preserves the review items that still need human or environment-specific evidence.

## Table of contents

## The pipeline consumes requirement IDs, not a generic scanner score

The CI/CD workflow reads the published requirement set and evaluates the changes against the requirements that they can affect.

```text
pull request or deployment change
          ↓
affected requirement IDs
          ↓
source, IaC, image, and policy checks
          ↓
pass | fail | review_required
          ↓
deployment decision and evidence record
```

This is different from running a broad vulnerability scanner and storing its score. A scanner may find a package issue, but it does not know whether the changed CodeBuild role can modify every tenant stack or whether a new route crosses the control-plane boundary.

The requirement ID supplies that context. A check can report that `REQ-PLATFORM-ROLE-SCOPE-01` failed because a changed policy adds an account-wide permission, while a separate image finding remains associated with the task-runtime requirements.

## First gate: validate the requirement contract

Before evaluating the application change, the pipeline validates the requirement artifacts themselves. Control IDs must resolve to the bundled catalog. Threat and blast-radius references must resolve to the reviewed ECS SaaS models. IDs must be unique, required fields must be present, and the published profile digest must match the reviewed state.

This gate prevents a broken requirement set from becoming an accepted security decision. If a generated requirement refers to a nonexistent control or an outdated threat ID, the build fails instead of producing an apparently complete report.

The pipeline also checks that the requirement set was derived from the expected baseline and ASVS level. A change from a Moderate profile to a different impact level must be visible in the review rather than hidden inside a regenerated file.

## Second gate: inspect IaC and IAM changes

The ECS SaaS architecture depends heavily on infrastructure configuration. A pull request may change an ECS task role, a CodeBuild policy, a CloudFormation stack, a tenant-mapping table, an API route, or a security group without changing application source code.

The pipeline resolves the IaC change and checks the properties linked to the affected requirements. For task roles, it looks for unnecessary actions, wildcard resources, and access outside the service's approved data stores. For provisioning roles, it checks environment, account, and resource boundaries because those roles can reach the control plane.

A policy that adds `*` to a shared deployment role should not be treated like an ordinary configuration diff. Its blast-radius reference identifies the change as a platform-wide path and raises the result to a blocking review or failure according to policy.

## Third gate: verify tenant-boundary behavior

Static policy inspection is necessary but insufficient for a multi-tenant service. The pipeline should run negative authorization tests in an isolated environment or controlled test account.

The tests use one tenant's identity to request another tenant's data, submit a forged tenant identifier, invoke a tenant-management operation, and attempt to access an unrelated resource. The expected result is explicit denial before the protected data or lifecycle operation is reached.

The same test suite can cover Basic, Advanced, and Premium isolation configurations where those modes are supported. The purpose is not to assume that Premium isolation makes authorization irrelevant. It is to show which boundary is enforced by the application, which by infrastructure, and which by the control plane.

## Fourth gate: inspect container and deployment provenance

An ECS task runs a versioned container image. The pipeline therefore connects image provenance and dependency checks to the requirements for the application runtime and supply chain.

The image must be built from the reviewed source, scanned according to the organization's policy, and referenced by an immutable digest for deployment. A mutable tag can cause the deployed artifact to differ from the artifact that was reviewed.

The check does not claim that a clean vulnerability scan proves the service is secure. It verifies a narrower property: the image entering the deployment has a known origin, a recorded digest, and the required review status.

## Fifth gate: evaluate deployment and recovery changes

Changes to ECS services, load balancer routing, EventBridge rules, or CloudFormation custom resources can alter availability and recovery scope.

The pipeline compares the change with the RTO and RPO recorded in the service profile. If a change removes a backup, disables a stream, changes a tenant-mapping store, or widens a deployment role, it creates a review item for the corresponding recovery and blast-radius requirements.

Not every recovery decision can be automated before deployment. The pipeline can prove that a backup configuration exists or that a policy has not removed a required resource. It cannot by itself prove that a complete tenant recovery will meet the business objective without executing a controlled recovery exercise.

## Blocking and review-required results are different

The pipeline uses the assurance status defined in Part 8.

```text
fail
  A deterministic check contradicts a required property.

review_required
  The change affects a requirement, but available automation cannot decide it.

pass
  Current checks support the property and no required evidence is missing.
```

For example, an IAM policy containing an unauthorized wildcard can fail the build. A new external analytics integration may not fail automatically, but it should create a review-required result because data scope, retention, and privacy obligations need owner confirmation.

This distinction avoids treating automation limits as either false assurance or automatic deployment failure. The unresolved decision remains visible and can be approved only through the defined review process.

## Publish the result with the deployment evidence

Every pipeline run should publish the requirement IDs it evaluated, the source and IaC revisions, the container digest, the check results, and the profile and blast-radius versions used.

```yaml
deployment_review:
  requirement_set: ecs-saas-v1.4
  source_revision: 4f8c...
  image_digest: sha256:...
  checks:
    - requirement_id: REQ-TENANT-DDB-01
      status: pass
      evidence: artifacts/tests/cross-tenant-denial.xml
    - requirement_id: REQ-PLATFORM-ROLE-SCOPE-01
      status: review_required
      reason: new CloudFormation resource scope
  decision: review_required
```

The deployment decision is then connected to the same requirement record used in the design review. A later reviewer can see whether the deployed image, IAM policy, and test results correspond to the profile and architecture that were approved.

## What CI/CD can and cannot establish

The pipeline can validate references, inspect policy and IaC changes, run repeatable tenant-boundary tests, verify image provenance, and detect changes that widen the calculated blast radius.

It cannot establish legal compliance, prove that an organizational process is effective, or replace a qualified review of an unresolved privacy or recovery decision. Those items remain explicit review work rather than being converted into a green check by default.

## The result of the ninth stage

The security design review now has a path into delivery:

```text
service profile
  → CIA impact and baseline
  → threats and blast radius
  → owned requirements
  → evidence and lifecycle
  → CI/CD verification
  → controlled ECS deployment
```

The goal is not to make every security judgment automatic. It is to ensure that each deployment is evaluated against the requirements that describe this service, that deterministic failures stop the change, and that unresolved decisions are routed to an accountable review instead of disappearing into a generic scanner report.
