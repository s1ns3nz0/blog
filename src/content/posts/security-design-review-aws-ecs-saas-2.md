---
title: "Security Design Review: AWS ECS SaaS (2) - CIA Impact and Baseline"
description: Calculating confidentiality, integrity, and availability impact for the AWS ECS SaaS reference architecture, and why holding customer data pulls in a privacy baseline and a regulatory overlay.
pubDatetime: 2026-08-18T00:03:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - ECS
  - SaaS
  - Plugin
featured: true
---

Part 1 built a confirmed profile for the AWS ECS SaaS reference architecture: a multi-tenant platform with a control plane and an application plane, customer contact and transaction data, an hours-level recovery objective, and customers in Korea and Japan.

The question for this stage is direct:

> Given this profile, how much would loss of confidentiality, integrity, or availability actually cost, and what does that imply for the control baseline?

```text
Confirmed service profile
        ↓
Data types + recovery objectives
        ↓
CIA impact
        ↓
NIST baseline + ASVS level + applicable overlays
```

## Table of contents

## 1. Confidentiality: customer-owned data sets the level

The profile declares seven data types. Four of them carry distinct confidentiality weight.

| Data type | Confidentiality | Why |
|---|---|---|
| Customer contact details | Moderate | Belongs to a customer; the platform holds it on their behalf |
| Transaction and settlement records | Moderate | Same processor relationship |
| Public content | Low | Intended for publication |
| Application logs | Low | Operational, not customer-facing by design |

Audit logs and backups are not classified independently. They inherit the highest confidentiality level present in what they capture, so both come out at Moderate in this profile once the excess contributed by system information (below) is set aside.

## 2. Why account credentials do not push confidentiality to High

Password hashes, session tokens, and recovery codes are also declared, and on their own they are High confidentiality. Left in the calculation unmodified, they would drag the whole system to High.

The plugin treats them as system information rather than business data. System credentials are excluded from the confidentiality high-water mark for the same reason described in the movie-rating example earlier in this series: nearly every service holds some form of credential, so folding it into the general business-impact calculation would push almost any authenticated system to High and make the resulting control set impractical.

Excluding credentials from the water mark does not exclude them from requirements. The profile still forces a dedicated `credential_storage` requirement, separate from the general confidentiality result, so the obligation to protect stored credentials is not lost, only kept out of the number that decides the baseline.

## 3. Integrity: correctness of tenant and platform data

Integrity is calculated the same way, data type by data type.

| Data type | Integrity | Why |
|---|---|---|
| Customer contact details | Low | Incorrect contact details are an inconvenience, not a platform failure |
| Transaction and settlement records | Moderate | Incorrect orders or settlement directly affect customer operations |
| Public content | Moderate | Notices and catalogue data need to remain trustworthy |
| Application logs | Low | Operational detail, not a customer-facing property |

As with confidentiality, audit logs and backups inherit the highest integrity level captured in what they record, and account credentials are tracked separately as system information rather than folded into the business-data result.

## 4. Availability: revenue and platform dependency raise the floor

The owner-confirmed recovery objectives are hours-level recovery and zero acknowledged data loss, with two amplifiers declared: an outage stops revenue directly, and other internal systems depend on this service.

| Factor | Contribution |
|---|---|
| RTO of hours | Moderate |
| RPO of zero | Moderate |
| Revenue depends directly on availability | Moderate |
| Other platform functions depend on this service | Moderate |

Every factor lands on Moderate independently. There is no single dominant amplifier here, just four separate reasons that all clear the same bar.

## 5. The high-water mark, with two axes tied

```text
System impact
  = max(Confidentiality, Integrity, Availability)
  = max(Moderate, Moderate, Moderate)
  = Moderate
```

Unlike the movie-rating example earlier in this series, where integrity alone drove the system impact, this profile reaches Moderate from confidentiality and integrity independently, with availability confirming the same level from an unrelated set of facts. The baseline is not resting on one fragile data point.

## 6. Holding customer data changes the obligations, not the level

Customer contact details and transaction records are both marked `customer_owned` in the profile. That modifier does not move either axis: the sensitivity of the data does not change because the platform is holding it for someone else rather than processing it for itself.

