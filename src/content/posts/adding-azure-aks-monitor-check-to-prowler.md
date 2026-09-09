---
title: Adding an Azure AKS Monitor Check to Prowler
description: How Prowler identifies AKS clusters without Azure Monitor managed Prometheus metrics enabled.
pubDatetime: 2026-09-09T14:00:00+09:00
tags:
  - Azure
  - AKS
  - Kubernetes
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - AzureMonitor
  - Prometheus
featured: true
---

An AKS cluster can be correctly configured today and still become difficult to operate tomorrow if nobody can see rising resource pressure, failing workloads, or unusual behavior. Metrics are the foundation for detecting that change early.

[Prowler PR #11029](https://github.com/prowler-cloud/prowler/pull/11029) adds `aks_cluster_azure_monitor_enabled`, an Azure check that identifies Azure Kubernetes Service clusters without Azure Monitor managed Prometheus metrics enabled.

## Why cluster metrics matter

Kubernetes operates through many moving parts: nodes, pods, controllers, the API server, networking, storage, and application workloads. Incidents often start as a gradual signal rather than a binary outage: memory pressure climbs, pod restarts increase, pending pods accumulate, or error rates rise.

Azure Monitor managed service for Prometheus collects cluster and workload metrics into an Azure Monitor workspace, where teams can use dashboards and alerts to watch those signals. Without that visibility, availability degradation and suspicious resource consumption can go unnoticed until users report an outage.

Metrics also support security operations. They can help establish a baseline, expose abnormal resource use, and aid investigation after an incident. They do not replace runtime threat detection or audit logs, but they provide the operational evidence needed to understand how a cluster behaved.

## What the new check does

The Prowler check is named `aks_cluster_azure_monitor_enabled`. It evaluates the AKS managed-cluster metrics configuration:

```text
azureMonitorProfile.metrics.enabled
```

- It reports `PASS` when Azure Monitor managed Prometheus metrics are enabled.
- It reports `FAIL` when metrics are disabled or the setting is absent.
- It creates one finding per cluster and includes the Azure subscription and location in the report.

The check is scoped specifically to **managed Prometheus metrics**. It does not claim that Container Insights logs are enabled. This distinction matters: Container Insights uses the `omsagent` log add-on, while Azure Monitor managed Prometheus provides the metrics path evaluated by this rule.

## Enabling managed Prometheus metrics

For an existing AKS cluster, enable the metrics integration with the Azure CLI:

```bash
az aks update \
  --resource-group <RESOURCE_GROUP> \
  --name <CLUSTER_NAME> \
  --enable-azure-monitor-metrics
```

In the Azure portal, the same setting is available from the AKS cluster's monitoring configuration. Select **Enable Prometheus metrics** and choose or create the Azure Monitor workspace that will receive the data.

For infrastructure as code, the key requirement is enabling the AKS monitor-metrics profile, for example:

```hcl
resource "azurerm_kubernetes_cluster" "example" {
  name                = "example-aks"
  location            = "eastus"
  resource_group_name = "example-rg"
  dns_prefix          = "example"

  monitor_metrics {}
}
```

## A passing check is not a monitoring strategy

Enabling collection only creates the possibility of observability. Teams still need to decide which conditions warrant an alert, where notifications go, and who owns the response.

After the check passes, review:

- Whether the workspace has the right access controls, retention, and cost boundaries.
- Whether dashboards cover node health, pod availability, resource saturation, and workload-level service indicators.
- Whether alerts have actionable thresholds and route to an on-call process.
- Whether Container Insights logs are also needed for diagnosis alongside metrics.
- Whether Microsoft Defender for Containers is enabled for runtime security signals and posture findings.

Prowler's `aks_cluster_azure_monitor_enabled` check turns a basic observability expectation into a repeatable CSPM control: *does every AKS cluster emit the managed Prometheus metrics required to detect and investigate operational risk?*

#Azure #AKS #Kubernetes #Prowler #Contribution #CSPM #CloudSecurity #Cloud #AzureMonitor #Prometheus
