---
title: Adding an Azure PostgreSQL High Availability Check to Prowler
description: How Prowler identifies Azure Database for PostgreSQL Flexible Servers without enabled high availability.
pubDatetime: 2026-09-09T17:25:00+09:00
tags:
  - Azure
  - PostgreSQL
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - HA
  - DisasterRecovery
featured: true
---

Availability requirements for production databases need an operational failover design, not just backup retention. A restore can recover data, but it usually cannot provide the short interruption window expected for a critical PostgreSQL service.

[Prowler PR #11046](https://github.com/prowler-cloud/prowler/pull/11046) adds `postgresql_flexible_server_high_availability_enabled`, which identifies Azure Database for PostgreSQL Flexible Servers without high availability enabled.

## Why high availability matters

High availability provides a standby and managed failover path when a primary database component or its hosting zone fails. It reduces the time needed to restore service and lets application teams design around a known database continuity behavior.

Same-Zone and Zone-Redundant modes serve different availability boundaries. Teams should choose the mode that matches workload criticality and the regional architecture.

## What the new check does

The check evaluates the PostgreSQL Flexible Server high-availability configuration.

- It reports `PASS` when high availability is enabled.
- It reports `FAIL` when the setting is disabled or absent.
- It returns one finding per server, exposing gaps across subscriptions and environments.

The finding is a policy signal. Development or temporary systems may have different requirements, but production policy should be explicit.

## Pair continuity with data recovery

Use HA to reduce service interruption and geo-redundant backups to recover from data loss or a wider regional event. Both are needed for a complete database resilience design. Include standby cost, capacity, and ownership in the service plan.

Enable Zone-Redundant HA on an eligible existing PostgreSQL server:

```bash
az postgres flexible-server update \
  --name <server-name> \
  --resource-group <resource-group> \
  --high-availability ZoneRedundant
```

The same configuration can be declared with Terraform. High availability requires a supported service tier.

```hcl
resource "azurerm_postgresql_flexible_server" "example" {
  name                = "example-postgresql"
  resource_group_name = "example-rg"
  location            = "eastus"
  sku_name            = "GP_Standard_D2ds_v4"

  high_availability {
    mode = "ZoneRedundant"
  }
}
```

## Exercise the application path

Test a planned failover with the application. Confirm retries, connection pooling, timeout handling, monitoring, and escalation procedures. A successful database failover does not guarantee uninterrupted service if clients cannot reconnect.

`postgresql_flexible_server_high_availability_enabled` makes an essential resilience decision measurable across cloud databases.

#Azure #PostgreSQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #HA #DisasterRecovery
