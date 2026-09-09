---
title: Adding an Azure Cosmos DB Public Network Access Check to Prowler
description: How Prowler identifies Cosmos DB accounts that remain reachable through public network endpoints.
pubDatetime: 2026-09-09T15:15:00+09:00
tags:
  - Azure
  - CosmosDB
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - PrivateEndpoint
  - NetworkSecurity
featured: true
---

Database encryption and identity controls are necessary, but a public endpoint still expands the path an attacker can probe. For Cosmos DB workloads that only serve private applications, exposing the account to public networks is an unnecessary part of the attack surface.

[Prowler PR #11034](https://github.com/prowler-cloud/prowler/pull/11034) adds `cosmosdb_account_public_network_access_disabled`, an Azure check that identifies Cosmos DB accounts with public network access enabled.

## Why public network access matters

When public network access is enabled, clients can reach the Cosmos DB endpoint over the internet, subject to authentication and firewall policy. Those controls are valuable, but they leave a public service boundary to manage and monitor.

Private endpoints move that access path into an Azure virtual network. Applications connect through private IP addresses, and network controls can limit access to approved subnets, private DNS, and connected networks. This supports defense in depth for databases holding sensitive application data.

## What the new check does

The check evaluates the Cosmos DB account `publicNetworkAccess` setting.

- It reports `PASS` when the value is `Disabled`.
- It reports `FAIL` when access is enabled, missing, or any value other than `Disabled`.
- It creates one finding per Cosmos DB account with its Azure subscription context.

The strict evaluation is intentional. A missing or unexpected setting should not be treated as proof that a database is private.

## Moving to private access

The target configuration is to create a private endpoint, configure the required private DNS zone, validate application connectivity through the VNet, and then disable public network access. The final policy can be expressed in infrastructure as code:

```hcl
resource "azurerm_cosmosdb_account" "example" {
  name                = "example-cosmos"
  resource_group_name = "example-rg"
  location            = "eastus"
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  public_network_access_enabled = false
}
```

## Validate before enforcing

Disabling public access can break applications that still use public DNS resolution, developer tools outside the VNet, or integration services without private connectivity. Before rollout, verify private DNS resolution, VNet and peering routes, private-endpoint approval, and operational access paths.

`cosmosdb_account_public_network_access_disabled` makes a direct network-boundary question visible across subscriptions: *can this Cosmos DB account still be reached through a public endpoint when it should be private?*

#Azure #CosmosDB #Prowler #Contribution #CSPM #CloudSecurity #Cloud #PrivateEndpoint #NetworkSecurity
