---
title: Adding an Azure Cosmos DB Continuous Backup Check to Prowler
description: How Prowler identifies Cosmos DB accounts that lack continuous backup and point-in-time restore capability.
pubDatetime: 2026-09-09T14:45:00+09:00
tags:
  - Azure
  - CosmosDB
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - Backup
  - DisasterRecovery
featured: true
---

High availability keeps a service running through an infrastructure failure. It does not undo an accidental delete, a bad deployment, data corruption, or ransomware. Those incidents need a recovery capability that can return data to a known-good moment.

[Prowler PR #11032](https://github.com/prowler-cloud/prowler/pull/11032) adds `cosmosdb_account_backup_policy_continuous`, an Azure check that identifies Cosmos DB accounts not configured with a continuous backup policy.

## Why continuous backup matters

Cosmos DB periodic backup restores data from fixed snapshots. Changes made between snapshots can be lost during a restore. Continuous backup enables point-in-time restore (PITR), allowing recovery to a point within the selected retention window.

That difference is most important when the failure is logical rather than infrastructural. If an application deletes a collection, a migration corrupts data, or an attacker changes records, automatic regional failover can preserve availability while preserving the damaged state. PITR provides a separate recovery path.

## What the new check does

The Prowler check evaluates each Cosmos DB account's `backupPolicy.type`.

- It reports `PASS` when the policy is `Continuous`.
- It reports `FAIL` when the policy is `Periodic`, missing, or unknown.
- It creates one finding per account, including the Azure subscription.

The check complements `cosmosdb_account_automatic_failover_enabled`: automatic failover protects service availability during regional outages, while continuous backup protects recoverability after data-level incidents.

## Enable continuous backup deliberately

Use the Azure CLI to select continuous backup and a retention tier:

```bash
az cosmosdb update \
  --name <COSMOS_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --backup-policy-type Continuous \
  --continuous-tier Continuous30Days
```

Cosmos DB offers `Continuous7Days` and `Continuous30Days` tiers. Select the retention period based on recovery objectives, operational requirements, and cost.

One critical planning constraint: moving from **Periodic** to **Continuous** backup is a one-way migration. Review pricing, compliance requirements, and restore procedures before making the change.

## Test the recovery path

A passing configuration means PITR is available. It does not prove a team can restore safely under pressure. Teams should regularly test:

- The recovery point needed for plausible failure scenarios.
- The time to create and validate a restored account.
- Application connection changes required after restoring data.
- Data-integrity validation before returning restored data to production.
- Access controls and network configuration for the restored environment.

`cosmosdb_account_backup_policy_continuous` makes a core resilience question visible: *can this account recover from a bad data change to a precise point in time, or only to the last scheduled snapshot?*

#Azure #CosmosDB #Prowler #Contribution #CSPM #CloudSecurity #Cloud #Backup #DisasterRecovery
