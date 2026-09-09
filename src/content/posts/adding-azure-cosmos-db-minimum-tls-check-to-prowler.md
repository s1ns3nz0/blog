---
title: Adding an Azure Cosmos DB Minimum TLS Check to Prowler
description: How Prowler identifies Cosmos DB accounts that still permit legacy TLS protocols for client connections.
pubDatetime: 2026-09-09T15:00:00+09:00
tags:
  - Azure
  - CosmosDB
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - TLS
  - Encryption
featured: true
---

Encryption in transit depends on both sides of a connection. A Cosmos DB account can use TLS, yet still allow a client to negotiate an obsolete protocol version. That compatibility setting creates an unnecessary path around modern transport-security policy.

[Prowler PR #11033](https://github.com/prowler-cloud/prowler/pull/11033) adds `cosmosdb_account_minimum_tls_version`, an Azure check that verifies Cosmos DB accounts enforce TLS 1.2 or higher for client connections.

## Why a minimum TLS version matters

TLS 1.0 and 1.1 are deprecated protocols with known weaknesses. Allowing them expands the set of cipher suites and protocol behaviors that clients may negotiate, increasing exposure to downgrade and cryptographic attacks.

Setting a minimum version moves the decision to the service boundary: clients that cannot use the required TLS version fail rather than silently connecting with a weaker protocol. This is a basic but important control for databases that carry application data, tokens, or credentials.

## What the new check does

The Prowler check evaluates the Cosmos DB account's `minimalTlsVersion` property.

- It reports `PASS` for `Tls12` and `Tls13`.
- It reports `FAIL` for `Tls10`, `Tls11`, missing values, and other legacy settings.
- It creates one finding per account with the associated Azure subscription.

The check treats a missing setting as a failure because an unverified minimum version should not be assumed to meet the organization’s transport-security standard.

## Enforcing TLS 1.2

Set the account minimum with the Azure CLI:

```bash
az cosmosdb update \
  --name <COSMOS_ACCOUNT_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --minimal-tls-version Tls12
```

Terraform can express the same policy directly:

```hcl
resource "azurerm_cosmosdb_account" "example" {
  name                = "example-cosmos"
  resource_group_name = "example-rg"
  location            = "eastus"
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  minimal_tls_version = "Tls12"
}
```

## Plan the change with clients in mind

Before enforcing a new minimum, inventory all client SDKs, drivers, integration agents, and legacy workloads that connect to the account. Upgrade clients that cannot negotiate TLS 1.2, then watch connection and handshake failures after rollout.

A passing TLS check is one layer of transport protection. Pair it with private endpoints or network restrictions, Entra ID or least-privilege authentication, and monitoring for unexpected connection failures.

`cosmosdb_account_minimum_tls_version` makes a simple security question observable at scale: *does every Cosmos DB account reject client connections that negotiate obsolete TLS protocols?*

#Azure #CosmosDB #Prowler #Contribution #CSPM #CloudSecurity #Cloud #TLS #Encryption
