---
title: Adding an Azure MySQL High Availability Check to Prowler
description: How Prowler identifies Azure Database for MySQL Flexible Servers without failover-ready high availability.
pubDatetime: 2026-09-09T17:05:00+09:00
tags:
  - Azure
  - MySQL
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - HA
  - DisasterRecovery
featured: true
---

Database backups are essential for data recovery, but they do not provide quick service continuity when the primary database path fails. Production MySQL workloads need a failover design that matches their availability objectives.

[Prowler PR #11042](https://github.com/prowler-cloud/prowler/pull/11042) adds `mysql_flexible_server_high_availability_enabled`, which identifies MySQL Flexible Servers without high availability configured.

## Why database high availability matters

An unplanned outage can interrupt applications even when backups are healthy. High availability provides a standby and a managed failover mechanism, reducing the time required to restore database service after a primary failure.

Same-Zone and Zone-Redundant options offer different resilience boundaries, so the selection should be made deliberately for each workload.

## What the new check does

The check evaluates the Flexible Server high-availability mode.

- It reports `PASS` when Same-Zone or Zone-Redundant high availability is enabled.
- It reports `FAIL` when the mode is disabled or not configured.
- It produces findings per server, making gaps visible across Azure subscriptions.

The check does not decide whether every development workload needs HA. It shows where a server lacks the failover capability required by its policy.

## Select a continuity model

Classify databases by business impact, downtime tolerance, and dependency criticality. Configure the appropriate HA mode for services that need continuity, and pair it with geo-redundant backups because failover and restore protect against different failures.

## Verify application failover behavior

Exercise failover in a controlled environment. Validate client retry behavior, connection pooling, timeouts, monitoring alerts, and the runbook used by application and database operators.

`mysql_flexible_server_high_availability_enabled` gives platform teams a direct control to track: *will this MySQL server have a failover capability when its primary path fails?*

#Azure #MySQL #Prowler #Contribution #CSPM #CloudSecurity #Cloud #HA #DisasterRecovery
