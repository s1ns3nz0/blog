---
title: "Deriving Security Requirements for a Lightning-Paid Scan Service"
description: "Running my security-requirements plugin on the OpenCTI paid scan service: a confirmed profile, a FIPS 199 impact, eleven service-specific threats, a confirmed risk batch, and nineteen verifiable requirements, three of which no baseline control would have produced."
pubDatetime: 2026-10-04T19:50:00+09:00
tags:
  - Security Requirements Plugin
  - Security Requirements
  - Security Design
  - threat-modeling
  - Lightning Network
  - L402
---

The [Security Requirements plugin](/posts/security-requirements-plugin/) exists to fill one gap in DevSecOps. Shift-left tooling is everywhere for code, dependencies, and infrastructure, but the first stage of the lifecycle, deciding what a service must satisfy, is mostly left to a document someone writes by hand, or doesn't. The plugin derives that contract from the service's characteristics, its operating environment, its compliance obligations, and its tech stack.

This post runs it end to end on a real service: the OpenCTI paid scan service from [Lightning Payments for OpenCTI](/posts/adding-lightning-payments-to-opencti-with-aperture/), where customers verify a domain, pay over Lightning (L402) or x402, and get an attack-surface scan run as a Kubernetes Job.

It ran against a separate git worktree of the repository at commit `4988a85`, so the generated files didn't touch my working tree. Uncommitted changes in that tree were not part of the analysis.

## 1. The profile: what code can't say

The plugin first reads the repository and fills in what code can tell it, recording a file and line as evidence for each value so they can be checked at the confirmation step:

| Inferred | Value |
|---|---|
| Cloud | None: local Kubernetes |
| Deployment | Deployments, plus one Kubernetes Job per scan |
| Stack | Python, FastAPI, PostgreSQL, plus Go and Node for the payment components |
| Authentication | Workspace API keys |
| External integrations | The Lightning payment gate and node, an x402 facilitator, and the customers' scan targets |

Then it asks seven questions no repository can answer: what data the service handles, how much downtime and data loss it can tolerate, who uses it, what leaves its boundary, which obligations are fixed, which interfaces it doesn't control, and where data and users are. My answers, in short: contact details, credentials, payment and order records, and customer-owned scan evidence; recovery within hours, **no loss of a committed record**, and an outage stops revenue; multi-tenant business customers; L402 and x402 as protocols the service must accept as they are; no existing organisational controls; data and users in Korea.

One answer was missing on the first pass, the recovery point, and the plugin refused to continue rather than guess. That's deliberate. A wrong recovery objective quietly changes dozens of requirements downstream while still producing convincing prose.

## 2. Impact and baseline

From the confirmed profile, a deterministic script derives the FIPS 199 impact:

```text
Confidentiality MODERATE   contact details, payment records, customer-owned evidence
Integrity       MODERATE   payment and order records, customer-owned evidence
Availability    MODERATE   recovery in hours; no committed record lost; outage stops revenue

System impact: MODERATE  (high water mark)
Baseline: nist-800-53b-moderate  ->  287 controls
ASVS level: L2
Privacy baseline: 96 controls
Regulatory overlay: PIPA (Korea) / ISMS-P
```

API keys and database credentials score High on their own, but the plugin keeps them out of the water mark and says so: they're system information present in nearly every service, and counting them would push every application onto the High baseline.

It also flagged the two payment protocols. Because L402 and x402 are interfaces this service doesn't control, any requirement that would change what the protocol accepts is refused before it's written, and the control moves to the side the service owns.

## 3. A threat model of this service, not of services in general

The threat model starts from a data flow diagram with eight trust boundaries: tenant to API, API to the Aperture gateway, settlement back into order state, API to the L402 challenge store, dispatcher to scanner Job, scanner Job to the internet, API to logs, and API to the handoff export. STRIDE runs per boundary crossing, LINDDUN runs because personal data is present, and every threat has to pass one test: could this sentence have been written without knowing anything about this service?

Eleven threats came out. Each has a likelihood and impact proposed from a 5×5 policy; the model proposes, the engine calculates, and nothing is authoritative until a person confirms the batch. The result was three High and eight Medium, all eleven assessed and confirmed. By area:

