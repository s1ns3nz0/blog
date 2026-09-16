---
title: "Hello, Offchain!!"
description: "Why I want to join Offchain: compliance as code, policy as code, and what building a Hoodi validator taught me about securing decentralized infrastructure."
pubDatetime: 2026-09-16T22:10:00+09:00
tags:
  - Hoodi
  - Validator
  - OSCAL
  - Compliance
  - Policy as Code
  - Contribution
  - AI
featured: true
---

Sun Tzu, an ancient Chinese military strategist and the author of *The Art of War*, wrote:

> "If you know the enemy and know yourself, you need not fear the result of a hundred battles."

In cybersecurity, we have become remarkably good at understanding the enemy. Information about threat actors, vulnerabilities, TTPs, and emerging attack techniques is widely available through open-source intelligence and commercial threat intelligence services.
- But how well do we know ourselves?
- Can everyone in an organization clearly answer these questions?

**Which security controls are implemented? Which policies govern them? Who owns them? What evidence proves that they are working? And what should we improve next?**

During my time at Deloitte and IBM, I worked with global clients across different industries. Yet I rarely encountered organizations where these questions could be answered consistently and with confidence. With AI accelerating both software development and attacker capabilities, I believe this problem is becoming even more important. Defenders need to understand their own environments and respond faster than ever.

If I join Offchain, I want to help make these questions easy to answer.

## Compliance as Code

I have been approaching this problem through a simple idea:

**What if we treated compliance as code rather than documents?**

I built an OSCAL-based dashboard that manages security controls, policy references, control narratives, evidence, and ownership in a structured format. Instead of preparing for audits through spreadsheets, interviews, emails, and manual evidence collection, the goal is to make an organization's security posture continuously visible and machine-readable.

### Compliance Ops

![Compliance Ops dashboard](/images/hello-offchain-compliance-ops-dashboard.png)

- Github: https://github.com/s1ns3nz0/compliance-ops
- Live: http://193.122.146.187/
  <Token: hello-offchain-nWUsxtVTrgYhAc4cTxpXQkyl9nK34z50pmhvbXMIMQ>


I also implemented an MCP interface for the system so that AI systems can retrieve and update relevant information from platforms such as Slack, Jira, and other enterprise tools.

At Offchain, I would like to expand this approach in two directions:

- **Compliance as Code**: establishing a structured, continuously updated view of security controls, evidence, ownership, and compliance status.
- **Policy as Code**: translating security policies into enforceable technical controls and embedding them into cloud infrastructure, CI/CD pipelines, and engineering workflows wherever possible.

This approach can reduce the time engineers and control owners spend on interviews and evidence collection, automate portions of audit preparation, reduce dependency on external consulting, and most importantly, transform security policies from documents into mechanisms that actually influence how systems are built and operated.

At Deloitte, I was primarily responsible for auditing PKI-based digital signature systems. This experience gave me a practical understanding of how compliance requirements can be translated into technical controls and embedded into day-to-day operations.

## Learning Blockchain Infrastructure by Building It

I have also been developing hands-on experience with blockchain infrastructure.
Most recently, I deployed an Ethereum Hoodi testnet validator environment on AWS using **Prysm, Nethermind, and Amazon EKS**.
Rather than simply getting a validator running, I treated the project as a security engineering exercise.
- How should components be separated?
- What permissions should each component have?
- How should roles and responsibilities be designed within Kubernetes?
- How can operational requirements and security requirements coexist in a cloud-native environment?

