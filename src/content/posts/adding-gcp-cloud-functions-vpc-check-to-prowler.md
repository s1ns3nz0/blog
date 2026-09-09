---
title: Adding a GCP Cloud Functions VPC Check to Prowler
description: How Prowler's new Cloud Functions VPC connector check helps find missing private-network boundaries in GCP serverless workloads.
pubDatetime: 2026-09-09T12:00:00+09:00
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

Serverless functions reduce operational overhead, but they do not automatically create secure network boundaries. When a Cloud Function needs to reach internal resources such as Cloud SQL, Memorystore, or GKE, teams can end up exposing those resources through public IPs.

[Prowler PR #11021](https://github.com/prowler-cloud/prowler/pull/11021) adds a new check to help surface this risk: `cloudfunction_function_inside_vpc`. It verifies that active GCP Cloud Functions are connected to a **Serverless VPC Access connector**.

## Why a VPC connector matters

A Serverless VPC Access connector lets serverless workloads reach resources in a VPC through internal IP addresses and DNS. Requests sent through the connector, and their responses, remain off the public internet. Google Cloud describes this as a way to reach internal resources with stronger network isolation and potentially lower latency. [Google Cloud documentation](https://cloud.google.com/vpc/docs/serverless-vpc-access)

Consider an order-processing function that needs Redis in Memorystore or a database on a private IP. Without a connector, the team may be pushed toward public endpoints, firewall exceptions, and additional authentication controls. With a connector, the function can use a private network path, while VPC firewall rules constrain which destinations it can reach.

## What the new check does

The new Prowler check is named `cloudfunction_function_inside_vpc`. Its behavior is deliberately focused:

- It discovers Cloud Functions using the Cloud Functions v2 API.
- It evaluates only functions in the `ACTIVE` state.
- It reports `PASS` when `serviceConfig.vpcConnector` is present.
- It reports `FAIL` when the connector is missing or empty.
- It skips functions that are deploying, failing, or being deleted, since their network configuration may be transient.

The PR also introduces a reusable Cloud Functions v2 service layer for Prowler. This provides a common foundation for future Cloud Functions security checks, rather than adding a one-off implementation for a single rule.

## Interpreting a failed result

A `FAIL` means that a function has no attached VPC connector. That is not automatically a vulnerability: a public-facing function that never accesses private infrastructure may not require one.

However, the result deserves attention when the function connects to internal databases, private services, or on-premises systems. In those cases, a missing connector often signals that network segmentation has been bypassed or that internal services may need to be exposed publicly.

There is an important boundary to this check: it validates only that a connector is attached. It does not validate the connector configuration or the egress routing mode. Google Cloud notes that traffic to external IP addresses can still travel over the internet depending on the selected egress setting. [Google Cloud documentation](https://cloud.google.com/vpc/docs/serverless-vpc-access)

For environments that need to control all outbound traffic, attaching a connector should be paired with an `ALL_TRAFFIC` egress configuration.

```hcl
resource "google_cloudfunctions2_function" "example" {
  name     = "example"
  location = "us-central1"

  service_config {
    vpc_connector                 = "projects/PROJECT_ID/locations/us-central1/connectors/app-connector"
    vpc_connector_egress_settings = "ALL_TRAFFIC"
  }
}
```

The equivalent deployment command is:

```bash
gcloud functions deploy FUNCTION_NAME \
  --region=REGION \
  --vpc-connector=projects/PROJECT_ID/locations/REGION/connectors/CONNECTOR_NAME \
  --egress-settings=all-traffic
```

## What to review after the check passes

A connector is a useful baseline, but it is only one part of the design. Teams should also review:

- Whether the connector and function are deployed in the same region.
- Whether the connector subnet or CIDR range overlaps with existing network ranges.
- Whether firewall rules limit connector access to only required internal services.
- Whether the egress configuration matches the organization's security requirements.
- Whether connector capacity can handle the function's expected traffic.

This new Prowler check automates a simple but valuable question: *is this Cloud Function connected to the private network boundary it depends on?* From there, teams can continue with a deeper review of egress routing, firewall rules, and least-privilege network access.

#GCP #Prowler #Contribution #CSPM #CloudSecurity #Cloud #GoogleCloud #CloudFunction
