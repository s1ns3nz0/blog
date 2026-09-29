---
title: "Open Source Contribution"
description: Why I started sending my findings upstream instead of keeping them in my notes, and what 40 contributions taught me.
pubDatetime: 2026-09-30T01:20:00+09:00
tags:
  - Study
---

Most of the security tools I rely on are open source.

Prowler scans the cloud accounts I review. OSCAL Compass turns compliance documents into something a pipeline can check. LND and Aperture run the Lightning services I study.

For a long time I only used them. I read their documentation, ran them, and moved on when something did not work the way I expected.

At some point that started to feel incomplete.

If a tool is good enough for me to depend on, it is good enough for me to improve. And the fastest way to understand a tool is to change it and have its maintainers review the change.

So I started sending my findings upstream instead of keeping them in my notes.

## What that looked like

In Prowler, I added 28 checks for Azure and GCP services, including AKS, Cosmos DB, Entra ID, and Secret Manager. All of them were merged.

In the SEAL Frameworks, the security guidance the Security Alliance maintains for blockchain teams, I wrote the Policy as Code and private registries sections. I now maintain the Supply Chain section.

In OSCAL Compass, I fixed a KeyError in compliance-trestle's SSP generation and opened a GitHub Actions plugin for compliance-to-policy.

In Trail of Bits' Gosentry, I found a LibAFL bug where fuzzing stopped while `go test` still reported success. It was fixed the same day.

In Lightning Labs' projects, I reported a short-read issue in LND's address decoders, proposed per-outcome L402 metrics and a security event log for Aperture, and opened a fix for a flaky Aperture test.

I have also submitted two security reports to a blockchain company. They are still under review, so the product names and details stay private until fixes ship.

Counting everything, that is 40 contributions so far.

## What I learned from it

Reading someone else's codebase closely enough to change it teaches me more than any tutorial.

A merged pull request also means something different from code that only runs on my laptop. Someone who knows the project better than I do has read it, questioned it, and accepted it.

Not every contribution is a patch. Some of the most useful ones were bug reports and proposals: finding the problem clearly enough that the maintainers could decide what to do with it.

And contributing changed how I use these tools at work. When something breaks, my first question is no longer "how do I work around this?" but "is this a bug I can report or fix?"

That is the same responsibility I wrote about in [What Shouldn't I Miss in the AI Era?](/posts/what-shouldnt-i-miss-in-the-ai-era/): understanding the tools I use well enough to stand behind the results.