| Area | Threats | What they're about |
|---|---:|---|
| Tenant isolation | 1 | One tenant reaching another tenant's scan evidence |
| Payment integrity | 3 | A payment counted twice, a paid order that never runs, and payment records surviving a restore |
| Scanner reach | 3 | The scanner being steered somewhere it was never authorised to go |
| Secrets in transit and at rest | 3 | Payment proofs and credentials ending up where others can read them |
| Privacy | 1 | Payments linkable to customer identity (LINDDUN) |

None of these is a generic web-vulnerability class. Each names a flow of this service, such as the hop between the API and the payment gate, or the path from a verified domain to the scanner's outbound connections. A few came from reading the code rather than the design documents, where an implementation detail had a consequence the design didn't mention. That's not a finding that the service is broken; it's where a requirement has to state what must stay true.

## 4. Crossing threats with the baseline

The core step crosses the threat model with the 800-53 baseline:

```text
Baseline x threat model

    10  threat and baseline (raised priority)
     3  threat only (ADDITIONAL requirements)
     5  forced by a declared data type
   340  baseline only (retained, lower priority)
```

The **threat only** row is the reason the plugin exists. One payment unlocking two orders, a paid order that never dispatches, and payment linkability have no related control anywhere in the baseline. A team that downloaded the Moderate baseline and filtered it would never have written requirements for them.

## 5. Nineteen requirements

Each requirement is atomic, states a property instead of an implementation, and carries its basis and a way to verify it. The profile's locale was Korean, so the generated text is Korean; these are translations of three of them:

> **REQ-SETTLEMENT-SINGLE-CLAIM-01**: One settlement identifier must belong to exactly one tenant, order, scope hash, and challenge.
> *Verify:* present a settled proof on a second order's payment endpoint; the second order must not become paid. *Basis:* a payment-replay threat, no baseline control.

> **REQ-PAID-DISPATCH-DURABILITY-01**: For an order whose settlement is confirmed, exactly one scan dispatch record must be created, even if the process stops in between.
> *Verify:* a fault-injection test that kills the process right after settlement; after restart, one dispatch record and no second charge. *Basis:* a paid-but-not-dispatched threat, no baseline control.

> **REQ-SCAN-CONNECT-TIME-ADDRESS-CHECK-01**: Every time a scan Job connects to a target, the actual connection address must be checked, at connection time, to be outside private, loopback, link-local, and metadata ranges.
> *Verify:* a fixture domain that re-resolves to an internal address after verification; the connection is refused and the check recorded as failed. *Basis:* SC-7, AC-4.

The linter ran before anything was published. A cited control that isn't in the bundled catalogue is a blocking error, because one invented identifier discredits the whole document. My first draft also failed it on fourteen counts, all the same mistake: I'd run it without the risk assessment, so every threat reference looked unknown. With the assessment passed in, and five requirements given a control basis, two of them also narrowed to a single obligation, it came back with no errors or warnings.

The plugin published three documents: `requirements.md`, `traceability.md` (control to requirement, for an auditor), and `responsibility.md`.

## 6. What it does and doesn't claim

The ISMS-P overlay, run against the finished document, reports where it actually stands:

```text
   101  assessed criteria
    95  a control in the catalogue expresses it
    94  a selected control addresses it
    14  trace-linked candidate requirements with a way to check them
     0  independently reviewed semantic clause mappings

    80  deferred -- the baseline selected them and no threat reached them
     0  gap -- prioritised by a threat or a data type, nothing written
```

Zero gaps means every clause a threat or a data type made important has a requirement against it. Fourteen trace-linked doesn't mean fourteen clauses are met: the link is structural, nobody has reviewed it semantically, and nothing has been implemented. Thirty-seven clauses are reachable only through organisational controls, and with no organisational controls declared, no requirement here can close them. Six clauses, such as resident registration numbers and cross-border transfer, have no 800-53 counterpart at all.

The plugin is explicit about the stages it covers: selected, authored, trace-linked, and at most semantically reviewed. It never claims implemented, evidenced, or compliant. Residual risk is `UNDETERMINED` for all eleven threats, because a written requirement isn't evidence that anything changed.

## Result

For the paid scan service, the plugin turned a running codebase and seven answers into a confirmed threat model and nineteen verifiable requirements, three of them for risks no baseline control expresses: payment replay across orders, a paid order that never dispatches, and payment linkability. Those three are the work I'd have missed by starting from a control list.

The full threat model and risk register stay out of this post. They describe where data lives and which controls aren't implemented yet, which is exactly the document the plugin itself warns against publishing.
