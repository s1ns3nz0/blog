---
title: Adding an Azure Cosmos DB Automatic Failover Check to Prowler
description: How Prowler identifies Cosmos DB accounts that require manual intervention during a regional outage.
pubDatetime: 2026-09-09T14:30:00+09:00
tags:
  - Azure
  - CosmosDB
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - HA
  - DisasterRecovery
featured: true
---

Multi-region deployment alone does not guarantee a fast recovery. If a Cosmos DB account has a secondary region but requires an operator to promote it during an outage, an otherwise resilient design can still lose valuable time at the most critical moment.

[Prowler PR #11031](https://github.com/prowler-cloud/prowler/pull/11031) adds `cosmosdb_account_automatic_failover_enabled`, an Azure check that identifies Cosmos DB accounts without automatic failover enabled.

## Why automatic failover matters

Azure Cosmos DB can replicate data across multiple regions. Automatic failover lets the service promote a secondary region to primary when the current write region becomes unavailable. This removes a manual decision and execution step from the recovery path.

Without it, a regional outage leaves the application dependent on human intervention. An operator must recognize the event, determine the correct target region, initiate failover, and verify that clients recover. Even a well-rehearsed manual process adds delay and creates room for error during an incident.

Automatic failover is especially valuable for workloads with clear availability objectives, global users, or services where a primary-region outage directly affects revenue, operations, or customers.

## What the new check does

The Prowler check is named `cosmosdb_account_automatic_failover_enabled`. It evaluates the Cosmos DB account property:

```text
enableAutomaticFailover
```

- It reports `PASS` when automatic failover is enabled.
- It reports `FAIL` when the setting is disabled or absent.
- It creates one finding per Cosmos DB account, including the relevant Azure subscription.

The PR also expands Prowler's Cosmos DB service model with failover, backup-policy, public-network, and TLS-version fields that support this and related checks.

## Enabling automatic failover

Automatic failover needs a multi-region account and a deliberate order of failover priorities. Enable it with the Azure CLI:

```bash
az cosmosdb update \
  --name <COSMOS_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --enable-automatic-failover true
```

In Terraform, set `enable_automatic_failover = true` and define each geo location with its `failover_priority`:

```hcl
resource "azurerm_cosmosdb_account" "example" {
  name                = "example-cosmos"
  resource_group_name = "example-rg"
  location            = "eastus"
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  geo_location {
    location          = "eastus"
    failover_priority = 0
  }

  geo_location {
    location          = "westus"
    failover_priority = 1
  }

  enable_automatic_failover = true
}
```

## A passing check is not a full disaster-recovery plan

Automatic failover answers one question: can the platform promote a secondary region without waiting for an operator? It does not validate the rest of the recovery design.

Teams should also review:

- Whether secondary regions have the capacity and configuration needed to serve production traffic.
- Whether failover priorities match the business recovery strategy.
- Whether application connection handling and retry behavior tolerate regional failover.
- Whether the account requires multi-region writes for an active-active design.
- Whether RTO and RPO expectations have been tested through failover exercises.
- Whether backups, network controls, and identity policies remain available in the recovery region.

For lower-criticality workloads, manual failover may be an acceptable documented choice. The value of this check is to expose that choice consistently across subscriptions, so it is never mistaken for an automatic recovery capability.

`cosmosdb_account_automatic_failover_enabled` makes a core resilience question observable: *will this Cosmos DB account promote a secondary region automatically when the primary region fails?*

#Azure #CosmosDB #Prowler #Contribution #CSPM #CloudSecurity #Cloud #HA #DisasterRecovery
