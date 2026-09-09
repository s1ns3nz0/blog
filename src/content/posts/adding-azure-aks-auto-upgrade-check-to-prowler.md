---
title: Adding an Azure AKS Auto-Upgrade Check to Prowler
description: How Prowler identifies AKS clusters without an automatic Kubernetes upgrade channel and helps prevent version drift.
pubDatetime: 2026-09-09T13:30:00+09:00
tags:
  - Azure
  - AKS
  - Kubernetes
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
featured: true
---

Keeping a Kubernetes cluster secure is not a one-time configuration task. Kubernetes and its managed-service components receive security fixes, and clusters that remain on an old version can drift outside the supported window or miss patches for known vulnerabilities.

[Prowler PR #11027](https://github.com/prowler-cloud/prowler/pull/11027) adds `aks_cluster_auto_upgrade_enabled`, an Azure check that identifies Azure Kubernetes Service (AKS) clusters with no automatic upgrade channel configured.

## Why AKS auto-upgrade matters

AKS upgrades are operationally significant. They update the control plane first and then upgrade agent pools one by one. Without a defined upgrade process, teams need to track Kubernetes releases, test compatibility, schedule maintenance, and upgrade every cluster manually.

That manual model can work for a small, tightly managed estate. At scale, however, it creates a predictable failure mode: clusters fall behind, security patches wait for an operational window that never arrives, and eventually a cluster approaches an unsupported version.

AKS auto-upgrade channels provide a managed cadence for staying current. Microsoft describes this as a set-once approach that helps clusters receive AKS and upstream Kubernetes patches without manually redeploying workloads or building a replacement cluster. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster)

## What the new check does

The new Prowler check is named `aks_cluster_auto_upgrade_enabled`. It evaluates the AKS cluster's `auto_upgrade_channel` setting.

- It reports `PASS` when a non-empty, active upgrade channel is configured.
- It reports `FAIL` when the setting is absent, empty, or set to `none`.
- It normalizes the value before evaluation, so values such as `None` and `none` do not accidentally pass.

The PR also expands Prowler's AKS service model with fields shared by several AKS checks, including the auto-upgrade channel, Microsoft Defender status, Azure Monitor status, and local-account setting. This makes the check part of a broader AKS security posture rather than an isolated API lookup.

## Select a channel deliberately

For AKS Standard clusters, the available channels represent different trade-offs:

| Channel | Behavior |
| --- | --- |
| `patch` | Applies the newest supported patch within the current minor version. |
| `stable` | Moves to the latest patch release on the N-1 supported minor version. |
| `rapid` | Moves toward the newest supported minor version more quickly. |
| `none` | Disables automatic upgrades. |

The best channel depends on the workload. A production platform that prioritizes stability may choose `stable`; a workload that must receive patches as early as possible may choose `patch` or `rapid` after appropriate compatibility testing. Microsoft recommends `stable` or `rapid` to remain within the supported version window, and notes that AKS Automatic clusters already use the `stable` channel. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster)

The purpose of this check is not to prescribe one channel for every cluster. It ensures that a cluster has an explicit upgrade policy instead of silently relying on `none`, the default setting for AKS Standard clusters.

## Enabling auto-upgrade

An existing AKS Standard cluster can be configured with an upgrade channel using the Azure CLI:

```bash
az aks update \
  --resource-group <resource-group-name> \
  --name <cluster-name> \
  --auto-upgrade-channel stable
```

Teams should also configure a planned maintenance window. This gives the platform a defined period for upgrades and helps align cluster changes with application support coverage. Microsoft recommends a maintenance window of at least four hours for proper operation. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster)

## Automatic upgrades still require preparation

Enabling an upgrade channel does not eliminate the need to operate Kubernetes well. Before relying on automatic upgrades, teams should validate:

- PodDisruptionBudgets allow workloads to drain safely.
- Applications tolerate pod restarts and node replacement.
- Cluster add-ons, admission controllers, and custom resources support the target Kubernetes versions.
- Monitoring alerts distinguish planned upgrade activity from an unexpected outage.
- A non-production cluster or staging path validates releases before they reach critical workloads.

Node image updates need attention as well. The legacy `node-image` cluster auto-upgrade channel is no longer recommended; use the dedicated node image auto-upgrade capability where it fits the cluster’s upgrade policy. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-cluster)

`aks_cluster_auto_upgrade_enabled` makes one foundational question visible across an Azure estate: *does this cluster have a defined path to receive Kubernetes updates?* It helps teams find clusters that may otherwise accumulate version drift, then pair the selected channel with maintenance windows, workload resilience, and release validation.

#Azure #AKS #Kubernetes #Prowler #Contribution #CSPM #CloudSecurity #Cloud
