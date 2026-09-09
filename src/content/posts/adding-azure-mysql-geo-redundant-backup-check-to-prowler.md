---
title: Adding an Azure MySQL Geo-Redundant Backup Check to Prowler
description: How Prowler verifies that Azure Database for MySQL Flexible Server backups can survive a regional outage.
pubDatetime: 2026-09-09T17:00:00+09:00
tags: [Azure, MySQL, Prowler, Contribution, CSPM, CloudSecurity, Cloud, Backup, DisasterRecovery]
featured: true
---

A backup held only in the same region as a database may be unavailable during the incident it is meant to address. [Prowler PR #11041](https://github.com/prowler-cloud/prowler/pull/11041) adds `mysql_flexible_server_geo_redundant_backup_enabled`, which checks whether Azure Database for MySQL Flexible Server has geo-redundant backup enabled.

## What the check evaluates

The check reports `PASS` when `geo_redundant_backup` is `Enabled` and `FAIL` for every other value. This makes the recovery boundary explicit: a backup strategy should account for a regional outage, not only accidental deletion or a local service failure.

## Build for recoverability

Enable geo-redundant backup when creating a suitable MySQL Flexible Server, then document the recovery point and recovery-time objectives the configuration supports. Test restores into a separate environment, validate application connectivity and data integrity, and keep retention, access controls, and backup monitoring aligned with the workload's business importance.

`mysql_flexible_server_geo_redundant_backup_enabled` turns a resilience assumption into an auditable question: *can this database's backups remain available outside its primary region?*

#Azure #MySQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #Backup #DisasterRecovery
