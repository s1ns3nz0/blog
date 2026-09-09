---
title: Adding an Azure Subnet NSG Check to Prowler
description: How Prowler detects Azure virtual-network subnets that lack Network Security Group protection.
pubDatetime: 2026-09-09T17:10:00+09:00
tags:
  - Azure
  - NetworkSecurity
  - NSG
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
featured: true
---

Subnets create a natural boundary for workload segmentation. Without an associated Network Security Group (NSG), that boundary has no subnet-level filtering to enforce the intended traffic model when other controls fail or change.

[Prowler PR #11043](https://github.com/prowler-cloud/prowler/pull/11043) adds `network_subnet_nsg_associated`, which identifies applicable Azure virtual-network subnets without an NSG.

## Why NSG association matters

NSGs control inbound and outbound traffic with rules that apply consistently at a subnet boundary. They are a defense-in-depth control for separating application tiers, restricting administrative access, and limiting unexpected network paths.

An NSG does not replace private endpoints, application authentication, or host-level protections. It provides a policy layer that can be reviewed as the network evolves.

## What the new check does

Prowler evaluates each subnet discovered in an Azure virtual network.

- It reports `PASS` when an NSG is associated with the subnet.
- It reports `FAIL` when a relevant subnet has no NSG.
- It excludes Azure-managed subnets, including common gateway, Firewall, and Bastion subnets, because their platform requirements differ from application subnets.

## Apply a usable traffic baseline

Associate each application subnet with an NSG and define only the inbound and outbound paths the workload needs. Review service tags, private endpoints, and dependencies before enforcing deny rules; an overly broad rule is not a useful boundary, while an overly restrictive one can break essential services.

## Review the whole network path

Review effective security rules, route tables, peering, and firewall policies together. A subnet's posture depends on the combination of these controls, while Prowler makes the absence of the NSG baseline visible.

`network_subnet_nsg_associated` turns a segmentation question into repeatable evidence: *does every applicable subnet have a traffic-policy boundary?*

#Azure #NetworkSecurity #NSG #Prowler #Contribution #CSPM #CloudSecurity #Cloud
