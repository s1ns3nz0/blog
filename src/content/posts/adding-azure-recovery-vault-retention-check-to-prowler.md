---
title: Adding an Azure Recovery Vault Retention Check to Prowler
description: How Prowler identifies Recovery Services Vault backup policies with insufficient retention.
pubDatetime: 2026-09-09T17:30:00+09:00
tags: [Azure, Backup, Recovery, Prowler, Contribution, CSPM, CloudSecurity, Cloud, DisasterRecovery]
featured: true
---

Backups that expire before an incident is detected cannot support recovery. [Prowler PR #11047](https://github.com/prowler-cloud/prowler/pull/11047) adds `recovery_vault_backup_policy_retention_adequate`, a check for Azure Recovery Services Vault policy retention.

## What the check evaluates

By default, Prowler reports `FAIL` when backup retention is shorter than 30 days and `PASS` when it meets or exceeds that threshold. The check helps expose policies that may be inadequate for incidents, ransomware investigations, or delayed discovery.

## Set retention from recovery objectives

Thirty days is a useful baseline, but each workload should have documented retention requirements tied to business, legal, and threat scenarios. Review daily, weekly, monthly, and yearly recovery points; test recovery from older copies; and protect vault access from accidental or malicious deletion.

`recovery_vault_backup_policy_retention_adequate` asks a practical question of every policy: *will a usable recovery point still exist when the organization needs it?*

#Azure #Backup #Recovery #Prowler #Contribution #CSPM #CloudSecurity #Cloud #DisasterRecovery
