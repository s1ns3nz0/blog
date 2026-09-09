---
title: Adding an Azure Recovery Vault Retention Check to Prowler
description: How Prowler identifies Recovery Services Vault backup policies with insufficient retention.
pubDatetime: 2026-09-09T17:30:00+09:00
tags:
  - Azure
  - Backup
  - Recovery
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - DisasterRecovery
featured: true
---

Backups that expire before an incident is discovered cannot support recovery. A short retention period can leave an organization without a usable recovery point after ransomware, silent corruption, or a delayed investigation.

[Prowler PR #11047](https://github.com/prowler-cloud/prowler/pull/11047) adds `recovery_vault_backup_policy_retention_adequate`, which checks Azure Recovery Services Vault backup policies for adequate retention.

## Why retention is a security control

Recovery depends on having a clean copy that predates the incident. The longer an intrusion or data issue remains undetected, the more likely that short-lived backups will be overwritten or removed before responders can use them.

Retention must also balance operational, legal, and cost requirements. The right policy is based on recovery objectives and data obligations, not a single universal number.

## What the new check does

By default, Prowler evaluates daily backup retention against a 30-day baseline.

- It reports `PASS` when the policy meets or exceeds 30 days.
- It reports `FAIL` when retention is shorter than the configured baseline.
- It produces evidence per policy so teams can find gaps across Recovery Services Vaults.

The threshold gives a practical minimum for review; critical workloads may require considerably longer retention and multiple recovery tiers.

## Design retention around recovery objectives

Document the required recovery point, the plausible detection delay, and the recovery copies required for daily, weekly, monthly, and yearly needs. Apply the policy to the correct protected items and keep deletion permissions tightly controlled.

After defining a policy JSON file with daily retention of at least 30 days, apply it with the Azure CLI:

```bash
az backup policy set \
  --resource-group <resource-group> \
  --vault-name <vault-name> \
  --name <policy-name> \
  --policy @policy.json
```

The PR metadata provides no Terraform or Bicep remediation for this policy. Manage the policy JSON through the team's version-controlled infrastructure workflow when one is available.

## Validate older recovery points

Test restores from more than the most recent backup. Confirm that application owners can recover data, validate integrity, and operate the restored workload. These exercises identify retention gaps that configuration review alone cannot expose.

`recovery_vault_backup_policy_retention_adequate` asks a practical question of every policy: *will a usable recovery point still exist when the organization needs it?*

#Azure #Backup #Recovery #Prowler #Contribution #CSPM #CloudSecurity #Cloud #DisasterRecovery
