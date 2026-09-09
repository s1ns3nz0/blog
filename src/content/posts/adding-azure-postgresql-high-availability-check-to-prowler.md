---
title: Adding an Azure PostgreSQL High Availability Check to Prowler
description: How Prowler identifies Azure Database for PostgreSQL Flexible Servers without enabled high availability.
pubDatetime: 2026-09-09T17:25:00+09:00
tags: [Azure, PostgreSQL, Prowler, Contribution, CSPM, CloudSecurity, Cloud, HA, DisasterRecovery]
featured: true
---

Availability requirements for production databases need an operational failover design, not just backup retention. [Prowler PR #11046](https://github.com/prowler-cloud/prowler/pull/11046) adds `postgresql_flexible_server_high_availability_enabled` for Azure Database for PostgreSQL Flexible Server.

## What the check evaluates

The check reports `PASS` when high availability is enabled and `FAIL` when the setting is disabled or missing. It gives teams a subscription-wide view of PostgreSQL servers that do not have the expected failover capability.

## Make failover usable

Select Same-Zone or Zone-Redundant HA according to the workload's service objectives. Exercise failover with the application, verify connection retry behavior, and combine HA with geo-redundant backups for separate continuity and recovery protections.

`postgresql_flexible_server_high_availability_enabled` makes an essential resilience decision measurable across cloud databases.

#Azure #PostgreSQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #HA #DisasterRecovery
