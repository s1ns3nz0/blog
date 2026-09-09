---
title: Adding an Azure Entra App Credential Expiry Check to Prowler
description: How Prowler identifies expired, soon-to-expire, and non-expiring credentials on Microsoft Entra app registrations.
pubDatetime: 2026-09-09T16:15:00+09:00
tags:
  - Azure
  - EntraID
  - Identity
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - CredentialManagement
featured: true
---

Application identities quietly support deployments, integrations, automation, and production services. A client secret or certificate that expires unexpectedly can stop those workflows. A credential left without an expiry date can become a long-lived path into an Azure environment.

[Prowler PR #11038](https://github.com/prowler-cloud/prowler/pull/11038) adds `entra_app_registration_credential_not_expired`, an Azure check that evaluates Microsoft Entra app-registration secrets and certificates for credential-expiry risk.

## Why credential lifecycle matters

Expired credentials commonly signal one of two problems: a still-active application with an imminent authentication outage, or a forgotten application that needs to be retired. Both deserve attention. The first affects availability; the second can leave unnecessary identities and permissions behind.

Credentials without a defined expiry introduce a different risk. They can persist long after the original application owner, use case, or access review has disappeared. Short, planned lifetimes make ownership and rotation part of normal operations.

## What the new check does

The check inspects password secrets and certificate credentials on each Entra app registration. It reports each credential independently.

- It reports `PASS` when a credential remains valid for more than 30 days.
- It reports `FAIL` when a credential has expired, expires within 30 days, or has no expiration date.
- It skips app registrations with no credentials.

The 30-day window gives teams time to rotate credentials before an application fails, while still making the risk visible through routine CSPM reporting.

## Rotate credentials safely

For a client-secret-based application, create and distribute a replacement credential before removing the old one. The Azure CLI can reset an application credential:

```bash
az ad app credential reset \
  --id <app-id> \
  --years 1
```

Update the consuming workload through its secret-management process, verify authentication using the new value, and then remove the old credential. Avoid exposing the generated secret in shell history, logs, source control, or ticket comments.

## Reduce reliance on secrets

Where the application platform supports it, managed identities and federated credentials can replace stored client secrets. These approaches reduce manual secret handling and make the identity lifecycle easier to govern. For remaining secrets and certificates, set a six-to-twelve-month maximum lifetime, assign an owner, and alert well before expiration.

`entra_app_registration_credential_not_expired` gives identity and cloud-security teams one clear view: *which application credentials require rotation, cleanup, or a safer authentication design?*

#Azure #EntraID #Identity #Prowler #Contribution #CSPM #CloudSecurity #Cloud #CredentialManagement
