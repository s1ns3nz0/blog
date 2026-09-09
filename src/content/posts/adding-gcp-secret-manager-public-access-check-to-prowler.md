---
title: Adding a GCP Secret Manager Public Access Check to Prowler
description: How Prowler identifies Secret Manager secrets whose IAM policies grant access to everyone or to every Google-authenticated user.
pubDatetime: 2026-09-09T13:00:00+09:00
tags:
  - GCP
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - GoogleCloud
  - SecretManager
featured: true
---

Secrets are meant to narrow access to credentials, API keys, certificates, and connection strings. A single broad IAM binding can reverse that design: the secret remains in Secret Manager, but the audience allowed to read it becomes effectively public.

[Prowler PR #11025](https://github.com/prowler-cloud/prowler/pull/11025) adds `secretmanager_secret_not_publicly_accessible`, a GCP check that detects Secret Manager secrets whose IAM policies grant access to `allUsers` or `allAuthenticatedUsers`.

## Why public access to a secret is critical

The `allUsers` principal includes anyone on the internet, including unauthenticated callers. `allAuthenticatedUsers` is narrower, but still includes any identity authenticated with a Google account. Neither principal is an appropriate default reader for a secret.

If a secret stores a database password, third-party API token, signing certificate, or cloud credential, public access can turn a configuration mistake into a broader compromise. The exposed value may allow an attacker to access another system directly, impersonate a service, create costs, or move laterally through the environment.

The remedy is not merely to move secrets into a managed service. Secret Manager protects storage and provides auditing, versioning, and IAM integration, but its value depends on assigning access only to the workloads and people that require it.

## What the new check does

The Prowler check is named `secretmanager_secret_not_publicly_accessible`. It performs a focused IAM review:

- It enumerates Secret Manager secrets across the configured GCP projects.
- It retrieves the IAM policy for each secret.
- It reports `FAIL` when a binding includes `allUsers` or `allAuthenticatedUsers`.
- It reports `PASS` when no public principal appears in the secret-level IAM policy.

The PR also introduces a reusable Secret Manager service layer in Prowler. The service uses the Secret Manager v1 API, models the discovered secrets, evaluates IAM policies in parallel, and exposes the result to this and future Secret Manager checks.

The check is marked **critical** because the sensitive value protected by a secret is often a direct credential to another system.

## Understand the scope of the finding

This check evaluates IAM policies attached directly to each secret. That scope is useful because it finds explicit public bindings at the resource level, but it has an important limit: it does not evaluate inherited project-level IAM permissions.

A `PASS` therefore means “no public principal was found in this secret's own IAM policy.” It does not prove that no broader identity can access the secret through a project-level role or another authorization path. Security teams should combine the result with periodic reviews of project IAM, service accounts, and organization policies.

## Remediating a failed secret

For a failed finding, remove the public binding and replace it with the smallest set of named principals that need access. For example:

```bash
gcloud secrets remove-iam-policy-binding SECRET_NAME \
  --member="allUsers" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets remove-iam-policy-binding SECRET_NAME \
  --member="allAuthenticatedUsers" \
  --role="roles/secretmanager.secretAccessor"
```

Then grant `roles/secretmanager.secretAccessor` only to the specific service accounts, groups, or users that need to read the secret. For an application workload, a dedicated service account is generally easier to audit and revoke than a shared human identity.

Any secret that may have been exposed should be treated as compromised. Removing IAM access stops future reads, but it does not undo a value that may already have been retrieved. Rotate the secret, update dependent services, and review audit logs for unexpected access.

## Controls that belong beside this check

Public-access detection is a strong baseline, but secret management needs several layers of protection:

- Use distinct service accounts for distinct workloads and grant the accessor role only where needed.
- Prefer short-lived credentials or workload identity where a static secret is unnecessary.
- Enable and review audit logs for secret access and IAM policy changes.
- Rotate sensitive values regularly and immediately after suspected exposure.
- Use organization policies to prevent public IAM members where the organization does not allow them.
- Review project-level IAM because the check intentionally focuses on secret-level policies.

`secretmanager_secret_not_publicly_accessible` turns a high-impact question into a repeatable CSPM control: *can an unknown internet user or any Google-authenticated user read this secret?* Finding and removing those bindings early helps prevent one accidental IAM grant from becoming a credential-exposure incident.

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #SecretManager
