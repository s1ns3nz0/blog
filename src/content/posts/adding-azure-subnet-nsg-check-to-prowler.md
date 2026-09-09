---
title: Adding an Azure Subnet NSG Check to Prowler
description: How Prowler detects Azure virtual-network subnets that lack Network Security Group protection.
pubDatetime: 2026-09-09T17:10:00+09:00
tags: [Azure, NetworkSecurity, NSG, Prowler, Contribution, CSPM, CloudSecurity, Cloud]
featured: true
---

Subnets provide a natural boundary for workload segmentation. Without a Network Security Group (NSG), that boundary has no subnet-level traffic filtering to enforce the intended design. [Prowler PR #11043](https://github.com/prowler-cloud/prowler/pull/11043) adds `network_subnet_nsg_associated` to identify those gaps.

## What the check evaluates

Prowler reports `PASS` when a subnet has an NSG association and `FAIL` when it does not. Azure-managed subnets, including common gateway, Firewall, and Bastion subnets, are excluded because their platform requirements differ from application subnets.

## Apply a baseline deliberately

Associate each application subnet with an NSG that permits only required inbound and outbound paths. Review service tags, private endpoints, and dependencies before enforcing deny rules; a broad NSG can create a false sense of isolation, while an overly restrictive one can break essential services.

`network_subnet_nsg_associated` turns a foundational segmentation check into repeatable CSPM evidence: *does every applicable subnet have a policy boundary?*

#Azure #NetworkSecurity #NSG #Prowler #Contribution #CSPM #CloudSecurity #Cloud
