---
title: Palantir ADS
description: Palantir's methodology to enhance its detection engineering
pubDatetime: 2026-07-19T01:43:11+09:00
tags:
  - Detection
  - SOC
  - Detection as Code
featured: true
---

## Table of contents

# Palantir ADS (Alerting and Detection Strategy) Framework

> Source: Palantir, *Alerting and Detection Strategy Framework* — https://github.com/palantir/alerting-detection-strategy-framework

## Why It Was Created

It originated from a problem Palantir's Incident Response team was running into. Engineers were writing detection logic ad hoc, based on intuition rather than structured hypotheses; there was little to no documentation of why a given alert fired; and there was no peer review process. The result was a steady accumulation of low-quality alerts in production, which led to "alerting apathy." The ADS Framework was built to fix this — a methodology that forces every detection rule to be documented through a **natural-language template**.

## Core Principle — All 9 Sections Are Required Before Production Deployment

Before a new Alerting and Detection Strategy (ADS) can go to production, all 9 of the following sections must be filled in. If even one is left blank, the alert isn't eligible for deployment — that's the framework's core enforcement mechanism.

### 1. Goal
A short, plaintext description of the type of behavior the ADS is intended to detect.

### 2. Categorization
A mapping of the ADS to the relevant entry in the MITRE ATT&CK framework. The framework explicitly requires selecting **both** the parent and child category (e.g., "Credential Access / Brute Force"). Palantir maintains an internal knowledge base mapping every ADS to individual ATT&CK components, so when an engineer is forming a hypothesis for a new alert, they can immediately review which techniques the organization is strongest — or weakest — against.

### 3. Strategy Abstract
A high-level walkthrough of how the alert functions: what it's looking for, what technical data sources it uses, what enrichment occurs, and what false-positive minimization steps are applied.

### 4. Technical Context
Detailed background needed for a responder to understand every component of the alert. This should link out to relevant platform or tooling documentation, and should be self-contained enough that a responder without direct subject-matter expertise on this specific ADS can still make a judgment call.

### 5. Blind Spots and Assumptions
The recognized issues, assumptions, and conditions under which the ADS may fail to fire. No ADS is perfect — documenting blind spots helps other engineers understand how it might fail to trigger, or how an adversary might defeat it.

### 6. False Positives
Known instances where the ADS misfires due to misconfiguration, environmental idiosyncrasies, or other non-malicious scenarios, along with their defining characteristics. These known false positives should be suppressed in the SIEM. Three approaches to false-positive minimization are given:

- Add an additional component to the rule to maximize true positives
- Remove common false positives through pattern matching
- Apply backend filtering that stores indices of expected false positives

If a low false-positive rate can't be achieved, the alert should be broken down, refactored, or discarded entirely.

### 7. Validation
The steps required to generate a representative true-positive event that triggers the alert — essentially a unit test. Trigger scripts such as Red Canary's **Atomic Red Team** tests are given as an example. The validation process is:

1. Generate a scenario in which a true positive would occur
2. Document the testing scenario's process
3. Generate a true-positive alert from a test device
4. Confirm the strategy actually detected it

If a true-positive alert can't be generated, the ADS should be broken down, refactored, or discarded.

### 8. Priority
The criteria for the alerting level(s) — High, Medium, Low, etc. — that the ADS may be tagged with in the SIEM.

### 9. Response
The general response steps to follow once this alert fires, guiding the next responder through triage and investigation.

### (Bonus) Additional Resources
Not required, but recommended — any other internal, external, or technical references useful for understanding the ADS.

## Operational Process

- **Naming convention**: Titles should be informative but succinct, and must target a single event — e.g., "Non-SA Bastion Logon" rather than the broader "Bastion Logons."
- **Workflow**: While in progress, a strategy lives on the "Draft Alerting and Detection Strategies" page. It's peer-reviewed, and only gets promoted to production once a peer attaches a "Like" (approval) to it.

## Connection to Detection as Code

This framework is commonly discussed alongside **Detection as Code (DaC)** — treating detection rules and processes as code: tracking changes through version control, automating testing via CI/CD, and deploying the same vendor-agnostic detections (via languages like Sigma and YARA) across multiple security solutions. The ADS "Validation" section is where this connects directly to test-driven development.

## Public Status

The framework is open-sourced on GitHub (137 forks, 879 stars), explicitly presented as the public version of what Palantir uses internally. More recently, there's been community discussion around new detection-engineering templates that build on and move beyond ADS — worth keeping in mind that, while it remains an industry-standard reference, it isn't the only approach out there anymore.

## References

- [palantir/alerting-detection-strategy-framework (GitHub)](https://github.com/palantir/alerting-detection-strategy-framework)
- [ADS-Framework.md (original template)](https://github.com/palantir/alerting-detection-strategy-framework/blob/master/ADS-Framework.md)
- [Alerting and Detection Strategy Framework (Palantir Blog, 2019)](https://blog.palantir.com/alerting-and-detection-strategy-framework-52dc33722df2)
