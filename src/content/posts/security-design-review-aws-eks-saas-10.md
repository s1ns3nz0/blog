---
title: "Security Design Review: AWS EKS SaaS (10) - Regulatory Overlays"
description: Applying PIPA/ISMS-P and customer contractual obligations on top of the EKS SaaS baseline, and why tenant deletion is a control-plane workflow, not a single DynamoDB delete.
pubDatetime: 2026-08-21T15:15:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
  - Kubernetes
featured: true
---

The CI/CD stage can gate repeatable technical properties, but it cannot decide every obligation created by customer data, user geography, contracts, or privacy law. Those obligations are tracked as overlays on the EKS SaaS security contract.

## Table of contents

## Regulatory overlays are not a replacement baseline

```text
CIA impact
  How harmful would disclosure, alteration, or outage be?

Regulatory and contractual overlay
  What must the organization do because of the data, users, or commitments?
```

The provisional EKS profile is Moderate, so the NIST SP 800-53B Moderate baseline remains the security starting point. A PIPA/ISMS-P trigger, customer data-processing agreement, or deletion promise can add requirements without changing that baseline.

Declaring an overlay does not prove compliance. The plugin maps obligations to technical and organizational requirements and records gaps that require owner or legal review.

## The EKS data boundary is wider than the application tables

Tenant contact information, user attributes, authentication configuration, product data, orders, tenant mappings, logs, backups, container artifacts, and deployment records may all be in scope.

The tenant-management table can connect a customer domain to a Cognito user pool and Kubernetes namespace. Logs or build artifacts may contain identifiers that are not present in the main DynamoDB records. Privacy review must therefore follow data through EKS, AWS services, CI/CD, backups, and support access.

## Deletion is a control-plane workflow

A tenant deletion request cannot be reduced to deleting one DynamoDB table. The process may need to address product records, order tables, tenant mappings, Cognito pools, namespaces, ingress objects, logs, backups, and deployment metadata.

The requirement must define who can request deletion, how the request is authenticated, which systems are checked, which retention exceptions apply, and what evidence proves completion. A shared deletion workflow has platform-wide blast radius if it selects the wrong tenant or leaves data behind for many tenants.

## PIPA/ISMS-P and customer commitments

For users in Korea, the plugin applies a PIPA/ISMS-P analysis overlay. It identifies areas such as personal-information governance, data-flow identification, access control, logging, incident response, retention, and deletion.

The mapping is not a certification opinion. It shows which obligations have a direct control relationship, which are only partially covered, and which remain organizational or legal work.

Customer contracts add a separate availability and processing layer. An SLA must connect to monitoring, incident handling, RTO/RPO evidence, and recovery tests. A data-processing agreement must connect to roles, instructions, support access, deletion, and notification responsibilities.

## Region and transfer questions remain explicit

The analysis may declare storage in `ap-northeast-2` and users in Korea and Japan, but that does not answer every transfer or residency question. CloudFront, Cognito, ECR, logs, backups, AWS support access, and external processors may introduce additional locations or access paths.

When the repository cannot establish whether a transfer is permitted or how long a copy is retained, the plugin records an unresolved applicability question rather than assuming the flow is acceptable.

## Map obligations and retain gaps

```text
direct mapping
  NIST or application requirement clearly addresses the obligation

partial mapping
  technical control exists, but process or legal work remains

unmapped obligation
  no bundled control expresses the obligation completely
```

For example, access enforcement can map to AC controls, while a privacy notice, data-subject request process, or contractual notification deadline may remain outside the technical catalog.

## Output of the overlay stage

```yaml
overlays:
  - id: pipa_isms_p
    status: applicable_candidate
    linked_requirements:
      - REQ-EKS-TENANT-CONTEXT-01
      - REQ-EKS-AUDIT-LIFECYCLE-01
      - REQ-EKS-TENANT-DELETION-01
    gaps:
      - deletion_evidence_across_backups
      - support_access_review
  - id: customer_data_processing
    status: declared
    owner: service-owner
    review_required: true
```

The result does not claim that the EKS SaaS sample satisfies PIPA, ISMS-P, or a customer contract. It records which obligations are in scope, which requirements support them, which evidence is missing, and which decisions need accountable review.

This completes the initial EKS SaaS review series. The technical security contract now connects service analysis, CIA impact, threats, blast radius, ownership, requirement authoring, lifecycle, evidence, CI/CD, and operating obligations.
