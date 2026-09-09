---
title: Adding an Azure PostgreSQL Geo-Redundant Backup Check to Prowler
description: How Prowler verifies that Azure Database for PostgreSQL Flexible Server backups are geo-redundant.
pubDatetime: 2026-09-09T17:20:00+09:00
tags: [Azure, PostgreSQL, Prowler, Contribution, CSPM, CloudSecurity, Cloud, Backup, DisasterRecovery]
featured: true
---

Regional failures can affect both a database and backups stored beside it. [Prowler PR #11045](https://github.com/prowler-cloud/prowler/pull/11045) adds `postgresql_flexible_server_geo_redundant_backup_enabled`, a check for geo-redundant backups on Azure Database for PostgreSQL Flexible Server.

## What the check evaluates

It reports `PASS` only when `geo_redundant_backup` is `Enabled`; any other state is `FAIL`. The control identifies databases whose backup design may not meet regional-disaster recovery objectives.

## Confirm recovery beyond configuration

Geo-redundancy needs a tested recovery procedure. Define where restored services will run, validate database and application recovery, protect backup access with least privilege, and review retention against the time it might take to discover a compromise or corruption event.

`postgresql_flexible_server_geo_redundant_backup_enabled` keeps the regional-recovery requirement visible across PostgreSQL estates.

#Azure #PostgreSQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #Backup #DisasterRecovery
