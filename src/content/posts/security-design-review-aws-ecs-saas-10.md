---
title: "Security Design Review: AWS ECS SaaS (10) - Regulatory Overlays"
description: Applying PIPA/ISMS-P and customer contractual obligations on top of the ECS SaaS baseline, and why tenant deletion and cross-border data flow stay explicit review items.
pubDatetime: 2026-08-19T09:52:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
featured: true
---

The ninth article connected the security contract to CI/CD. That makes implementation checks repeatable, but a deployment gate cannot decide every obligation that applies to a service.

The ECS SaaS platform processes customer data, serves users in Korea and Japan, and operates under customer availability and deletion commitments. Those facts create privacy, contractual, and governance work that must be tracked alongside the NIST baseline rather than hidden inside it.

## Table of contents

## A regulatory overlay is not a replacement baseline

The plugin keeps two decisions separate.

```text
CIA impact
  How harmful would disclosure, alteration, or outage be?

Regulatory and contractual overlay
  What duties apply because of the data, users, or commitments?
```

The ECS service is Moderate on all three CIA dimensions, so the NIST SP 800-53B Moderate baseline is selected. A customer-data processing agreement or a PIPA/ISMS-P trigger can add requirements even when the system impact remains Moderate.

Conversely, declaring a regulation does not prove that the service is compliant. The overlay identifies obligations, maps them to available controls where possible, and leaves legal or organizational decisions visible for review.

## Why this ECS SaaS scenario activates privacy work

The platform handles tenant contact details, account information, transaction history, logs, audit records, and backups. Some of those records may identify individuals directly, while others can become identifying when combined with tenant or device metadata.

The control plane also maintains tenant mappings and lifecycle records. Those records may not be customer-facing data, but they can reveal the relationship between a customer and its environment and can affect deletion, access, and incident response decisions.

The profile therefore activates privacy analysis even where the public application pages contain no sensitive content. Data must be followed across the ECS task, DynamoDB, logs, backups, events, and operational tooling.

## PIPA and ISMS-P are treated as an overlay

Because the declared user population includes Korea, the plugin applies its PIPA/ISMS-P mapping as an analysis overlay. It identifies relevant areas such as personal-information governance, asset and data-flow identification, access control, logging, incident response, retention, and deletion.

The mapping is not a certification result or a legal opinion. It is a traceable way to connect declared obligations to security requirements and to show which areas are not covered directly by the NIST catalog.

For the ECS platform, this commonly produces requirements for identifying where tenant personal information is stored, limiting access to that information, recording administrative actions, managing retention, and proving deletion requests were handled across the relevant stores.

## Tenant deletion is a cross-service obligation

Deletion cannot be implemented as a single `DELETE` call against the primary DynamoDB table. The platform may hold tenant information in application tables, tenant-mapping records, audit logs, backups, deployment metadata, event payloads, and recovery copies.

The requirement should define the scope of the deletion request, the systems that must be checked, the exceptions for legally required retention, and the evidence that the action completed. The control plane must also ensure that a tenant deletion request cannot be invoked by an ordinary tenant administrator unless the service contract explicitly permits it.

This is why the deletion requirement links to both privacy obligations and blast-radius analysis. A defect in a tenant-specific application path may affect one customer. A defect in the shared deletion workflow can leave records for many customers or delete the wrong tenant's data.

## Customer contracts add operational requirements

The service profile declares a customer data-processing agreement, an availability SLA, and a tenant-data deletion obligation. These commitments lead to requirements beyond technical access control.

The platform must identify who acts on a customer request, how the request is authenticated, how progress is recorded, and how completion is communicated. The availability SLA must be connected to monitoring, incident handling, recovery objectives, and evidence that the service can restore the required tenant state.

The plugin does not assume that a contract's exact wording can be inferred from the AWS sample. The service owner must confirm the target, scope, and exceptions. Until then, the requirement remains a review item rather than a completed control.

## Data location and cross-border questions remain explicit

The profile currently places primary storage in `ap-northeast-2` while users include Korea and Japan. That fact is useful, but it does not by itself resolve every transfer or residency question.

The review must account for AWS service regions, support access, log destinations, backup copies, external analytics, and operational personnel. A new provider or replication target can introduce a cross-border flow even when the primary DynamoDB table remains in Seoul.

If the repository cannot establish whether a data flow is permitted, the plugin records an unresolved applicability question. It does not infer that the flow is acceptable merely because the destination is another AWS service.

## Map obligations to controls and retain gaps

The overlay output distinguishes three cases.

```text
direct mapping
  A NIST or application requirement clearly addresses the obligation.

partial mapping
  A control covers the technical part, but process or legal work remains.

unmapped obligation
  No bundled control expresses the requirement completely.
```

For example, access enforcement can map to NIST access-control requirements, while a customer notice or a specific data-subject request process may remain organizational work. The gap is recorded rather than forced into a misleading technical control.

## What this stage produces

The result is an overlay report linked to the same requirement IDs used by design review and CI/CD.

```yaml
overlays:
  - id: pipa_isms_p
    status: applicable_candidate
    linked_requirements:
      - REQ-TENANT-DDB-01
      - REQ-AUDIT-LIFECYCLE-01
      - REQ-TENANT-DELETION-01
    gaps:
      - deletion_evidence_across_backups
      - cross_border_support_access_review
  - id: customer_data_deletion
    status: declared
    owner: service-owner
    review_required: true
```

This output does not claim that the ECS SaaS platform satisfies PIPA, ISMS-P, or its customer contracts. It shows which obligations are in scope, which requirements support them, which evidence is still needed, and where a legal or organizational decision remains open.

The result completes the link between security requirements and the wider operating context. Technical controls remain testable, while privacy, contractual, and governance duties stay visible throughout design, delivery, and operation.
