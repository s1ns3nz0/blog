---
title: Adding an Azure Entra Recent Sign-In Check to Prowler
description: How Prowler identifies enabled Microsoft Entra accounts that have not signed in within 90 days.
pubDatetime: 2026-09-09T16:45:00+09:00
tags:
  - Azure
  - EntraID
  - Identity
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - AccessReview
featured: true
---

Dormant accounts are easy to overlook. They can retain group memberships, role assignments, and application access long after a person changes teams, leaves the organization, or stops using a service. Because owners are less likely to notice activity on an unused account, attackers often target these identities with password spraying and credential stuffing.

[Prowler PR #11040](https://github.com/prowler-cloud/prowler/pull/11040) adds `entra_user_with_recent_sign_in`, an Azure check that identifies enabled Entra users without a recent successful sign-in.

## What counts as a stale account

The check uses a 90-day threshold for the user's last interactive sign-in.

- It reports `PASS` when an enabled user has signed in within the last 90 days.
- It reports `FAIL` when the user's last sign-in is older than 90 days or the user has never signed in.
- It ignores accounts that are already disabled.

If sign-in activity is unavailable for every enabled user in a tenant, Prowler produces one tenant-level failure rather than incorrectly producing a failure for every user. That outcome can indicate missing Microsoft Entra ID P1/P2 licensing or the required Microsoft Graph access to read sign-in activity.

## Review before disabling

An old sign-in is a review signal, not automatic proof that an identity should be removed. Some accounts support infrequent business processes, emergency access, or automation patterns that must be documented and governed differently.

For each finding, confirm the account owner, business purpose, role assignments, group memberships, and linked applications. Disable accounts confirmed as unnecessary, maintain a grace period for recovery where policy allows, and then delete them according to the organization's retention rules.

An account can be disabled through Microsoft Graph with the Azure CLI:

```bash
az rest \
  --method patch \
  --url https://graph.microsoft.com/v1.0/users/<user-id> \
  --body '{"accountEnabled":false}'
```

## Make reviews routine

Recurring Entra access reviews turn one-time cleanup into an operating control. Run them at least quarterly for broad user populations or sensitive groups, assign clear reviewers, and automate the application of decisions where appropriate. Combine the review with lifecycle provisioning and deprovisioning so account status reflects employment and role changes promptly.

`entra_user_with_recent_sign_in` makes the cleanup queue visible across a tenant: *which enabled accounts have not shown recent evidence of use?*

#Azure #EntraID #Identity #Prowler #Contribution #CSPM #CloudSecurity #Cloud #AccessReview
