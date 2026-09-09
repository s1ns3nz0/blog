---
title: Adding a GCP Cloud Functions Public Access Check to Prowler
description: How Prowler detects Cloud Functions that IAM policies make invokable by anyone on the internet or by any Google-authenticated user.
pubDatetime: 2026-09-09T12:15:00+09:00
tags:
  - GCP
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - GoogleCloud
  - CloudFunction
featured: true
---

Making a Cloud Function publicly invokable is sometimes intentional: a webhook receiver, a public API, or a browser-facing endpoint needs a way to accept requests. But public invocation should be an explicit product decision, not an unnoticed IAM binding.

[Prowler PR #11022](https://github.com/prowler-cloud/prowler/pull/11022) adds `cloudfunction_function_not_publicly_accessible`, a new GCP check that identifies Cloud Functions invokable by `allUsers` or `allAuthenticatedUsers`.

## Why public invocation deserves attention

Cloud Functions use IAM to control invocation. Assigning the invoker role to `allUsers` permits unauthenticated requests from anyone. Assigning it to `allAuthenticatedUsers` is still broad: any user authenticated with a Google account can invoke the function.

For an intentionally public endpoint, this may be the correct configuration. For an internal handler, administrative operation, or backend integration, it exposes business logic beyond its intended boundary. It can also create an avoidable cost and availability risk: an attacker does not need to compromise an account to repeatedly invoke an unauthenticated endpoint.

This is why public access needs context. The problem is not that every public function is insecure; the problem is that every public function should have an owner, a documented reason, and controls appropriate to its exposure.

## What the new check does

The check is named `cloudfunction_function_not_publicly_accessible`. Its behavior is focused on broad IAM principals:

- It discovers Cloud Functions and evaluates only resources in the `ACTIVE` state.
- It retrieves each function's IAM policy.
- It reports `FAIL` when an invoker binding includes `allUsers` or `allAuthenticatedUsers`.
- It reports `PASS` when neither public principal can invoke the function.
- It skips functions that are deploying, failing, or being deleted, because their configuration may be transient.

The implementation handles both generations of Cloud Functions. For Gen 1 functions, it reads the IAM policy from the Cloud Functions API. For Gen 2 functions, which are backed by Cloud Run, it reads the relevant Cloud Run service IAM policy. This distinction matters because a complete CSPM check must follow the authorization boundary that the platform actually enforces.

## Reading a failed finding

A failed finding says that the function is publicly invokable through IAM. It does not say that the function is automatically exploitable. The next question is whether public access is intended.

For a public endpoint, review the surrounding controls:

- Is the endpoint protected by application-level authentication or request-signature validation?
- Are rate limits, quotas, and monitoring in place to limit abusive invocation?
- Does the function validate input before it performs sensitive work?
- Is the function limited to the minimum permissions and network access it needs?

For a non-public endpoint, remove the broad invoker bindings and grant invocation only to the service accounts, users, or groups that need it.

```bash
gcloud functions remove-iam-policy-binding FUNCTION_NAME \
  --region=REGION \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker"

gcloud functions remove-iam-policy-binding FUNCTION_NAME \
  --region=REGION \
  --member="allAuthenticatedUsers" \
  --role="roles/cloudfunctions.invoker"
```

After removing a public binding, add the narrow principal that should invoke the function. For service-to-service calls, that will often be a dedicated service account rather than a human user account.

## A useful companion check

This check complements `cloudfunction_function_inside_vpc`, introduced in [PR #11021](https://github.com/prowler-cloud/prowler/pull/11021). The VPC check asks whether a function that needs private resources has a private network path. The public-access check asks who can trigger the function in the first place.

Together, they cover two different boundaries:

| Question | Prowler check |
| --- | --- |
| Who can invoke this function? | `cloudfunction_function_not_publicly_accessible` |
| Can this function reach private resources through a VPC connector? | `cloudfunction_function_inside_vpc` |

Neither check replaces application authorization, input validation, or least-privilege IAM. They make two high-value configuration questions visible across a GCP estate, where manually reviewing every function and IAM policy does not scale.

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #CloudFunction
