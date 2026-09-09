---
title: Adding an Azure MySQL Geo-Redundant Backup Check to Prowler
description: How Prowler verifies that Azure Database for MySQL Flexible Server backups can survive a regional outage.
pubDatetime: 2026-09-09T17:00:00+09:00
tags:
  - Azure
  - MySQL
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - Backup
  - DisasterRecovery
featured: true
---

A backup held only in the same region as its database may be unavailable during the incident it is meant to address. A regional outage or destructive event can affect both a MySQL Flexible Server and its local recovery copies.

[Prowler PR #11041](https://github.com/prowler-cloud/prowler/pull/11041) adds `mysql_flexible_server_geo_redundant_backup_enabled`, which identifies MySQL Flexible Servers without geo-redundant backup enabled.

## Why geo-redundant backups matter

High availability protects the service path when a primary component fails. Backups solve a different problem: recovering data after corruption, deletion, ransomware, or a longer regional outage. Keeping recovery copies outside the primary region provides an option when that regional boundary is the failure domain.

This control should be considered alongside retention duration, restore access, and the location where a recovered application can run.

## What the new check does

The check evaluates the server's `geo_redundant_backup` setting.

- It reports `PASS` when the setting is `Enabled`.
- It reports `FAIL` for every other value, including a disabled or missing configuration.
- It creates a finding for each Flexible Server so teams can compare recovery coverage across subscriptions.

The strict evaluation prevents an unknown setting from being treated as evidence of regional recoverability.

## Build recovery into the server design

Enable geo-redundant backup for workloads whose recovery objectives require it, then document the recovery point and recovery-time objectives it supports. Pair the control with a retention policy that preserves recovery points long enough to detect and investigate an incident.

## Test the complete recovery path

Run restore exercises into an isolated environment. Validate database integrity, application configuration, credentials, network access, and the ownership process for approving and operating a recovered workload.

`mysql_flexible_server_geo_redundant_backup_enabled` turns a resilience assumption into an auditable question: *can this database's backups remain available outside its primary region?*

#Azure #MySQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #Backup #DisasterRecovery
