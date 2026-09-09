---
title: Adding an Azure VNet DDoS Protection Check to Prowler
description: How Prowler verifies that Azure virtual networks use DDoS Network Protection.
pubDatetime: 2026-09-09T17:15:00+09:00
tags:
  - Azure
  - NetworkSecurity
  - DDoS
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
featured: true
---

Internet-facing workloads can be overwhelmed before application-level protections have a chance to respond. Network-level DDoS mitigation is part of keeping public services reachable during volumetric and protocol attacks.

[Prowler PR #11044](https://github.com/prowler-cloud/prowler/pull/11044) adds `network_vnet_ddos_protection_enabled`, which verifies whether DDoS Network Protection is enabled on each Azure virtual network.

## Why VNet DDoS protection matters

Public IP resources attached to a VNet can be targeted by attacks intended to exhaust network capacity or service resources. Azure DDoS Network Protection adds managed mitigation for protected resources and gives teams a network-layer control to include in resilience planning.

It does not replace a web application firewall, rate limiting, or application capacity design. Each control addresses a different part of an internet-exposure strategy.

## What the new check does

The check evaluates the DDoS protection configuration for each virtual network.

- It reports `PASS` when DDoS Network Protection is enabled.
- It reports `FAIL` when the VNet does not have the protection enabled.
- It creates a per-VNet result so teams can apply different policies to public and internal network boundaries.

## Decide where protection is required

Identify VNets that host public entry points or critical services with public IP exposure. Enable protection there, assign ownership for alerts and incident response, and document why private-only VNets do not require the control.

Create a DDoS protection plan and associate it with the VNet through the Azure CLI:

```bash
az network ddos-protection create \
  --resource-group <resource-group> \
  --name <plan-name>

az network vnet update \
  --resource-group <resource-group> \
  --name <vnet-name> \
  --ddos-protection-plan <plan-id>
```

Terraform can declare the association as part of the virtual-network definition:

```hcl
resource "azurerm_virtual_network" "example" {
  name                = "example-vnet"
  location            = "eastus"
  resource_group_name = "example-rg"
  address_space       = ["10.0.0.0/16"]

  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.example.id
    enable = true
  }
}
```

## Test the incident response path

Confirm monitoring signals, alert routing, escalation contacts, edge controls, and application rate-limiting behavior. Review the DDoS runbook during exercises so teams know how to distinguish an attack from an ordinary traffic spike.

`network_vnet_ddos_protection_enabled` makes network resilience visible: *does this VNet have Azure's managed DDoS mitigation in place?*

#Azure #NetworkSecurity #DDoS #Prowler #Contribution #CSPM #CloudSecurity #Cloud
