---
title: Adding an Azure MySQL High Availability Check to Prowler
description: How Prowler identifies Azure Database for MySQL Flexible Servers without failover-ready high availability.
pubDatetime: 2026-09-09T17:05:00+09:00
tags: [Azure, MySQL, Prowler, Contribution, CSPM, CloudSecurity, Cloud, HA, DisasterRecovery]
featured: true
---

Database backups support recovery, but they do not provide quick continuity when the primary database service fails. [Prowler PR #11042](https://github.com/prowler-cloud/prowler/pull/11042) adds `mysql_flexible_server_high_availability_enabled` to verify that Azure Database for MySQL Flexible Server has high availability configured.

## What the check evaluates

The check reports `PASS` when high availability is enabled through Same-Zone or Zone-Redundant mode. It reports `FAIL` when the mode is disabled or absent. The result highlights servers that lack an automatic failover path.

## Design around service continuity

Choose Same-Zone or Zone-Redundant HA based on the workload's availability goals and the regional topology. Test application reconnect behavior, document operational ownership, and combine HA with backups and restore exercises: failover protects continuity, while backups protect data recovery.

`mysql_flexible_server_high_availability_enabled` gives platform teams a concise control to track: *will this MySQL server have a failover capability when its primary path fails?*

#Azure #MySQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #HA #DisasterRecovery
