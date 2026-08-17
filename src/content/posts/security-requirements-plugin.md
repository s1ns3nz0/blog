---
title: "Security Requirements Plugin: First Security Activity"
description: Claude plugin that derives security requirements from service descriptions and reviews security design.
pubDatetime: 2026-08-02T02:59:17+09:00
tags:
  - Security Design
  - Security Requirements
  - Compliance
  - AI
  - Plugin
featured: true
---

## Table of contents

# Security Before Source Code: What a Requirements-Derivation Plugin Does Differently

Repository: [github.com/s1ns3nz0/security-requirements](https://github.com/s1ns3nz0/security-requirements)

Security architects are rarely short of findings.

Static analyzers find unsafe data flows. Infrastructure scanners find exposed
resources and weak configuration. AI review plugins inspect code changes for
vulnerabilities. Threat-modeling tools reconstruct components and trust
boundaries, then enumerate ways the system could fail.

All of these are useful. None of them necessarily produces the artifact an
architect needs before implementation begins:

> A service-specific, compliance-backed security contract that states what the
> proposed architecture and its future implementation must satisfy.

That is the problem addressed by [`security-requirements`](https://github.com/s1ns3nz0/security-requirements), a Claude Code plugin
for design-stage requirements derivation. It can start with either a proposed
architecture description or an existing repository. It combines that technical
evidence with business facts that code cannot reveal, derives an impact and
control baseline, models service-specific threats, assigns cloud and customer
responsibilities, and writes verifiable development requirements.

The idea is not that AI-assisted security review is new. It is not. The
difference is the primary artifact, the point in the lifecycle at which it is
created, and the assurance boundaries maintained around it.

## The missing artifact in AI-assisted security

Consider three questions that sound similar but belong to different security
activities:

1. What could go wrong in this architecture?
2. What is wrong with this implementation?
3. What must this service satisfy?

The first is threat modeling. The second is implementation review. The third is
security requirements derivation.

Threats explain plausible adverse scenarios. Findings identify observed or
suspected weaknesses. Requirements state properties that must remain true.

For example:

- Threat: a retry after a blockchain transaction is broadcast could initiate a
  second sweep.
- Finding: the current handler records completion only after broadcast and has
  no durable operation identifier.
- Requirement: every sweep must have a persisted, unique operation identity;
  retries must reconcile that identity with on-chain state before another
  transaction is signed.

The requirement is the durable artifact. It can be reviewed against an
architecture before code exists, tested against an implementation later, and
linked to evidence during assessment.

This leads to a simple lifecycle separation:

```text
requirements derivation  design intent -> security contract
security design review   proposed architecture -> decisions against that contract
implementation review    code and deployment -> evidence or violations
```

Most security plugins concentrate on the second or third line. The distinguishing
goal here is to make the first line explicit and traceable.

## What the closest existing plugins produce

Several existing projects overlap with this concept. The important comparison
is not whether they use STRIDE, read repositories, or invoke an LLM. It is what
they treat as their source of truth and what they deliver.

| Project | Primary input | Primary artifact | Main lifecycle position |
|---|---|---|---|
| [`appsec-advisor`](https://github.com/matthiasrohr/appsec-advisor) | Repository code and configuration | Repository-grounded threat model, findings, mitigation plans, and requirements-audit results | Architecture and implementation review |
| [`tachi`](https://github.com/davidmatousek/tachi) | Architecture description, optionally generated from a repository | STRIDE and AI threat findings, risk scores, attack paths, compensating-control analysis, and reports | Threat modeling and vulnerability assessment |
| [Claude Code Security Review](https://github.com/anthropics/claude-code-security-review) | Code changes | Vulnerability findings | Implementation and pull-request review |
| `security-requirements` | Proposed design or repository evidence, plus confirmed owner intent | Tailored, traceable, verifiable security requirements | Requirements and design stage |

### The closest overlap: `appsec-advisor`

`appsec-advisor` is the nearest Claude Code plugin found during this review. Its
documentation describes repository-derived components, data flows, trust
boundaries, STRIDE findings, stable finding IDs, review decisions, and CI gates.
It also offers a requirements audit against a configured internal catalog or a
bundled fallback catalog.

That is substantial overlap. Calling it merely a source-code scanner would be
incorrect. It performs technical security architecture review grounded in the
repository.

The difference is the direction of the requirements flow.

`appsec-advisor` asks whether a repository satisfies an existing requirements
catalog. `security-requirements` derives the catalog that this particular
service should satisfy. It selects and writes requirements from confirmed
impact, control baselines, regulatory triggers, architecture-specific threats,
and the cloud responsibility model.

In abbreviated form:

```text
appsec-advisor
  existing catalog + repository -> audit results and findings

security-requirements
  intended service + owner decisions -> tailored requirement catalog
```

The two workflows are complementary. A derived requirement set could become an
input to a later requirements audit.

### Threat modeling is necessary but not sufficient

`tachi` is another meaningful overlap. It analyzes an architecture with STRIDE
and specialized AI threat agents, produces risk-ranked findings, and can inspect
a codebase for compensating controls. Its primary artifact is a threat and
vulnerability assessment.

That answers, “What could go wrong, and what defenses appear to exist?”

Requirements derivation asks an additional question: “Which security
obligations must remain in the delivery contract even when no modeled threat
happens to mention them?”

That distinction matters for completeness. A threat model is intentionally
selective and scenario-driven. A compliance baseline is deliberately broader.
Crossing them provides both relevance and coverage:

```text
threat AND baseline  -> high-priority requirement
threat only          -> additional service-specific requirement
baseline only        -> retained, lower-priority requirement
```

Dropping the third category produces a concise threat report, but not a
defensible control baseline. Dropping the second category produces a complete
catalog that misses business-logic risks. The value is in retaining both paths
and showing why each requirement exists.

### Vulnerability review begins later

Anthropic's Claude Code Security Review analyzes code changes for security
vulnerabilities. This belongs later in the assurance chain. It can identify an
unsafe authorization check, but it cannot infer with confidence whether the
business intends tenant isolation, zero acknowledged-data loss, a 30-minute
recovery objective, or human approval for an operational action.

Those are design facts. If they are absent, a reviewer is forced to guess the
security contract from the implementation—the artifact most likely to contain
the mistake.

## The design-stage derivation pipeline

The plugin starts by separating evidence from intent.

Technical evidence can come from a repository or from an architecture
description. It identifies components, entry points, managed services, data
stores, external integrations, deployment model, authentication mechanisms,
and storage regions where those are stated.

The service owner then confirms seven classes of information:

1. Data handled by the service and the service's role in holding it
2. Recovery-time and recovery-point objectives
3. User and tenant populations
4. External boundaries and data leaving the system
5. Fixed regulations, contractual obligations, and external interfaces
6. Existing organizational controls
7. Data-storage and user jurisdictions

The confirmation step is a hard gate. A model should not infer business impact
from code and quietly make it authoritative. A wrong recovery objective or user
region can change hundreds of downstream decisions while still producing
convincing prose.

After confirmation, deterministic scripts perform the parts that should not
depend on model memory:

```text
design description OR repository evidence + confirmed owner intent
  -> FIPS 199 impact
  -> NIST SP 800-53B baseline and ASVS level
  -> STRIDE/LINDDUN model at trust-boundary crossings
  -> regulatory overlay applicability
  -> cloud/team/organization responsibility
  -> crossed and prioritized requirement worklist
  -> atomic requirement drafts and verification criteria
```

The distinction between model and script is intentional. Models interpret
architecture, form threat scenarios, and write prose. Scripts validate control
identifiers, select baselines, apply overlays, classify responsibility, preserve
stable IDs, and prevent unsupported assurance-state transitions.

## A compact AWS payment example

Consider a serverless digital-asset payment design:

- API Gateway receives invoice-management requests.
- Lambda derives deposit addresses from an HD-wallet mnemonic.
- DynamoDB stores invoices and emits payment-state changes.
- A scheduled watcher queries an external blockchain RPC provider.
- A stream-triggered sweeper signs transactions and transfers funds to a
  treasury wallet.

A conventional code review can inspect authorization, validation, logging, and
IAM policies after those handlers exist. A threat model can identify RPC
spoofing, cross-merchant access, signing-key compromise, and replay.

Requirements derivation produces the contract earlier:

- Every invoice operation must verify ownership against an authenticated
  merchant identity.
- Token contract identity and payment-critical metadata must come from an
  approved source rather than caller assertions.
- A single RPC provider must not be sufficient to authorize an irreversible
  fulfillment or fund-transfer decision.
- The public invoice-generation process must not receive material capable of
  deriving deposit-wallet private keys.
- Every sweep must be idempotent across retries, timeouts, and partial failure.
- Payment-state transitions must be conditional on the expected previous state.
- Acknowledged invoice, approval, and audit records must survive service or node
  failure.
- Production payment state must be recoverable within the confirmed objective.

These are not descriptions of AWS settings. They are security properties. They
remain meaningful if the implementation moves from Lambda to containers or from
DynamoDB Streams to another event mechanism.

## Cloud specificity without requirement lock-in

Security architects still need AWS-specific decisions. The solution is not to
turn every requirement into a console instruction.

The requirement states the durable property:

> Payment records must be recoverable to a point before accidental deletion.

The AWS service layer then attaches responsibility and verification:

```yaml
responsibility: shared
csp_part: AWS operates the DynamoDB recovery mechanism.
team_part: Enable point-in-time recovery before accepting production records.
verification:
  method: iac_inspect
  target: the table's point-in-time recovery setting
  expect: enabled
evidence:
  - deployed infrastructure configuration
  - successful restoration exercise
  - applicable provider assurance report
```

This separation provides two benefits.

First, requirements survive architectural change. Second, provider inheritance
is not asserted as fact. AWS may supply a capability, but the team still has to
configure it, operate it, test it, and obtain evidence for any claimed provider
control.

Where the plugin lacks a curated service definition, it labels the service
classification `unverified`. A model-generated guess must not become an audit
claim merely because it sounds plausible.

## Requirements as the design-review contract

Once requirements exist, security design review becomes more disciplined. The
review is no longer a free-form question such as “Does this architecture look
secure?” Each requirement receives a decision:

- `pass`: the proposed design explicitly satisfies the property
- `conditional`: the design depends on an unresolved decision or planned control
- `fail`: the design contradicts or omits the property
- `not_applicable`: applicability was reviewed and justified
- `undetermined`: the design lacks enough information to decide

A decision should reference architecture evidence, an owner, and a verification
method. For example, a requirement for merchant-scoped invoice access cannot
pass merely because API Gateway requires an API key. The design must carry a
merchant identity through authorization and into each data operation.

This is where the plugin's pre-implementation focus becomes useful. The design
can fail before an insecure data model becomes expensive code.

## Assurance boundaries matter more when AI writes the prose

An AI-generated compliance document can be internally consistent, well
formatted, and wrong. The plugin therefore treats assurance as a one-way
funnel:

```text
authored
  -> trace-linked
  -> semantically reviewed
  -> implemented
  -> evidenced
```

No stage implies the next.

A requirement that cites a real control is not necessarily a correct reading of
that control. A semantically correct requirement is not necessarily implemented.
A configuration that appears implemented is not necessarily operating
effectively. A cloud-provider claim without current evidence is not inherited.

The plugin also preserves human decisions across refreshes. Review status,
exceptions, approvals, and evidence links belong to the reviewer. Generated
changes are proposed rather than silently overwriting them. Requirements are
retired with reasons instead of disappearing, and identifiers remain stable so
tickets and audit evidence do not shift after regeneration.

## Where this complements existing tools

The useful architecture is not one plugin replacing everything else. It is a
chain of distinct tools with explicit handoffs:

```text
security-requirements
  derives the contract
        |
        v
architecture review / appsec-advisor / tachi
  tests the design and threat model against the contract
        |
        v
SAST / IaC scanning / Claude Security Review / penetration testing
  find implementation violations and produce evidence
        |
        v
OSCAL or compliance-management tooling
  packages implementation and assessment artifacts
```

Outside the Claude plugin ecosystem, [OWASP SecurityRAT](https://owasp.org/www-project-securityrat/)
and [SD Elements](https://docs.sdelements.com/release/latest/guide/) are the
closest requirements-oriented predecessors. SD Elements is particularly close
at the product-concept level: it automates requirements from technology,
business, and compliance drivers and can use repository scanning to pre-answer
project questions.

The narrower claim for `security-requirements` is therefore not uniqueness. It
is an open, repository-local, inspectable derivation pipeline that treats the
security requirement set—not the finding—as its primary artifact.

## Conclusion

Security architecture needs discovery, but it also needs prescription.

Threat-modeling plugins help architects understand how a system may fail.
Security-review plugins help developers find weaknesses in code that has been
written. Compliance-as-code tools help organizations exchange and govern
control artifacts.

Requirements derivation sits before those activities. It converts intended
service behavior, business impact, architecture, threats, regulatory context,
and cloud responsibility into a security contract that can be reviewed before
implementation and verified afterward.

That is the practical difference: not another AI reviewer asking whether the
code looks secure, but a controlled way to decide what “secure” must mean for
this service before the code becomes the specification.

---

*This article describes a pre-release project. Generated requirements are
drafts, not legal advice, compliance certification, or evidence that controls
are implemented or effective.*

