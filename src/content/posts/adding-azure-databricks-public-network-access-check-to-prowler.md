---
title: Adding an Azure Databricks Public Network Access Check to Prowler
description: How Prowler identifies Azure Databricks workspaces that remain accessible through public network endpoints.
pubDatetime: 2026-09-09T15:30:00+09:00
tags:
  - Azure
  - Databricks
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - PrivateEndpoint
  - NetworkSecurity
featured: true
---

Azure Databricks often processes high-value analytics and machine-learning data. Identity controls and workspace permissions matter, but public network access still leaves an internet-facing route to the service. For private enterprise workloads, that route is unnecessary exposure.

[Prowler PR #11035](https://github.com/prowler-cloud/prowler/pull/11035) adds `databricks_workspace_public_network_access_disabled`, an Azure check that identifies Databricks workspaces where public network access is still enabled.

## Why private connectivity matters

With public network access enabled, a Databricks workspace can be reached from the internet, subject to its authentication and network policies. Those policies are useful, but they create a public boundary that teams must continuously configure, monitor, and defend.

Azure Private Link keeps workspace connectivity on private IP addresses inside approved virtual networks. It reduces the reachable surface and lets teams apply network controls through VNets, private DNS, routing, and segmentation. This is especially valuable where a workspace handles sensitive datasets or serves production pipelines.

## What the new check does

The check evaluates each Azure Databricks workspace's `publicNetworkAccess` setting.

- It reports `PASS` when the value is `Disabled`.
- It reports `FAIL` when access is enabled or the setting is absent.
- It creates a finding for each workspace with its Azure subscription context.

Treating an unset value as a failure is deliberate. A missing configuration is not evidence that public access is blocked.

## Disabling public access

After Private Link connectivity is ready, public access can be disabled from the Azure CLI:

```bash
az databricks workspace update \
  --name <workspace-name> \
  --resource-group <resource-group> \
  --public-network-access Disabled
```

The same policy can be captured in Terraform:

```hcl
resource "azurerm_databricks_workspace" "example" {
  name                = "example-databricks"
  resource_group_name = "example-rg"
  location            = "eastus"
  sku                 = "premium"

  public_network_access_enabled = false
}
```

## Verify the access path first

Turning off public access before private networking is complete can interrupt notebooks, jobs, CI/CD systems, and administration workflows. Validate the private endpoint, private DNS resolution, VNet routes, and all client locations before enforcing the change. Pairing the setting with VNet injection, secure cluster connectivity with no public IP, and least-privilege workspace access creates a stronger layered boundary.

`databricks_workspace_public_network_access_disabled` turns that boundary into a clear CSPM question: *is this Databricks workspace still reachable through a public endpoint?*

#Azure #Databricks #Prowler #Contribution #CSPM #CloudSecurity #Cloud #PrivateEndpoint #NetworkSecurity
