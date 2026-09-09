---
title: Adding an Azure Recovery Vault Protected Items Check to Prowler
description: How Prowler identifies Azure Recovery Services Vaults with no protected backup items.
pubDatetime: 2026-09-09T17:35:00+09:00
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

Creating a Recovery Services Vault does not protect any workload by itself. A vault with no registered protected items can indicate unfinished backup onboarding, a misconfiguration, or unnecessary platform cost.

[Prowler PR #11048](https://github.com/prowler-cloud/prowler/pull/11048) adds `recovery_vault_has_protected_items`, which identifies Azure Recovery Services Vaults that do not contain a protected item.

## Why protected-item evidence matters

Backup intent is not the same as backup coverage. A team may create a vault and policy during environment provisioning, then never attach virtual machines, databases, or other supported workloads. The resource looks ready, but no recovery point is being created.

Tracking protected items helps security and platform teams distinguish operating backup services from empty vaults that need action.

## What the new check does

The check evaluates each Recovery Services Vault.

- It reports `PASS` when the vault contains at least one protected item.
- It reports `FAIL` when the vault has none.
- It creates a finding per vault so the owner can review its purpose and actual use.

An empty vault is not automatically an error. It may be part of an approved migration or decommissioning process, but it should not remain unexplained.

## Complete or retire the backup design

For a vault intended to protect workloads, register the relevant items, apply the appropriate policy, and confirm successful backup jobs. For an intentionally empty vault, document its short-term purpose and remove it through the approved process when it is no longer needed.

For example, enable protection for a virtual machine with the Azure CLI:

```bash
az backup protection enable-for-vm \
  --resource-group <resource-group> \
  --vault-name <vault-name> \
  --vm <vm-id> \
  --policy-name DefaultPolicy
```

The remediation metadata for this check does not provide Terraform or Bicep. Use the Azure Backup workflow appropriate to each protected workload and maintain the resulting policy configuration as controlled operational evidence.

## Verify recoverability, not only enrollment

Protected-item count proves that a backup relationship exists. Teams should also monitor backup success, review policy retention, protect the vault from unauthorized deletion, and perform recovery tests that validate the full service path.

`recovery_vault_has_protected_items` closes the gap between backup intent and evidence of actual protection.

#Azure #Backup #Recovery #Prowler #Contribution #CSPM #CloudSecurity #Cloud #DisasterRecovery
