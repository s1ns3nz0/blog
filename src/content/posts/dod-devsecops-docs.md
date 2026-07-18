---
title: DoD DevSecOps Strategy and Implementation Docs 
description: DevSecOps documents structure of U.S Department of Defense.
pubDatetime: 2026-07-18T17:17:43+09:00
tags:
  - DevSecOps
  - DoD
featured: true
---
Whenever I tried to study DevSecOps, I found myself confused by the sheer number of security tools and projects involved, and I often lost sight of how to actually implement it. Can I meet the requirements simply by deploying this tool within a CI/CD environment? Could I recommend these tools to my clients to help them achieve supply chain compliance? These were the questions that ran through my mind whenever I dealt with this issue. I believe that designing and implementing a solution based on the DoD's playbook would also help ensure compliance with other industries's requirements. This article provides a brief summary of the structure of the DoD's DevSecOps documentation. I will explore this area in greater depth through my own projects in future posts.

## Table of contents
## DevSecOps Strategy Guide
Defines DevSecOps as "a combination of software engineering methodologies, practices, and tools that unifies development, security, and operations," starting from the observation that most existing cybersecurity frameworks (NIST CSF, MITRE ATT&CK, etc.) focus predominantly on post-deployment attack surfaces. Its section on "formal recognition of the software supply chain" emphasizes integrity across every stage from development through production, and presents "baked-in cybersecurity" (security built in rather than bolted on afterward) and "patches delivered at the speed of relevance" as core principles. This document is also the one that defines the overall structure of the document set (Strategy Guide → Fundamentals → Reference Design).
- [DevSecOps Strategy Guide](https://dodcio.defense.gov/Portals/0/Documents/Library/DoDEnterpriseDevSecOpsStrategyGuide.pdf)

## DevSecOps Fundamentals
An educational primer whose purpose is to provide normalized definitions of DevSecOps concepts. It defines the iterative lifecycle running through Plan-Develop-Build-Test-Release-Deliver-Deploy-Operate-Monitor-Feedback, along with the feedback loops and control gates within it. Section 4 covers current and potential Reference Designs and defines the minimum material required to define one. The v2.5 revision adds framing that situates DevSecOps within broader technology trend the past two to three decades — the shift from waterfall to Agile, and the move toward integrating security across the full technology lifecycle.
- [DevSecOps Fundamentals](https://dodcio.defense.gov/Portals/0/Documents/Library/DoD%20Enterprise%20DevSecOps%20Fundamentals%20v2.5.pdf)

## DevSecOps Activities & Tools GuideBook
Published as a document-plus-spreadsheet pair. The document is a narrative description of the relationships between DevSecOps phases, the activities at each phase, and a taxonomy of supporting tools; the spreadsheet carries the detailed activity list per phase. The spreadsheet is explicitly meant to double as a template — for mapping activities when proposing a new Reference Design, and as the basis for process/responsibility mapping when building a continuous ATO package. Tools are defined only by category, never by specific commercial product, and the stated audience is DoD enterprise DevSecOps platform capability providers and DoD DevSecOps teams.
- [DevSecOps Activities & Tools Guidebook](https://dodcio.defense.gov/Portals/0/Documents/Library/DevSecOpsActivitesToolsGuidebook.pdf)


## DevSecOps Fundamentals Playbook
A collection of one-page action checklists opening with "Play 1: Adopt a DevSecOps Culture." It frames DevSecOps success as fundamentally an organization-wide cultural shift rather than a fully automated pipeline, requiring buy-in from leadership, contracting, middle management, engineering, security, operations, development, and testing teams alike. The shift from "I" to "we" thinking and the dismantling of team silos are presented as the central cultural practices.
- [DevSecOps Fundamentals Playbook](https://dodcio.defense.gov/Portals/0/Documents/Library/DevSecOpsFundamentalsPlaybook.pdf)


## DevSecOps Playbook
Covers cATO-related content, defining cATO as equivalent to the "ongoing authorization" concept in NIST SP 800-137. It states that every cATO is centered on a transparently defined and well-understood continuous monitoring program. One notable detail: at the time of writing (October 2021), the document notes that "a separate guidebook on cATO is forthcoming" — evidence that a dedicated cATO document was later split out from this playbook, showing how the document set evolved over time. It also addresses the dev-prod parity problem, where development environment configuration fails to match production.
- [DevSecOps Playbook](https://dodcio.defense.gov/Portals/0/Documents/Library/DevSecOps%20Playbook_DoD-CIO_20211019.pdf)

## Reference Design: CNCF Kubernetes
Identifies Platform One as "the first DoD-wide approved DevSecOps Managed Service." It describes a CI/CD orchestrator moving an artifact through successive stages, each requiring its entrance rules to be met before the artifact can transition to the next; production deployment can be fully automated but may still be gated by a human pressing a button to trigger it. Even after deployment, a separate control gate called an "Authorization to Connect (ATC)" is required before the service can actually be turned on. Iron Bank (the repository of digitally signed, hardened container images) and the Sidecar Container Security Stack (SCSS — a security stack Kubernetes automatically injects into each pod, enabling rapid security updates with no recompilation) both appear as core components.
- [Reference Design: CNCF Kubernetes](https://dodcio.defense.gov/Portals/0/Documents/Library/DoD%20Enterprise%20DevSecOps%20Reference%20Design%20-%20CNCF%20Kubernetes%20w-DD1910_cleared_20211022.pdf)

## Reference Design: Cloud/Github-based
Presents a pattern for quickly standing up a DevSecOps environment using SaaS and Infrastructure as Code. It separates cloud infrastructure for development, integration, testing, production, and operations management, and leans heavily on Cloud Service Provider (CSP) native services to secure and automate the environment. Its table of contents goes down to implementation-level detail — Azure Active Directory tenant and administrator roles, Azure Enterprise Agreement and subscriptions, the DoD Cloud IaC deployment virtual machine — making it read more like an actual implementation guide than the other Reference Designs.
- [Reference Design: Cloud/Github-based](https://dodcio.defense.gov/Portals/0/Documents/Library/DoDRefDesignCloudGithub.pdf)


## DevSecOps Enterprise Container Hardening Guide
A container-hardening process document created for the DoD Enterprise DevSecOps Initiative (DSOP). It defines a three-step process in which developers submit containers to a centralized repository, where a Container Hardening Team (composed of DevSecOps engineers and container experts, with individual members called "Hardeners") scans them for vulnerabilities. Through the concept of a DoD Base Container Image Approved Source (DBCIAS), it distinguishes trusted repositories (Iron Bank/DCAR) from untrusted ones (Docker Hub, vendor-proprietary repositories, etc.), and states that containers must run on a DevSecOps platform meeting the CNCF-compliant Kubernetes and MVP Reference Design requirements (including the SCSS) to be accredited. It also names specific CI/CD orchestration tools in use — Jenkins, CloudBees Jenkins, and GitLab.
- [DevSecOps Enterprise Container Hardening Guide](https://dl.dod.cyber.mil/wp-content/uploads/devsecops/pdf/Final_DevSecOps_Enterprise_Container_Hardening_Guide_1.2.pdf)

## cATO Implementation Guide
Starts from the observation that ATO is the longest bottleneck in software delivery. It defines cATO as a state in which an organization can continuously assess and deploy subsystems that meet defined risk tolerances, with the core shift being from point-in-time control assessment to continuous risk determination and authorization. It cites the DoD Software Modernization Strategy as its higher-level authority, noting that this strategy explicitly includes objectives to "advance DevSecOps through enterprise providers" and "accelerate software deployment with continuous authorization."
- [cATO Implementation Guide](https://dodcio.defense.gov/Portals/0/Documents/Library/DoDCIO-ContinuousAuthorizationImplementationGuide.pdf)



## References
- Written under each paragraph
