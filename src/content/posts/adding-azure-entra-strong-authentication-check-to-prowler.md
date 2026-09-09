---
title: Adding an Azure Entra Strong Authentication Check to Prowler
description: How Prowler verifies that Microsoft Entra tenants enable strong authentication methods and MFA registration enforcement.
pubDatetime: 2026-09-09T16:30:00+09:00
tags:
  - Azure
  - EntraID
  - Identity
  - MFA
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
featured: true
---

Passwords alone cannot protect cloud identities from phishing, credential stuffing, and brute-force attacks. An Entra tenant needs strong authentication methods, but making those methods available is only part of the job. Users also need a prompt and a path to register them.

[Prowler PR #11039](https://github.com/prowler-cloud/prowler/pull/11039) adds `entra_authentication_methods_policy_strong_auth_enforced`, a tenant-level check for strong authentication policy and MFA registration enforcement.

## The two conditions for enforcement

The new check considers strong authentication enforced only when two conditions are met:

1. The MFA registration campaign is enabled, so users are prompted to enroll.
2. At least one strong method is enabled: Microsoft Authenticator, FIDO2 security keys, or X.509 certificates.

This distinction matters. A tenant can enable FIDO2 or Microsoft Authenticator but still leave adoption entirely to users. Conversely, a registration campaign without any enabled strong method gives users nowhere meaningful to enroll.

## What the new check does

Prowler evaluates the Entra authentication-methods policy once for each tenant.

- It reports `PASS` when the registration campaign is enabled and at least one strong method is enabled.
- It reports `FAIL` when either condition is missing.
- The finding explains whether the gap is the registration campaign, the available methods, or both.

The check focuses on proving the presence of strong methods and enrollment enforcement. Teams can separately plan the migration away from weaker factors such as SMS and voice, considering user populations and recovery requirements.

## Configure the policy

In the Microsoft Entra admin center, open **Protection** → **Authentication methods** → **Policies** and enable Microsoft Authenticator, FIDO2 security keys, or certificate-based authentication for the appropriate users and groups. Then open **Registration campaign**, set its state to enabled, and define the included audience.

Start with a pilot group, communicate the enrollment process, and monitor sign-in and registration outcomes. Use Conditional Access to require MFA and set policies that reflect the assurance level needed by administrators, privileged users, and sensitive applications.

## Prefer phishing-resistant methods where possible

Microsoft Authenticator is stronger than a password-only flow, while FIDO2 and certificate-based methods can provide phishing-resistant authentication. A mature rollout usually guides users toward the strongest practical option, maintains a controlled recovery process, and retires weak methods only after migration is complete.

`entra_authentication_methods_policy_strong_auth_enforced` makes a foundational identity question auditable: *are users being driven to enroll in at least one strong authentication method?*

#Azure #EntraID #Identity #MFA #Prowler #Contribution #CSPM #CloudSecurity #Cloud
