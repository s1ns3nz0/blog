---
title: Adding an Azure VNet DDoS Protection Check to Prowler
description: How Prowler verifies that Azure virtual networks use DDoS Network Protection.
pubDatetime: 2026-09-09T17:15:00+09:00
tags: [Azure, NetworkSecurity, DDoS, Prowler, Contribution, CSPM, CloudSecurity, Cloud]
featured: true
---

Internet-facing workloads can be overwhelmed before application-level protections have a chance to respond. [Prowler PR #11044](https://github.com/prowler-cloud/prowler/pull/11044) adds `network_vnet_ddos_protection_enabled`, which checks whether Azure DDoS Network Protection is enabled on each virtual network.

## What the check evaluates

The check reports `PASS` for VNets with DDoS protection enabled and `FAIL` otherwise. It provides a direct inventory of networks that do not have the service's volumetric and protocol attack mitigation available.

## Use it in a layered defense

Enable DDoS Network Protection on VNets that host exposed, business-critical services, then pair it with edge controls, application rate limiting, observability, and an incident runbook. Confirm that service ownership, cost allocation, alert routing, and the network architecture reflect where public exposure actually exists.

`network_vnet_ddos_protection_enabled` makes network resilience visible: *does this VNet have Azure's managed DDoS mitigation in place?*

#Azure #NetworkSecurity #DDoS #Prowler #Contribution #CSPM #CloudSecurity #Cloud
