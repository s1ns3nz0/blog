---
title: Adding an Azure Defender CSPM Check to Prowler
description: How Prowler verifies that Microsoft Defender Cloud Security Posture Management is enabled for an Azure subscription.
pubDatetime: 2026-09-09T16:00:00+09:00
tags:
  - Azure
  - MicrosoftDefender
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - PostureManagement
featured: true
---

Cloud security teams need more than isolated configuration findings. They also need context about exploitable paths, vulnerabilities, and the security improvements that will reduce risk across an environment. Microsoft Defender Cloud Security Posture Management (CSPM) provides those capabilities at the Azure subscription level.

[Prowler PR #11037](https://github.com/prowler-cloud/prowler/pull/11037) adds `defender_ensure_defender_cspm_is_on`, a check that verifies whether Defender CSPM is enabled on the Standard tier.

## Why Defender CSPM matters

Defender CSPM combines security recommendations with broader posture analysis. Its Standard plan adds capabilities such as agentless vulnerability assessment and attack-path analysis, helping teams prioritize issues by how they could contribute to real compromise paths.

Without the plan, a subscription may still have individual controls and logs, but it lacks that expanded posture-management coverage. Enabling it makes the security program more effective at finding and ranking risks that span identities, workloads, data, and network exposure.

## What the new check does

The check evaluates the subscription's `CloudPosture` security pricing tier.

- It reports `PASS` when the tier is `Standard`, which means Defender CSPM is on.
- It reports `FAIL` when the tier is anything other than `Standard`, including an unavailable or disabled plan.
- It produces subscription-level evidence so teams can find coverage gaps across Azure estates.

This keeps the evaluation focused on the actual licensing and enablement signal, rather than assuming that the presence of Microsoft Defender for Cloud alone proves CSPM is active.

## Enable Defender CSPM

The plan can be enabled with the Azure CLI:

```bash
az security pricing create \
  --name CloudPosture \
  --tier Standard
```

It can also be declared with Terraform:

```hcl
resource "azurerm_security_center_subscription_pricing" "defender_cspm" {
  tier          = "Standard"
  resource_type = "CloudPosture"
}
```

## Make the decision deliberately

The Standard tier has a cost, so enablement should be planned alongside ownership, budgets, and a workflow for acting on findings. Define who reviews attack paths and vulnerability results, which subscriptions need coverage, and how remediation work reaches application and platform teams.

`defender_ensure_defender_cspm_is_on` makes that foundational decision measurable: *does this Azure subscription have Defender CSPM Standard coverage enabled?*

#Azure #MicrosoftDefender #Prowler #Contribution #CSPM #CloudSecurity #Cloud #PostureManagement
