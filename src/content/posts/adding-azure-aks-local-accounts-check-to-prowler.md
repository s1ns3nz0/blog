---
title: Adding an Azure AKS Local Accounts Check to Prowler
description: How Prowler identifies AKS clusters that still allow local Kubernetes accounts to bypass Microsoft Entra ID authentication.
pubDatetime: 2026-09-09T14:15:00+09:00
tags:
  - Azure
  - AKS
  - Kubernetes
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - EntraID
  - Identity
featured: true
---

An AKS cluster can enforce Microsoft Entra ID authentication and Azure RBAC while still retaining a second access path: local Kubernetes accounts. Those accounts provide static credentials that do not pass through the organization’s identity provider controls.

[Prowler PR #11030](https://github.com/prowler-cloud/prowler/pull/11030) adds `aks_cluster_local_accounts_disabled`, an Azure check that identifies Azure Kubernetes Service clusters where local accounts remain enabled.

## Why local accounts weaken identity governance

Local AKS accounts can provide credentials such as a cluster-admin certificate. They are useful during early setup, but they bypass the centralized controls that organizations rely on for administrator access:

- Microsoft Entra ID authentication
- Multi-factor authentication
- Conditional Access policies
- Identity lifecycle management
- Individual, identity-based audit trails

If a static local credential is copied, leaked, or retained after an administrator changes roles, it can continue to grant cluster access outside the normal identity governance process. Disabling local accounts forces administrators and workloads to authenticate through Microsoft Entra ID instead.

## What the new check does

The Prowler check is named `aks_cluster_local_accounts_disabled`. It evaluates the AKS managed-cluster setting:

```text
disableLocalAccounts
```

- It reports `PASS` when local accounts are disabled.
- It reports `FAIL` when local accounts are enabled or the setting is absent.
- It creates one finding per AKS cluster and preserves the relevant subscription and location in the result.

The rule is marked **high** severity because local credentials can offer persistent privileged access without the MFA, Conditional Access, and centralized audit controls applied to Entra ID identities.

## Prepare access before disabling local accounts

Disabling local accounts is a security improvement, but it is an access-model change. Teams should complete the Entra ID and Azure RBAC design before applying it.

At a minimum, confirm that:

- Microsoft Entra ID authentication is configured for the cluster.
- Administrators have the required Azure RBAC or Kubernetes RBAC roles.
- Break-glass access uses a controlled, audited Entra ID process rather than a copied local kubeconfig.
- CI/CD systems use workload identity or a dedicated Entra-backed service principal with only the required permissions.
- Existing automation has been tested with the new authentication path.

This preparation prevents the common failure mode where an organization removes the old credentials before validating the new ones, leaving operators unable to administer the cluster during an incident.

## Enabling the setting

For an existing AKS cluster, disable local accounts with the Azure CLI:

```bash
az aks update \
  --resource-group <RESOURCE_GROUP> \
  --name <CLUSTER_NAME> \
  --disable-local-accounts
```

For infrastructure as code, set the equivalent property explicitly:

```hcl
resource "azurerm_kubernetes_cluster" "example" {
  name                  = "example-aks"
  location              = "eastus"
  resource_group_name   = "example-rg"
  dns_prefix            = "example"
  local_account_disabled = true

  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
  }
}
```

Afterward, validate that standard administrative actions, incident-response access, and automated deployments still work through their intended Entra ID identities.

## Pair this with other AKS controls

Disabling local accounts narrows the authentication boundary, but it is one part of a broader cluster-security program. It works well with:

- Azure RBAC scoped to least privilege.
- Workload identity instead of long-lived client secrets.
- AKS automatic upgrades to reduce Kubernetes version drift.
- Azure Monitor metrics for operational visibility.
- Microsoft Defender for Containers for runtime detection and posture insights.

`aks_cluster_local_accounts_disabled` makes a clear identity question observable across Azure subscriptions: *can this AKS cluster still be accessed through static local credentials that bypass Entra ID controls?* It helps teams find and retire that legacy path in a controlled way.

#Azure #AKS #Kubernetes #Prowler #Contribution #CSPM #CloudSecurity #Cloud #EntraID #Identity
