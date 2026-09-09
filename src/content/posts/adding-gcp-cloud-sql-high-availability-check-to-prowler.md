---
title: Adding a GCP Cloud SQL High Availability Check to Prowler
description: How Prowler identifies Cloud SQL primary instances that lack regional high availability and automatic zonal failover.
pubDatetime: 2026-09-09T12:45:00+09:00
tags:
  - GCP
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - GoogleCloud
  - CloudSQL
  - HA
  - DisasterRecovery
featured: true
---

A database can be encrypted, privately connected, and carefully access-controlled, yet still become unavailable when its zone fails. For production workloads, availability is part of the security and reliability posture.

[Prowler PR #11024](https://github.com/prowler-cloud/prowler/pull/11024) adds `cloudsql_instance_high_availability_enabled`, a GCP check that identifies Cloud SQL primary instances not configured for regional high availability.

## What Cloud SQL high availability provides

Cloud SQL high availability uses a primary instance and a standby instance in separate zones within the same region. Writes are synchronously replicated to persistent disks in both zones before a transaction is committed. If the primary instance or its zone becomes unavailable, Cloud SQL fails over to the standby and routes clients to the new primary. [Google Cloud documentation](https://cloud.google.com/sql/docs/mysql/high-availability)

This is different from a zonal, standalone instance. A zonal instance has no standby replica for automatic zone-level failover. Recovery from a zonal outage becomes a manual operation, such as restoring a new instance from point-in-time recovery or promoting a read replica. Those options can extend downtime and may introduce a recovery-point gap.

Regional HA does not make an application failure-proof. Existing database connections close during failover, and applications need to reconnect. Google Cloud notes that failover typically makes the instance unavailable for around 60 seconds, although the actual duration depends on the environment. It is nevertheless a substantially different recovery posture from rebuilding a standalone database after an outage.

## What the new check does

The Prowler check is named `cloudsql_instance_high_availability_enabled`. It evaluates the `availabilityType` value in each Cloud SQL primary instance's settings.

- It reports `PASS` when `availabilityType` is `REGIONAL`.
- It reports `FAIL` when the availability type is `ZONAL`.
- It treats a missing availability setting as `ZONAL`, which makes the default explicit in the result.
- It skips read replicas because the check evaluates the availability configuration of primary instances.

The implementation extends Prowler's Cloud SQL service model with an availability-type field, then adds tests for regional instances, zonal instances, missing settings, empty inventories, and read-replica handling.

## Interpreting a failed finding

A failed finding is not necessarily a defect. For a development, test, or low-criticality workload, a zonal instance may be the appropriate cost and complexity trade-off.

For a production system with an availability objective, though, the finding should trigger a deliberate decision. Does a single-zone outage exceed the application's recovery-time objective? Can the business tolerate manual recovery? Are data-loss and connection-reconfiguration risks acceptable during that recovery?

The cost trade-off should be explicit too. Google Cloud states that an HA-configured instance costs roughly twice as much as a standalone instance because the configuration includes CPU, memory, and storage for the standby. [Google Cloud documentation](https://cloud.google.com/sql/docs/mysql/high-availability) Prowler cannot decide whether that cost is justified; it makes the configuration visible so teams can apply the right policy per environment.

## Enabling high availability

For an eligible primary instance, high availability can be enabled by changing the instance configuration to regional availability. The equivalent Terraform setting is:

```hcl
resource "google_sql_database_instance" "production" {
  name             = "production-db"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"
  }
}
```

Enabling HA is not the final validation step. Teams should test planned failover, ensure the application retries database connections correctly, and confirm that backups and point-in-time recovery are enabled. Cloud SQL requires automated backups and point-in-time recovery for HA primary instances. [Google Cloud documentation](https://cloud.google.com/sql/docs/mysql/high-availability)

## What to review after the check passes

A `REGIONAL` setting is the baseline. A resilient production database also needs:

- Application retry logic that handles closed connections during failover.
- Tested backups and recovery procedures for data corruption and operator error, which HA alone does not address.
- Monitoring for failover operations, standby health, capacity, and replication-related issues.
- A read-replica strategy that considers zone placement and workload behavior.
- An explicit regional disaster-recovery plan, since regional HA protects against zone and instance failures within one region rather than a full regional outage.

`cloudsql_instance_high_availability_enabled` turns a reliability design choice into an observable CSPM control: *are the Cloud SQL primary instances that need automatic zonal failover actually configured for it?*

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #CloudSQL #HA #DisasterRecovery
