---
title: Adding an Azure Recovery Vault Protected Items Check to Prowler
description: How Prowler identifies Azure Recovery Services Vaults with no protected backup items.
pubDatetime: 2026-09-09T17:35:00+09:00
tags: [Azure, Backup, Recovery, Prowler, Contribution, CSPM, CloudSecurity, Cloud, DisasterRecovery]
featured: true
---

Creating a Recovery Services Vault does not protect anything by itself. A vault with no registered protected items can indicate unfinished backup onboarding, a misconfiguration, or unnecessary cost. [Prowler PR #11048](https://github.com/prowler-cloud/prowler/pull/11048) adds `recovery_vault_has_protected_items` to find those vaults.

## What the check evaluates

The check reports `PASS` when a vault has at least one protected item and `FAIL` when it has none. It provides a simple way to distinguish an operating backup vault from an unused resource.

## Investigate the finding in context

An empty vault may be intentional during a planned migration or after a controlled decommission. Confirm its owner and intended purpose. If it should protect workloads, register the items, apply appropriate policies, and test recovery. If it is no longer needed, follow the approved decommissioning process.

`recovery_vault_has_protected_items` closes the gap between backup intent and evidence of actual protection.

#Azure #Backup #Recovery #Prowler #Contribution #CSPM #CloudSecurity #Cloud #DisasterRecovery
