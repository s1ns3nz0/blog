---
title: "Security Design Review: AWS EKS SaaS (1) - Service Analysis"
description: Building a confirmed service profile for AWS's EKS SaaS reference architecture, where namespace-per-tenant isolation and a shared control plane change what counts as a boundary.
pubDatetime: 2026-08-20T10:50:00+09:00
tags:
  - Security Design
  - Security Requirements
  - AWS
  - Plugin
  - Kubernetes
featured: true
---

Security requirements should begin with an understanding of the service, not with a Kubernetes checklist. For this review, the target is AWS's [`aws-saas-factory-eks-reference-architecture`](https://github.com/aws-samples/aws-saas-factory-eks-reference-architecture), a sample multi-tenant SaaS environment built around Amazon EKS.

The repository is explicitly a reference implementation for learning EKS SaaS design patterns rather than a turnkey production deployment. That makes its assumptions especially important. The plugin treats the sample as architecture evidence and records the operating decisions that the repository cannot establish by itself.

The question for this first stage is:

> What service is being provided, who can use it, how are tenants separated, which data crosses the boundaries, and which components can affect the whole platform?

The answers become the service profile used by later stages for CIA impact, control selection, threat modeling, and blast-radius analysis.

## Table of contents

## The repository describes three connected applications

The sample has a public landing page, a tenant-facing commerce application, and a provider administration application. These applications do not have the same trust level or authority.

The landing page represents a public sign-up flow. A prospective customer submits tenant information, and the registration service begins onboarding. The tenant-facing application provides basic product and order functionality. The administration application is used by the SaaS provider to manage tenants and platform settings.

The architecture therefore contains two distinct planes:

```text
Shared control plane
  Registration, tenant management, user management,
  provider administration, and tenant provisioning

Tenant application plane
  Product and order microservices deployed into
  tenant-specific Kubernetes namespaces
```

This separation matters because a compromise of a tenant product service should not have the same expected reach as a compromise of the registration or tenant-management service. The latter can create identities, namespaces, routes, and data stores for other tenants.

## The high-level request and provisioning flow

The service can be summarized as two related flows.

```text
Public landing page
        ↓
Registration service
        ↓
Tenant management + user management
        ↓
Cognito resources, namespace, ingress, and microservices
        ↓
Tenant subdomain → CloudFront → NGINX Ingress → tenant namespace
```

The tenant application authenticates users through a tenant-specific Amazon Cognito user pool. The client first obtains tenant authentication configuration from the shared service, then completes the OAuth/OIDC flow and uses the resulting token when calling the product and order microservices.

The provisioning path is equally important. AWS CodePipeline and CodeBuild run the deployment process, use Kubernetes commands to create tenant resources, fetch images from Amazon ECR, and apply tenant-specific manifests. This means that the delivery pipeline is part of the service's security boundary, not merely an engineering convenience.

## What runs in the EKS cluster?

The baseline infrastructure creates an EKS cluster inside a VPC with subnets and NAT gateways. The same cluster hosts shared services and tenant environments in the sample design.

The cluster also contains an NGINX Ingress controller and External DNS. CloudFront distributions and Route 53 records provide the public entry points, while the ingress layer routes tenant paths to the corresponding namespace.

Shared microservices include registration, tenant management, and user management. Per-tenant environments contain product and order microservices. The sample uses a namespace-per-tenant model, so a new tenant causes a new namespace and a new set of application resources to be deployed into the shared cluster.

The important security observation is that a namespace is a logical boundary, not a complete isolation guarantee. The repository itself notes that namespaces do not provide network boundaries by default. Network policies, service-account permissions, admission controls, node configuration, and cloud IAM must all support the intended separation.

## Tenant isolation is implemented at several layers

The sample illustrates more than one isolation mechanism. Each tenant receives a namespace, and an IAM role for service accounts is associated with the tenant workload. Network policies can restrict communication between namespaces and reduce access to node addresses.

Data isolation also differs by microservice. The order service uses a silo model with a separate DynamoDB table per tenant. The product service uses a pooled table, where a tenant identifier is part of the partition key and IAM conditions restrict access to that tenant's items.

