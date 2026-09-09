---
title: Adding a GCP Cloud SQL CMEK Check to Prowler
description: How Prowler identifies Cloud SQL instances that use Google-managed encryption keys instead of customer-managed keys in Cloud KMS.
pubDatetime: 2026-09-09T12:30:00+09:00
tags:
  - GCP
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - GoogleCloud
  - CloudSQL
featured: true
---

Cloud SQL encrypts customer content at rest by default. That default is valuable, but it leaves Google responsible for the key-encryption keys. Some organizations need a different control boundary: they need to own the key lifecycle, choose its location and protection level, review its usage, and be able to revoke access.

[Prowler PR #11023](https://github.com/prowler-cloud/prowler/pull/11023) adds `cloudsql_instance_cmek_encryption_enabled`, a GCP check that identifies Cloud SQL instances not configured with a customer-managed encryption key (CMEK) from Cloud KMS.

## Why CMEK matters

With Google default encryption, Cloud SQL encrypts data at rest without any action from the customer. With CMEK, Cloud SQL still manages the database service, but the key-encryption key is stored and managed through Cloud KMS.

That distinction gives the customer control over key protection level, location, rotation schedule, IAM permissions, lifecycle, and audit logs. [Google Cloud's CMEK documentation](https://cloud.google.com/sql/docs/mysql/cmek) also makes the operational consequence clear: if Cloud SQL cannot access the key, it suspends the instance until access is restored.

CMEK is therefore not a universal replacement for Google-managed encryption. It is a security and compliance control for workloads whose data-classification, tenant-isolation, audit, or cryptographic-erasure requirements justify the added operational responsibility.

## What the new check does

The Prowler check is named `cloudsql_instance_cmek_encryption_enabled`. It reads the Cloud SQL instance configuration and examines `diskEncryptionConfiguration.kmsKeyName`.

- It reports `PASS` when the instance has a Cloud KMS key name configured.
- It reports `FAIL` when the configuration is missing or the key name is empty.
- It exposes the discovered CMEK key name in the service model so that the finding can identify the configured control.

The implementation also extends Prowler's Cloud SQL service layer and adds test coverage for CMEK-enabled instances, Google-managed encryption, missing encryption configuration, and empty key values.

## A failed check is a governance signal

A `FAIL` does not mean that the data is unencrypted. Cloud SQL encrypts customer content at rest by default. It means the instance is using Google-managed keys instead of a customer-managed key.

Whether that is acceptable depends on the workload. A development database with no sensitive data may reasonably use the default. A production database that stores regulated or highly sensitive information may require CMEK to satisfy internal policy, customer commitments, or compliance requirements.

The important outcome is consistency: teams can use the check to find instances that deviate from a defined encryption-key policy, then document exceptions or plan migration work.

## Plan before creating the instance

Cloud SQL CMEK is primarily a design-time choice. Google Cloud documents that CMEK cannot be enabled on an existing instance, and an instance cannot switch between Google-managed encryption and Cloud KMS encryption after creation. [Google Cloud documentation](https://cloud.google.com/sql/docs/mysql/cmek)

That makes remediation more involved than adding a setting to an existing database. A typical path is:

1. Create a Cloud KMS key ring and cryptographic key in the same region as the intended Cloud SQL instance.
2. Grant the Cloud SQL service account permission to use that key.
3. Create a new CMEK-enabled Cloud SQL instance.
4. Migrate the data and application connections.
5. Validate backups, replicas, monitoring, and recovery procedures before retiring the original instance.

The key must be available when Cloud SQL needs it. Disabling or destroying a key version can suspend the instance or make backups permanently unrecoverable. Key rotation also needs operational planning: Cloud SQL does not automatically re-encrypt an instance with a new primary key version. [Google Cloud documentation](https://cloud.google.com/sql/docs/mysql/cmek)

## What to review after the check passes

A configured key is a strong start, but the configuration should be reviewed as a complete control:

- Is the KMS key in the same region as the Cloud SQL instance?
- Does the Cloud SQL service account have only the KMS permissions it needs?
- Are key-use audit logs monitored and retained?
- Are backups, clones, and replicas covered by the intended key-management design?
- Is key rotation tested, with retention rules that preserve the key versions required to decrypt existing data and backups?

`cloudsql_instance_cmek_encryption_enabled` turns the first question into a repeatable CSPM check: *does this Cloud SQL instance use the customer-managed key policy required for this workload?* It gives teams an inventory of exceptions before they become an incident, an audit finding, or an expensive migration.

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #CloudSQL
