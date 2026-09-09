---
title: Adding an Azure PostgreSQL Geo-Redundant Backup Check to Prowler
description: How Prowler verifies that Azure Database for PostgreSQL Flexible Server backups are geo-redundant.
pubDatetime: 2026-09-09T17:20:00+09:00
tags:
  - Azure
  - PostgreSQL
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - Backup
  - DisasterRecovery
featured: true
---

Regional failures can affect both a database and backups stored beside it. A PostgreSQL recovery strategy that is limited to one region may not meet the business objective for a serious outage or destructive data event.

[Prowler PR #11045](https://github.com/prowler-cloud/prowler/pull/11045) adds `postgresql_flexible_server_geo_redundant_backup_enabled`, which identifies Azure Database for PostgreSQL Flexible Servers without geo-redundant backup enabled.

## Why geo-redundant backup matters

Backups protect against deletion, corruption, ransomware, and failures that high availability alone cannot address. Geo-redundancy adds separation from the primary region, giving recovery teams an additional option when the main service boundary is unavailable.

The control should be considered with retention, recovery objectives, the protection of backup access, and the destination environment for a restored service.

## What the new check does

The check evaluates the server's `geo_redundant_backup` setting.

- It reports `PASS` when the setting is `Enabled`.
- It reports `FAIL` for disabled, missing, or any other setting value.
- It generates per-server evidence for comparison across Azure subscriptions.

This strict result avoids treating an unavailable setting as proof of regional recovery coverage.

## Define recovery requirements first

Set recovery point and recovery-time objectives for each PostgreSQL workload before choosing backup settings. Production systems that must recover from a regional outage should have geo-redundancy, an appropriate retention schedule, and clear ownership for initiating and validating a restore.

Geo-redundant backup is selected when creating a Flexible Server:

```bash
az postgres flexible-server create \
  --name <server-name> \
  --resource-group <resource-group> \
  --location <region> \
  --geo-redundant-backup Enabled
```

Terraform records the creation-time requirement with the server resource:

```hcl
resource "azurerm_postgresql_flexible_server" "example" {
  name                         = "example-postgresql"
  resource_group_name          = "example-rg"
  location                     = "eastus"
  geo_redundant_backup_enabled = true
}
```

## Practice a restoration

Restore a representative backup into an isolated environment. Verify PostgreSQL data integrity, application connection details, identity and secret access, network controls, and the operational steps needed to return a service to users.

`postgresql_flexible_server_geo_redundant_backup_enabled` keeps the regional-recovery requirement visible across PostgreSQL estates.

#Azure #PostgreSQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #Backup #DisasterRecovery
