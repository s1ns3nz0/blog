---
title: Adding a GCP Secret Manager Rotation Check to Prowler
description: How Prowler verifies that Secret Manager secrets have automatic rotation configured within policy and have not missed their next rotation date.
pubDatetime: 2026-09-09T13:15:00+09:00
tags:
  - GCP
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - GoogleCloud
  - SecretManager
  - Rotation
featured: true
---

Storing a credential in Secret Manager is a meaningful improvement over keeping it in source code or a configuration file. But a secret that never changes remains useful to anyone who obtains it. The longer it stays valid, the longer an accidental disclosure or undetected compromise can be exploited.

[Prowler PR #11026](https://github.com/prowler-cloud/prowler/pull/11026) adds `secretmanager_secret_rotation_enabled`, a GCP check that verifies Secret Manager secrets have automatic rotation configured, that the interval meets policy, and that the next scheduled rotation has not been missed.

## Why rotation is a security control

Rotation limits the lifetime of a credential. If an API key, password, or token is exposed, a rotation process can invalidate the old value and reduce the time an attacker can use it.

Rotation does not prevent disclosure, and it cannot replace access control, logging, or incident response. It changes the exposure window from indefinite to bounded. That makes it especially important for long-lived database credentials, third-party API keys, service passwords, and other secrets that cannot yet be replaced with short-lived identity-based authentication.

The correct interval depends on the secret, the system that consumes it, and the organization’s risk policy. This Prowler check uses **90 days** as the default maximum, while exposing `secretmanager_max_rotation_days` as a configurable threshold.

## What the new check does

The check is named `secretmanager_secret_rotation_enabled`. It evaluates the rotation configuration returned for each Secret Manager secret.

- It reports `PASS` when automatic rotation is configured within the allowed maximum period.
- It reports `FAIL` when rotation is missing.
- It reports `FAIL` when the rotation period exceeds the configured limit.
- It reports `FAIL` when the scheduled next rotation is overdue.
- It fails closed when a rotation timestamp cannot be parsed, preventing an invalid value from quietly producing a passing result.

The implementation extends Prowler’s Secret Manager model with `rotation_period` and `next_rotation_time`, parses the GCP rotation data, and handles fractional-second timestamps and sub-day rotation intervals. The tests also cover an interval that exceeds the threshold by a single second, which is a useful guard against rounding errors around a compliance boundary.

## A passing setting is not a successful rotation

Automatic rotation configuration is a policy signal. It indicates that a rotation schedule exists and remains within the expected window. It does not prove that every dependent application has successfully adopted the new secret value.

This distinction matters. A safe rotation workflow usually has several stages:

1. Generate or obtain a new credential.
2. Store it as a new secret version.
3. Roll applications over to the new version.
4. Verify that all consumers work with the replacement.
5. Disable or revoke the old credential.

If applications hard-code a version, cache credentials indefinitely, or cannot tolerate overlapping values during a rollout, enabling rotation can create an availability incident. The configuration check should therefore be paired with an application-level rotation runbook and periodic tests.

## Choosing the right policy

Ninety days is a practical default for many environments, but it is not a universal answer. Higher-risk credentials may need a shorter interval, while credentials with expensive third-party rotation workflows may require a documented exception and compensating controls.

Useful questions include:

- What system does this secret unlock, and what is the impact of exposure?
- Can the consuming workload use workload identity or short-lived tokens instead?
- Does the rotation process support overlap between the old and new values?
- Are rotation failures monitored and escalated before the next scheduled time is missed?
- Is the rotation interval defined by internal policy, contract, or regulation?

## Rotation alongside access control

This check complements [`secretmanager_secret_not_publicly_accessible`](https://github.com/prowler-cloud/prowler/pull/11025). The public-access check asks who can read a secret. The rotation check asks whether a leaked value remains valid indefinitely.

| Question | Prowler check |
| --- | --- |
| Can an overly broad principal read this secret? | `secretmanager_secret_not_publicly_accessible` |
| Is this secret scheduled to rotate within policy? | `secretmanager_secret_rotation_enabled` |

Together, the checks make two core secret-management expectations observable across GCP: limit the audience that can obtain a credential, and limit how long the credential remains valid.

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #SecretManager #Rotation
