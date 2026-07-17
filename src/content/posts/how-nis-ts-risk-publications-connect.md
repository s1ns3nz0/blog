---
title: How NIST's Risk Publications Connect
description: The connections and relationships between NIST Risk related publications
pubDatetime: 2026-07-17T22:51:55+09:00
tags:
  - NIST SP 800-37(RMF)
  - NIST SP 800-39
  - NIST SP 800-30
  - NIST SP 800-53
  - FIPS 199&200
  - Risk
featured: true
---
NIST Publications are interconnected with one another. However, I used to be confused about how and what to refer to when I was in compliance consulting. So I'd like to organize and verify the connections between them

One mandatory, federal-facing stack runs from statue down through policy to the operational Risk Management Framework, and then to the controls and extensions that fill it in. Alongside it sits a family of voluntary, cross-sector frameworks that map back onto that same stack rather than competing with it.

## Table of contents

## Connection Diagram
[Risk Diagram](../../assets/images/risk-diagram.png)


## Foundational & statute
**FISMA** is the statute that makes the rest of this stack mandatory for federal agencies. It points to SP 800-39, Managing Information Security Risk,the foundational policy-level document. SP 800-39 defines three risk tiers-Organization, Mission & Business Process, and Information System-and a four-step risk process: Frame -> Assess -> Respond -> Monitor. Nearly everything else below is an elaboration of this model.

## RMF Process
**SP 800-37 Rev.2**, the Risk Management Framework(RMF), turns 800-39's philosophy into a concrete system lifecycle: Prepare, Categorize, Select, Implement, Assess, Authorize, and Monitor. It also integrates security and privacy risk into one process rather than treating them seperately

## RMF Step Inputs
Three puplication groups fill in specific RMF steps. FIPS 199 & 200 set a system's impact level(Low/Moderate/High) and its minimum security requirements, feeding the Categorize step. **SP 800-53 Rev.5 + SP 800-53B** supply the risk-assessment methodology and the procedures used to verify controls were implemented correctly, feeding assess.

## Engineering & supply-chain extensions
**SP 800-160 Volumes 1&2** add engineering-level depth to the Implement step: Volume 1 covers systems security engineering, Volume 2 covers cyber resilliency. **SP 800-161 Rev.1(C-SCRM)** extends 800-39's tiers outward to vendors and suppliers, since risk doesn't stop at an organization's own systems.

## Non-federal derivative
SP 800-171 takes a subset of 800-53's moderate baseline and re-scopes it for non-federal systems handling Controlled Unclassified Information. It underpins CMMC, the DoD contractor certification program - CMMC itself is not a NIST publication

## Voluntary, cross-sector frameworks
These aren't mandated by FISMA and are usable by any organization, federal or not. **NIST CSF 2.0** organizes risk around six functions-Govern, Identify, Protect, Detect, Respond, Recover-as a communication and prioritization tool; NIST's informative refrences map every CSP subcategory to specific SP 800-53 controls. The **NIST Privacy Framework** shares CSF's Core/Function structure, applied to privacy risk, and is a sibling to the privacy controls folded into SP 800-53 Rev.5. **AI RMF(NIST AI 100-1)** applies the same risk logic to AI systems through its own functions - Govern, Map, Measure, Manage - and is built to interoperatewith CSF and RMF rather than replace them

## References
[NIST Risk Management Framework Project Page](https://csrc.nist.gov/projects/risk-management)
[NIST SP 800-37, Risk Management Framework](https://csrc.nist.gov/pubs/sp/800/37/r2/final)
[NIST SP 800-53, Security and Privacy Controls for Information Systems and Organizations](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
[NIST SP 800-39, Managing Information Security Risk](https://csrc.nist.gov/pubs/sp/800/39/final)
[NIST Cybersecurity Framework Project Page](https://www.nist.gov/cyberframework)]
[NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