What it does change is who is harmed by a loss and what is owed when that happens. Holding data on a customer's behalf typically brings a processing agreement, a deletion obligation triggered by the customer's own instruction, and a notification duty that runs to the customer rather than only to a regulator. None of that is reachable from a control catalogue keyed only on "this service holds data of type X."

It also displaces the jurisdiction question. Regulatory triggers in this pipeline are normally gated on the regions of the platform's own users. For data the platform holds on a customer's behalf, the relevant jurisdiction is the customer's, which this profile does not ask about. The resulting `data_processor_obligations` requirement is scoped to the platform's own position, not a claim about the customer's regulatory exposure.

## 7. NIST baseline and ASVS level

Moderate system impact selects the NIST SP 800-53B Moderate baseline, and the confirmed HTTPS API surface selects OWASP ASVS Level 2, the same mapping used throughout this series.

```yaml
impact:
  confidentiality: moderate
  integrity: moderate
  availability: moderate
  system: moderate
baseline: nist-800-53b-moderate
asvs_level: 2
```

## 8. Privacy baseline: personal data changes the working set

The movie-rating example never triggered the Privacy baseline, because it declared no personal data. This profile does: customer contact details are personal data, so the Privacy baseline applies.

```text
NIST SP 800-53B Moderate baseline
Privacy baseline (because basic_contact is personal data)
Program controls
        ↓
merged working set: 350 controls
```

The 350-control figure is the union of the Moderate security baseline, the 96 privacy-specific controls, and the 32 organization-level Program controls, after removing duplicates. It is a starting review set, not 350 implementation tickets. The next stages in this series narrow it by responsibility and by which threats actually reach each control.

## 9. PIPA/ISMS-P overlay, and the Japan gap

Korean users combined with personal data trigger the bundled PIPA/ISMS-P overlay.

```yaml
regulatory_flags: [pipa_general]
applicable_overlays: [pipa-isms-p]
```

Japan is also a declared user region, and the profile records personal data reaching Japanese users. The bundled catalog does not currently model a Japan-specific privacy regime, so the tool cannot raise an equivalent overlay for it. The plugin does not read that silence as an answer:

> This tool models no data protection regime for Japan, and personal data is declared for users there. The overlay list is this repository's coverage, not a finding that nothing applies. Most jurisdictions in this position have one.

That unresolved item goes into the review queue rather than being quietly dropped, the same handling this series has used for every other `UNDETERMINED` or uncovered value.

Storage location adds a second wrinkle. Data is stored in `ap-northeast-2`, inside Korea, while some of the users it concerns are in Japan. From the Japanese users' perspective, that storage location is offshore. The profile records this as a cross-border fact to review, not as a violation, since whether it is permitted depends on contractual and legal terms this repository cannot see.

## 10. What crosses the boundary and remains open

The profile declares one external integration: an optional federated customer identity provider. What data would be sent to it is marked undetermined.

```yaml
external_integrations:
  - name: customer_identity_provider
    purpose: optional_federated_authentication
    data_sent: UNDETERMINED
```

An optional integration that nobody has configured yet still belongs in the profile. If a customer later federates their own identity provider into this platform, the data-sharing question needs an answer before that flow ships, not after.

## What Part 2 established

The ECS SaaS platform has the following CIA impact:

```text
Confidentiality: Moderate
Integrity:       Moderate
Availability:    Moderate
System impact:   Moderate
```

As a result:

- The plugin selects the NIST SP 800-53B Moderate baseline and OWASP ASVS Level 2.
- The Privacy baseline applies because customer contact details are personal data, adding 96 privacy controls.
- Combined with 32 Program controls, the baseline, privacy, and program sets merge into a 350-control working list.
- The PIPA/ISMS-P overlay applies for Korean users; Japan has no equivalent overlay in the bundled catalog and is flagged for review instead of being treated as clear.
- Holding customer data on the customer's behalf adds processing, deletion, and notification obligations without moving either CIA axis.

Part 3 uses this working set as the backdrop for a nine-boundary STRIDE threat model across the control plane and application plane.