This makes the service profile more precise than "the application is multi-tenant." The order path depends on table-level separation and role scope. The product path depends on correct tenant-key propagation and policy conditions. A bug in either path has a different blast radius and needs a different verification strategy.

## Who uses the service?

The service profile distinguishes four actor categories.

```text
prospective_tenant
  Anonymous visitor using the landing and sign-up flow

tenant_user
  Authenticated user operating the commerce application

tenant_administrator
  User managing application users or tenant-level settings

provider_operator
  SaaS provider administrator managing tenants and platform resources
```

There are also non-human actors: the registration service, tenant-management service, CodePipeline, CodeBuild, Kubernetes service accounts, and AWS IAM roles. These identities can create or modify resources and therefore need to be modeled as actors rather than hidden implementation details.

The provider administration application uses a separate Cognito user pool from tenant applications. That is a meaningful boundary, but it does not by itself prove that a tenant user cannot invoke provider operations. The authorization relationship between identity, operation, tenant, and resource must remain an explicit review question.

## What data does the service handle?

The repository and operating scenario indicate several data classes. Registration and tenant management handle tenant names, plans, contact information, user attributes, and authentication configuration such as user-pool and application identifiers.

The commerce application handles product records and orders. Product data is stored in a pooled DynamoDB table, while order data is stored in tenant-specific tables. Logs, audit events, deployment metadata, container images, and backups are also part of the service even when they are not displayed in the sample UI.

The profile therefore records both tenant-owned business data and platform metadata. A tenant mapping that connects a subdomain to a user pool and namespace may not look like a business record, but changing it can redirect authentication or traffic across the platform.

## Which boundaries require confirmation?

The sample gives strong evidence for the technical architecture, but it does not establish the business commitments of a real service. The service owner must confirm the expected RTO and RPO, whether onboarding is open to the public, which regions and customers are in scope, and whether the sample's provider administration model matches the intended production process.

The owner must also confirm whether the shared cluster is an intentional production boundary or only a teaching simplification. A production service may place shared services in a separate cluster, use stronger network controls, or choose a different tenant-isolation tier.

The plugin records these as explicit decisions. It does not treat the presence of a Kubernetes object or an AWS service as evidence of an availability promise, regulatory obligation, or acceptable tenant risk.

## Initial responsibility split

AWS operates the managed EKS control plane and underlying managed services. The organization and platform team still own cluster configuration, node and add-on choices, Kubernetes RBAC, service accounts, network policies, IAM mappings, container images, and deployment permissions.

The product team owns application authorization, tenant-context handling, input validation, data access logic, and the correctness of the pooled DynamoDB condition. The platform or operations team owns the shared ingress, DNS, cluster policy, logging, and recovery mechanisms.

This split is recorded before control selection. "EKS provides the control plane" is not enough to decide who must configure API access, admission, audit logging, or tenant workload permissions.

## The initial service profile

The first-stage profile for this sample can be summarized as follows:

```yaml
service: aws-eks-saas-reference-architecture
deployment_model: kubernetes
cloud_provider: aws
platform: amazon-eks
tenant_model: namespace_per_tenant
shared_cluster: true
entrypoints:
  - public_landing_page
  - tenant_subdomain
  - provider_admin_application
shared_services:
  - registration
  - tenant_management
  - user_management
tenant_services:
  - product
  - order
identity:
  - provider_cognito_user_pool
  - tenant_cognito_user_pool
data_partitioning:
  order: silo_per_tenant
  product: pooled_with_tenant_key
```

This profile does not claim that the sample is production-ready or that its isolation controls are sufficient. It establishes the service shape and the relationships that the next stages must evaluate.

## What this stage contributes

The service analysis identifies the parts of the EKS SaaS design that can create cross-tenant impact: shared services, namespace and ingress configuration, tenant mappings, IAM roles for service accounts, pooled data access, and the CodePipeline/CodeBuild onboarding path.

The next stage will use this profile to calculate confidentiality, integrity, and availability impact. The result will select a control baseline and application-security level while keeping the Kubernetes and AWS-specific assumptions visible for later threat and blast-radius analysis.
