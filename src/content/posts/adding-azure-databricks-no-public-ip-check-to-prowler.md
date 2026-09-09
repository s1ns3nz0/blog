---
title: Adding an Azure Databricks No Public IP Check to Prowler
description: How Prowler verifies that Azure Databricks classic-compute workspaces use secure cluster connectivity.
pubDatetime: 2026-09-09T15:45:00+09:00
tags:
  - Azure
  - Databricks
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - NetworkSecurity
  - NoPublicIP
featured: true
---

Data platforms need a secure workspace boundary, but that boundary must extend to the compute nodes that run notebooks and jobs. When Azure Databricks classic-compute nodes receive public IP addresses, they gain an internet-reachable path that expands the workload's attack surface.

[Prowler PR #11036](https://github.com/prowler-cloud/prowler/pull/11036) adds `databricks_workspace_no_public_ip_enabled`, an Azure check for secure cluster connectivity, also known as No Public IP (NPIP).

## What secure cluster connectivity changes

With secure cluster connectivity enabled, Azure Databricks deploys classic-compute cluster nodes without public IP addresses. The nodes communicate with the Databricks control plane through a secure relay instead of accepting inbound connectivity from the internet.

This reduces opportunities for direct scanning and limits the network paths available after a compute node is compromised. It also works well with VNet injection, private endpoints, restrictive network security groups, and least-privilege workspace permissions.

## What the new check does

The check evaluates the workspace's `enableNoPublicIp` setting.

- It reports `PASS` when secure cluster connectivity is enabled.
- It reports `FAIL` when the setting is explicitly disabled and classic-compute nodes can receive public IP addresses.
- It reports `MANUAL` when the workspace does not expose the setting, such as serverless workspaces that do not have customer-managed cluster nodes with public IPs.

The manual result prevents a missing classic-compute setting from being mislabeled as a failed configuration while still prompting the team to verify the workspace's network model.

## Build the setting into new workspaces

No Public IP is a workspace-creation decision for classic compute. Teams that need it on an existing workspace should plan a migration: create a new workspace with the required network design, move workloads and data integrations, validate them, then decommission the old workspace.

Terraform can define the setting at creation time:

```hcl
resource "azurerm_databricks_workspace" "example" {
  name                = "example-databricks"
  resource_group_name = "example-rg"
  location            = "eastus"
  sku                 = "premium"

  custom_parameters {
    no_public_ip = true
  }
}
```

## Treat it as part of a network design

No Public IP is strongest when paired with private endpoints or disabled public network access, VNet injection where appropriate, and tightly scoped outbound and identity controls. Before migrating, map every dependency that reaches the workspace, including CI/CD systems, data sources, orchestration services, and user access paths.

`databricks_workspace_no_public_ip_enabled` gives cloud-security teams a direct control to track: *do this workspace's classic-compute nodes operate without public IP addresses?*

#Azure #Databricks #Prowler #Contribution #CSPM #CloudSecurity #Cloud #NetworkSecurity #NoPublicIP
