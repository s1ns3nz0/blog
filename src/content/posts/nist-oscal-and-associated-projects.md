---
title: NIST OSCAL and associated projects
description: An introduction to NIST OSCAL and its associated CNCF projects for compliance as code.
pubDatetime: 2026-07-18T14:17:16+09:00
tags:
  - NIST
  - OSCAL
  - CNCF
  - OSCAL Compass
  - Contribution
featured: true
---
As a cybersecurity consultant, I've engaged in many compliance projects. I started this job in March 2024, just as LLMs such as ChatGPT and Gemini were gaining significant attention. I discovered that they were capable of performing a wide range of tasks-creating videos, generating images, writing code, and much more. However compliance work was still confined to PDF documents. As a result, I began looking for an appropriate method to manage compliance as code, inspired by the concept of infrastructure as Code. NIST's OSCAL(Open Security Controls Assessment Language) follows this same philosophy. In this article, I will introduce what OSCAL is and its associated projects within the CNCF(Cloud Native Computing Foundation).

## Table of contents

## How posts are organized
OSCAL isn't a single tool. It's standarized data format that lets tools exchange information with each other. Its purpose is to let control information, control-implementation information, and control-assessment information move between tools: catalog/baseline maintainers, product vendors, GRC tools, assessment tools, and asset-management tools can each publish their own data and consume everyone else's through the same format

OSCAL spans three layers and seven models total, each layer building on the one to its left

## Control Layer
### Catalog
- A structured representation of a control set itself, such as NIST SP 800-53
### Profile
- A baseline tailored from a catalog-selecting only the controls a given organization or program actually needs(e.g., a FedRAMP Moderate baseline)

## Implementation Layer
### Component Definition
- Describes how a specific piece of hardware, software, or service supports given controls. It lets a component author describe the components and its applicable security configuration, and specify how a particular configuration satisfies the controls in an identified baseline.
### System Security Plan(SSP)
- Defines a system's security implementation based on an OSCAL profile(baseline). It's the assembly point - an SSP-authoring tool can import content from multiple component definitions to pre-populate most of the SSP automatically

## Assessment Layer
### Assessment Plan(AP)
- Defines which controls get assessed, by what method, by wom, and when
### Assessment Results(AR)
- The actual outcomes and evidence from an assessment activity
### Plan of Action and Milestones(POA&M)
- Deficiencies found during assessment and their remediation timelines

All seven model's schemas are defined through Metaschema, NIST's own modeling language. Each model's information domain is defined once in Metaschema, which is then used to generate consistent schemas and converters across all three serialization formats-XML, JSON, and YAML. That single-definition-to-three-formats synchronization is the entire reason Metaschema exists

## OSCAL Compass - Trestle/Agile Authoring/C2P
OSCAL Compass was originally contributed by IBM and is now hosted as a CNCF Sandbox project. Its reason for existing is to close the gap between OSCAL as a format standard and the CI/CD pipeline organizations actually run.

### Trestle
Trestle is a set of tools that enable the creation, validation, and governance of documentation artifacts for compliance needs. The core idea: split a large OSCAL JSON structure into small, human-editable pieces-specifically, convert it to markdown for editing, then reassemble it back into JSON. Internally it builds OSCAL object models on Python's Pydantic library. so any input that falls outside the schema gets caught automatically during validation.

Commands like `catalog-generate/assemble`, `profile-generate/assemble`, and `ssp-generate/assemble` round-trip each model between markdown and JSON. Trestle has real adoption at scale-roughly 15,000 downloads a month-and more recently gained an MCP server variant(compliance-treslte-mcp) that lets AI agents call Trestle commands directly.

### Agile Authoring
- A collaborative platform that lets different compliance personas each manage their piece of the artifact sent through whatever interface they prefer - in practice, a Trestle-based GitOps workflow. Concretely, it's a cascade across repositiories: a change in the catalog repo propagates as a pull request into the profile repo, which in turn propagates into the component-definition repo. It manages semantic versioning, provenance traceability, changelogs, and approval-gated releases to keep continuous compliance actually continuous

### Compliance to Policy(C2P)
The bridge between compliance as Code and Policy as Code. It takes compliance requirements and generates the technical policies a Policy Validation Point(PVP) needs, and - running the other direction - takes a PVP's native results and turns them into compliance assessment results. It's plugin-based, so it extends to different PVPs: OPA, Kubernetes policy engines, cloud configuration scanners, and others can all feed into the same normalized OSCAL assessment-result format. There are two seperate implementations, one in Python and one in Go.

## How the Three Fit together
These aren't three seperate products - they're one pipeline. Trestle makes catalogs, profiles, and SSPs editable as markdown -> Agile Authoring propagates changes across repositories automatically -> C2P deploys the controls named in the final SSP to real policy engines and feeds the results back as assessment evidence. That's the full loop-compliance document -> actual technical policy -> assessment evidence - running automatically, and the `oscal-compass/e2e-demo` repository has a working demo of entire flow.

## What I've Contributed
### oscal-compass/compliance-trestle(PR #2222, merged)
- Fixes a crash in `_construct_set_parameters_dict`, a function on the `ssp-generate` command's execution path, and the root cause was a missing piece of defensive coding. The function pullls the `profile-param-value-origin` key out of a parameter dictionary using `dict.pop()`, called without a default argument. so it can be entirely absent depending on the profile-but `.pop()` without a default is designed to raise a `KeyError` when the key isn't there, meaning any attempt to generate an SSP from a profile that doesn't specify this field would crash right at the pipeline's entry point.

### oscal-compass/compliance-to-policy(PR #2, under review)
- Add a new C2P plugin for Github Actions DevSecOps pipelines.
- There is no plugin for Github Action pipelines. this plugin enables automated OSCAL assessment results generation from github action pipeline tool results.

## References
- [NIST OSCAL](https://csrc.nist.gov/projects/open-security-controls-assessment-language)
- [OSCAL Compass(CNCF Sandbox Project)](https://oscal-compass.dev/)
- [Trestle](https://github.com/oscal-compass/compliance-trestle)
- [Compliance to Policy(C2P)](https://github.com/oscal-compass/compliance-to-policy)
- [End-to-end pipeline demo](https://github.com/oscal-compass/e2e-demo)
