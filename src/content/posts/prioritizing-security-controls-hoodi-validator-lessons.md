---
title: "Prioritizing Security Controls: What Happened and What I Learned"
description: "Lessons from building a Hoodi validator on AWS about deployment speed, infrastructure cost, operational burden, and over-relying on AI when applying DevSecOps controls."
pubDatetime: 2026-09-16T20:30:00+09:00
tags:
  - Hoodi
  - Validator
  - DevSecOps
  - CI/CD
  - AWS
  - EKS
  - Risk
  - AI
draft: false
---

Recently, I built a Hoodi validator running on AWS. At the beginning of the project, I tried to implement as many security controls as possible.

In the past, whenever I interviewed client engineers, I sometimes found myself thinking:

"Security best practices seem straightforward. Why haven't they implemented them already?"

This project gave me a chance to answer that question for myself.

As I tried to apply DevSecOps best practices in a real environment, I ran into several problems related to deployment speed, infrastructure cost, operational burden, and over-reliance on AI.

## 1. Deployment Became Too Slow

### What I did

Initially, I added almost every security and testing tool that I considered necessary. As a result, the build and deployment process became significantly slower. Each additional scanner, validation step, and dependency increased the overall CI/CD execution time. I initially tried to solve this by building Docker images that already contained the required security tools.

### How I improved it

Instead of installing and running every possible tool, I selected a smaller set of tools that provided the most value. I also containerized commonly used tools, including SAST and Infrastructure-as-Code scanners, so the CI/CD pipeline did not need to install them from scratch every time. This simplified the pipeline and reduced deployment time.

More importantly, I realized that adding more security tools does not automatically make a system more secure. The tools need to address meaningful risks without unnecessarily slowing down the delivery process.

## 2. The Architecture Became Too Expensive to Operate

### What I did

For security and isolation, I initially created almost ten private container registries. Each component, including Helm charts and custom Docker images, had its own private Amazon ECR repository and separate GitHub Actions workflow. Technically, this worked. Operationally, however, it created unnecessary complexity and additional cost.

### How I improved it

I reconsidered which artifacts actually needed to be stored in private repositories. Instead of making everything private by default, I kept only sensitive or project-specific components private and used public sources where appropriate. For example, I initially maintained a private repository for Kyverno. Later, I changed the deployment process so that publicly available Kyverno artifacts could be pulled directly into the deployment environment through GitHub Actions. Kyverno was used to enforce admission policies and prevent workloads that did not satisfy security requirements from being deployed. This reduced unnecessary repository management while keeping the important security controls in place. The lesson here was simple: making everything private may sound more secure, but every additional component also comes with cost and maintenance overhead.

## 3. Security Controls Increased Operational Burden

### What I did

As I added more security policies using OPA and integrated additional controls into the CI/CD pipeline, I found that the operational burden increased quickly. Each new policy often required related scripts, pipeline configurations, or deployment logic to be updated as well. What initially looked like a simple security improvement sometimes resulted in multiple downstream changes across the delivery process. This became especially noticeable as the number of policies increased.

### How I improved it

Instead of implementing every possible policy, I started with a risk assessment and prioritized the controls that addressed the most important risks. I implemented only the policies that provided meaningful security value or were necessary for compliance. This reduced unnecessary changes to CI/CD scripts and made the overall system easier to maintain. More importantly, I realized that every security control has an operational cost, even when the control itself appears simple. A technically valid security policy is not necessarily a good policy if maintaining it creates excessive operational complexity.

## 4. I Relied Too Much on AI

### What I did

I created an AI-assisted review workflow to evaluate my infrastructure against DevSecOps best practices based on frameworks such as NIST and the DoD security baseline. When the infrastructure was small, this approach worked reasonably well. However, as the number of resources and configurations increased, the AI frequently missed important considerations or failed to review the entire system consistently. I realized that I had started relying too heavily on AI to validate security decisions.

### How I improved it

Instead of treating AI as the final reviewer, I improved the surrounding review process and started using AI as an assistant. I strengthened the prompts, context, and review workflow, but I also manually reviewed the results and verified critical decisions myself. AI remained useful for identifying potential issues, checking configurations, and accelerating repetitive reviews. However, the final judgment still needed to come from me. This made me realize that AI can accelerate security reviews, but it cannot replace engineering judgment, contextual understanding, or ownership.

## What I Learned

Through these challenges, I realized that implementing security controls is not as simple as installing security tools or following government security guidelines.

Before this project, I sometimes wondered why engineering teams did not simply implement every recommended security control.

- Why not enable another scanner?
- Why not make every repository private?
- Why not enforce another policy?
- Why not follow every security baseline?

After operating my own environment, I understood the trade-offs much more clearly.
Every security control affects something else.

- It can increase deployment time.
- It can increase infrastructure cost.
- It can create additional operational work.
- It can make CI/CD pipelines more complicated.
- It can also increase the burden on engineers who have to maintain the system afterward.

Since then, whenever I design a new system or consider adding another security control, I have started asking different questions.
Instead of asking only:

"Can I implement this?"

I now ask:

- What risk does this control reduce?
- How critical is that risk?
- How likely is that risk to occur?
- Is this control required for compliance?
- What operational burden will it introduce?
- How will it affect deployment speed?
- How much will it cost?
- Who will maintain it?
- Does the security benefit justify the additional complexity?

This project changed the way I think about security engineering.
Good security engineering is not about implementing every possible security control.
It is about understanding the risks, evaluating the trade-offs, and prioritizing the controls that matter most.