I wrote up the architecture and the security controls behind it
- CI/CD Pipeline Security (https://miata.cloud/posts/ci-cd-security-controls-implemented-in-the-pipeline-design/)
- AWS Infrastructure Overview (https://miata.cloud/posts/hoodi-node-validator-aws-architecture-overview/)
- Kubernetes Namespace Design (https://miata.cloud/posts/kubernetes-namespace-design-for-a-hoodi-validator/)
- Private EKS Security Design Review (https://miata.cloud/posts/securing-a-hoodi-ethereum-testnet-validator-on-aws-eks/)
- Vault Secret Management for Hoodi Validator (https://miata.cloud/posts/vault-secret-management-for-hoodi-validator/)
- Cert-manager and Vault Operation (https://miata.cloud/posts/cert-manager-and-vault-roles-scope-and-collaboration/)

Building the environment myself helped me better understand not only Ethereum infrastructure, but also the operational realities and security trade-offs involved in running decentralized systems. A theoretically perfect security control is not necessarily a good control if it is too expensive, too difficult to operate, or creates excessive friction for engineers. Good security requires risk-based prioritization, automation, cost awareness, and an understanding of how engineers actually work.
- What happend and I Learned? https://miata.cloud/posts/prioritizing-security-controls-hoodi-validator-lessons/

## From Consulting to Engineering
I am aware of a stereotype sometimes associated with consultants: that they understand frameworks and produce presentations and documents, but lack hands-on engineering experience. I have deliberately worked to close that gap. Outside of my professional responsibilities, I have continued developing my engineering skills through certifications, hands-on labs, personal projects, and open-source contributions.

### Certifications
- Official Kubestronaut: https://www.cncf.io/training/kubestronaut/?_sf_s=Jinsoo%20Yang
- AWS: SCS, SAP, CloudOps Engineer

### Mini Projects
- Security Requirements AI Plugin (https://github.com/s1ns3nz0/security-requirements)
  + Generic security requirements often miss the unique context of each service.
  + Analyze service characteristics, environments, users, and compliance obligations.
  + Derive **service-specific security requirements** tailored to each system.

- Compliance Ops Dashboard and MCP (https://github.com/s1ns3nz0/compliance-ops/tree/master)
  + Built a Compliance as Code platform that structures security controls, policies, ownership, and evidence using OSCAL.
  + Automated compliance evidence collection and updates by integrating enterprise tools such as Slack and Jira through MCP.
  + Designed the system to enable continuous audit readiness and reduce manual effort in control validation, evidence gathering, and compliance operations.

## Learning Through Open Source

Open-source contribution is another important part of how I learn. I enjoy reading issues, discussions, and pull requests to understand how other engineers identify problems, reason about trade-offs, and eventually implement solutions. Sometimes, reading a good pull request feels like gaining access to another engineer's thought process. Because so much of what I have learned has been built on open-source software and knowledge shared by others, I also believe in contributing back to that ecosystem. 

### Open Source Contribution
- Prowler: Open Cloud Security Platform
  + Added 28 security checks across Azure and GCP services.
  + View contributions(https://github.com/prowler-cloud/prowler/pulls?q=is%3Apr+state%3Aclosed+involves%3As1ns3nz0)
- SEAL Framework (Security Alliance Framework): Open-source blockchain security framework
  + Contributed guidance on Policy as Code, private registries, and package mirrors.
  + View contributions (https://github.com/security-alliance/frameworks/pulls?q=is%3Apr+involves%3As1ns3nz0)
- OSCAL Compass: Open-source Compliance as Code project backed by NIST and CNCF
  + Contributed a GitHub Actions integration for Compliance-to-Policy workflows and resolved a Trestle KeyError bug.
  + View contributions (https://github.com/oscal-compass/compliance-trestle/pull/2222)

## Security Is Also About People

Before entering the private sector, I served as a Captain in the Republic of Korea Army Signal Corps, where I led a platoon of approximately 20 soldiers. My team placed first in an evaluation of military network communications-site deployment and operations, and I also won an Army cybersecurity competition. One of the most important lessons from my military experience was that security cannot remain the responsibility of security specialists alone. I had to work with people from infantry, artillery, and other branches who had very different levels of technical knowledge. To improve security across the organization, I developed security-check automation scripts and even created a game-based security-awareness program to make security concepts more accessible. That experience continues to shape how I think about security today.

Effective security requires more than technical expertise.

It requires **engineering, automation, communication, and systems that make secure behavior easier for everyone.**

## Why Offchain

The blockchain industry faces highly capable and persistent threat actors, including state-linked groups targeting cryptocurrency organizations and infrastructure. For me, securing decentralized infrastructure brings together many of the areas I have spent my career developing: security governance, cloud infrastructure, automation, engineering, communication, and leadership. Offchain is building infrastructure at the forefront of the Ethereum ecosystem, and I want to contribute to securing that infrastructure as the ecosystem continues to grow.

Ultimately, I want to help create an environment where anyone at Offchain can confidently answer three simple questions:

**What are we protecting? How are we protecting it? And what should we improve next?**

That, to me, is what it means to truly **know ourselves**.
