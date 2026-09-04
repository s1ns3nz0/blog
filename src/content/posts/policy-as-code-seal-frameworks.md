---
title: "Policy as Code Through the CI/CD Pipeline: What I Contributed to the SEAL Security Frameworks"
description: A four-page section on policy as code across the CI/CD pipeline, mapped to NIST SP 800-204D, merged into the SEAL Security Frameworks.
pubDatetime: 2026-09-04T21:10:00+09:00
tags:
  - Contribution
  - CI/CD Security
  - Supply Chain Security
  - NIST SP 800-204D
  - SSDF
  - Policy as Code
  - DevSecOps
featured: true
---

Last week a four-page section I wrote was merged into the [SEAL Security Frameworks](https://github.com/security-alliance/frameworks/pull/592). It covers policy as code across the CI/CD pipeline, mapped to NIST SP 800-204D. This post walks through what is in it and why each part is there.

## Table of contents

## Why this section exists

Most CI/CD security guidance tells you which settings to enable. Almost none tells you how you know those settings are still enabled next quarter, across every repository, without someone checking by hand.

A setting is a statement of intent. Anyone with access can change it, and nothing records that it changed or who changed it. A policy is a rule the pipeline evaluates on every run, and its output is a decision with a reason attached. The section is built on that distinction.

For a Web3 team the stakes are specific. Pipelines hold deploy keys and signing wallets, and publish packages that load into wallet frontends. An artifact that reaches production without a verifiable origin has taken the shortest available path to user funds.

---

## Page 1: Overview

The conceptual base. Roughly 240 lines.

### The basics

**PDP, PEP, and policy data.** The Policy Decision Point evaluates rules and returns a verdict with a reason. The Policy Enforcement Point acts on that verdict: a CI step exiting non-zero, a merge block, a deploy gate. Policy data is what the decision is made against, plus context like trusted builders and the exception register.

One PDP serves many PEPs. The engine that decides is the same at every stage; only the component acting on the verdict differs. Most adoption effort goes into wiring enforcement points, because rules are portable across platforms and enforcement points are not.

**Artifacts.** SBOM answers what components are in this software. Provenance answers which source, dependencies, environment, and process produced it. Attestation answers who claims a check was performed and whether that claim can be trusted.

**Associated frameworks.** NIST SP 800-218 (SSDF) gives technology-neutral practices organized around security outcomes. NIST SP 800-204D applies those outcomes to cloud-native CI/CD. Appendix A of 800-204D maps each pipeline task to an SSDF practice, so the work is reportable as SSDF conformance.

### What a policy engine provides

A policy engine answers one question: given this input, do the rules allow it? Rules become reviewable artifacts that live in Git, change through pull requests, and can be owned via CODEOWNERS. They are also testable, which matters more than it sounds: an untested rule that stops matching because a field was renamed produces the same green pipeline as a rule that works.

### Two enforcement modes

This is the part I think distinguishes the section from ordinary pipeline hardening advice.

**Mode 1 evaluates pipeline artifacts.** Workflow definitions, SBOMs, attestations, scan output. Things the pipeline produces.

**Mode 2 evaluates the platform's own configuration.** "Require signed commits" is a setting. "No repository in this organization permits self-approval, and the release gate fails when one does" is a policy. The first describes an intended state; the second is verified and recorded.

Mode 2 requires a collector that calls the platform API and shapes the response into JSON. That collector becomes part of the trust base. If its token is stolen or its output is modified, the engine evaluates fabricated data and returns a passing verdict.

---

## Page 2: Policy in the CI Pipeline

Commit, merge, and build. Roughly 528 lines, the longest of the four.

Each stage is described the same way: what arrives and who asserts it, what document the engine evaluates, where the decision is enforced, what is checked, and what the stage records for the next one. Each check is labelled `Deterministic` or `Judgment`, and most carry a small Rego example.

### Commit

What arrives is a set of source changes and a developer identity asserted by the SCM. Nothing upstream attests to that identity.

- **Commits are signed, and the signature is verified.** Requiring a signature and verifying it are separate controls. Confirming the signing key belongs to a current member means resolving the identity against a roster, which changes at every join and departure, so the rule reads it at evaluation time.
- **Sensitive paths require their owning team.** CODEOWNERS handles routing. Paths that determine pipeline behaviour need more: `.github/workflows/` decides what runs with access to secrets.
- **Dependencies are fully resolved, and truncation is a failure.** If the SCA tool stopped before resolving the full transitive graph, the result is an incomplete scan, and it is indistinguishable from a clean one unless the rule checks for it.
- **Analysis covers every language actually in use.** A pipeline that runs SAST on the primary language and skips Solidity reports a clean run without having examined those files.

### Merge

Two documents get evaluated here. The workflow definitions themselves, parsed from YAML into JSON before anything runs, which catches conditions branch protection cannot express. And the SCM account's own configuration, which is mode 2.

- **Required checks ran against the commit being merged**, bound to the head SHA rather than the branch.
- **Workflow definitions are evaluated before they execute.** A workflow can satisfy every branch protection rule while checking out untrusted code with secrets in scope.
- **Untrusted contributions cannot reach secrets.** `pull_request_target` combined with an untrusted checkout is the specific pattern.

### Build

- **Builds run only on approved, non-privileged, ephemeral runners.**
- **Everything the build consumes is pinned immutably.** A tag is a mutable pointer that can be moved without any change in the consuming repository. This is where the March 2025 `tj-actions/changed-files` compromise ([CVE-2025-30066](https://nvd.nist.gov/vuln/detail/CVE-2025-30066)) sits: over 23,000 repositories used the action, roughly 218 secrets leaked, and repositories that pinned by commit SHA were unaffected by the tag manipulation.
- **The attestation is produced by something more trusted than the build it describes.** A build that attests to its own integrity proves nothing about a compromised build.

---

## Page 3: Policy in Release and Runtime

Release, deploy, and runtime. Roughly 436 lines.

The earlier stages evaluate things the team controls directly. From here the artifact leaves those systems, and the gates read signed evidence about it.

### Release and publish

- **Signing is gated on the build policy result**, checked before signing runs.
- **Every publishing identity is org-owned, MFA-enforced, and on the current roster.** Account setup is not evidence of current authorization. This is mode 2 applied to a package registry: its member list and token inventory, compared against the organization roster. Most organizations never build this collector.
- **The published digest matches the attested digest**, and registry version immutability is enabled.
- **The release emits evidence bound to the artifact digest**: provenance, SBOM, and signature bundle.

### Deploy

- **The signature is verified before any claim inside the attestation is evaluated.** Reading claims from an unverified document is reading attacker input.
- **Provenance matches the approved build process**: builder identity, source repository, ref.
- **Missing evidence produces refusal, not an assumption of good faith.** This refusal is what makes the CI pipeline enforceable. Without it, the build can be as careful as it likes and nothing prevents a different artifact from reaching production under the same version number.
- **An attested vulnerability scan exists and is recent enough for this tier.** The age threshold is derived rather than guessed, using the tiering from the governance page.

### Runtime

- **Declared state pins digests, not tags.**
- **Drift is detected continuously.** A deployment that matched policy at admission can diverge afterwards.
- **Changes arrive through the pipeline, never through an operator's terminal.**

### Where the chain actually breaks

The page closes by naming the two stages that hold by convention alone.

The commit stage rests on an identity the SCM asserts and nothing attests to. A phished session token satisfies every check in that stage, and everything downstream inherits the result.

The publish stage usually emits evidence that nothing downstream reads. The package ships, the provenance is either absent or unverified by any consumer, and the record stops there. For a team shipping npm packages into wallet frontends, this is the widest gap in the sequence.

---

## Page 4: Governing the Policy Set

The organizational half. Roughly 355 lines. The rules are code; the decisions about who may override them are not.

### Class, not just severity

Severity measures how bad a finding is. Class measures something else: whether anyone is entitled to decide about it. A Critical vulnerability and an unpinned action can both block a release, but only the first has a person who can reasonably say "ship anyway, and here is why."

Four outcomes, each decided in advance:

| Class | Outcome | Decided by | Expiry |
|---|---|---|---|
| Deterministic | No-Go, no in-pipeline override | No one; the input is fixed | None |
| Judgment | No-Go pending explicit decision | Named owner of the rule | 90 days, then re-decided |
| Unclassified | No-Go | Rule author and a security reviewer | Until a class is assigned |
| Engine failure | No-Go | No one; treated as an incident | None |

Unclassified blocking by default is deliberate. If new rules shipped as advisory until proven necessary, every rule would enter service as a no-op and the rule set would document controls that are not enforced.

The engine-failure row is where the PDP and PEP separation becomes operational. When the decision point is unavailable, the enforcement point acts without a verdict. An enforcement point that fails open converts every engine outage into an organization-wide bypass that leaves no record.

### Where thresholds come from

"Block Critical, track Low" appears in a great deal of documentation, this framework included, without an explanation of why the line sits at that point. A threshold that cannot be derived will not be defended when it blocks a release.

Two properties of the artifact determine it:

**Reachability.** If this artifact is malicious, what does it touch? A library loaded by a page where users sign transactions is not equivalent to an internal dashboard.

**Reversibility.** A cluster deployment rolls back in minutes. A published npm version is already on other machines and cannot be recalled; removing it from the registry does not remove it from lockfiles that already pinned it. An on-chain upgrade may be irreversible.

Combining the two produces the tiers, and they live in policy data rather than hardcoded in rules.

### Overrides are data, not edits

An exception carries three fields: the rule it suppresses, an owner, and an expiry. It lives in a checked-in file under the same review as the rules, and once the expiry passes it stops suppressing anything. The page includes a Rego example where a violation is emitted as a structured record, `suppressed` reads the exception register, and `blocking` collects anything neither downgraded nor covered by a live exception. Four states: unpinned action produces a violation, no exception blocks, live exception clears, expired exception blocks again.

### Metadata that ties the chain together

**The artifact digest is the join key.** Commit SHAs identify source and tags identify releases, but only the digest identifies the exact bytes that were built, signed, deployed, and are running. Records keyed by version string cannot distinguish two builds of `v1.2.3`.

Evidence is stored outside the pipeline run that produced it, because evidence a compromised run can rewrite is not evidence.

### Owning and maintaining the policy set

Rules live in one repository and ship to consumers as versioned, signed bundles. A named team owns the set and reviews every change through CODEOWNERS. New rules go dry-run, then warn, then block, each with an enforcement date set at creation. Chronically renewed exceptions are treated as broken rules rather than accepted risk, and rules that have not fired in a year get an explicit keep-or-retire decision.

---

## Notes on the examples

Every Rego snippet was validated against OPA before it shipped. One bug only surfaced by running the fixtures: `sprintf` with `%.0f` on an integer produced `%!f(int=22)` rather than the number.

The snippets are fenced as `python` in the published pages. The site's syntax highlighter has no Rego grammar and an unrecognized language fails the build. A maintainer has since filed issues upstream with Shiki and vocs to fix this properly.

The examples are illustrative. Two things have to come from the adopting organization: the input structure, which depends on which SCM, registry, and CI platform it runs, and the rule content, which is a statement of what the organization has decided to require. Deriving those requirements from a team's own threat model and incident history is the work the examples do not do.

## Links

- Merged PR: https://github.com/security-alliance/frameworks/pull/592
- SEAL Security Frameworks: https://frameworks.securityalliance.org
- [NIST SP 800-204D](https://csrc.nist.gov/pubs/sp/800/204/d/final)
- [NIST SP 800-218 (SSDF)](https://csrc.nist.gov/pubs/sp/800/218/final)
