---
title: NIST SP 800-204 Series
description: The NIST Special Publication Series for Securing Microservices.
pubDatetime: 2026-07-18T19:35:43+09:00
tags:
  - Microservices
  - NIST
  - NIST SP 800-204
featured: true
---

During the COVID-19 pandemic, Netflix led the migration from monolithic to microservice based applications. Microservices are not answer for every application, but many business continue to choose this architecture for their own applications. Unfortunately, this architecture is more complex and make it difficult for engineers to gain visibility into their applications. These NIST Special Publications outline security best practices for microservices, including DevSecOps practices.


## Table of contents

## NIST SP 800-24 - Security Strategies for Microservices-based Application Systems
### Purpose
A document that analyzes implementation options for core features and configuration options for architectural frameworks like API gateways and service meshes, in order to strengthen the security profile of microservices-based applications. It states its goal as developing security strategies that counter threats specific to microservices.

### Why Microservices need to be treated differently from monoliths
There are far more components, inter-component connections, and communication links to protect than in a monolithic structure; the dynamic lifecycle of microservices (constantly spinning up and disappearing) makes secure service discovery essential; and because the concept of a network perimeter doesn't hold, zero-trust principles must be observed — no microservice is trusted until proven via a secure authentication mechanism. Because microservices are finely-grained, single-function components, each one needs an equally fine-grained authorization mechanism in front of it — yet since the architecture is loosely coupled, security policy must be centrally defined while still being consistently enforced everywhere.

### Core features
authentication and access management, service discovery, secure communication protocols, security monitoring, availability/resiliency techniques (e.g., circuit breakers), load balancing and throttling, integrity assurance when onboarding new services, and handling of session persistence.

## NIST SP 800-24A - Building Secure Microservices-based Applications Using Service-Mesh Architecture
### Purpose
Establishes a reference platform for actually implementing the core features defined in 800-204. It puts forward a concrete combination — Kubernetes as the orchestrator, Istio service mesh as the security kernel — as that reference platform, and its core contribution is detailed deployment guidance (including configuration parameters) for each service mesh component on that platform.

### Why a service mesh is needed
As microservices-based applications increasingly get deployed across large enterprises and cloud environments, a dedicated, scalable infrastructure is needed to support a comprehensive set of security services. The service mesh is defined as the component that bundles together secure service discovery, the definition and enforcement of authentication/authorization policies, network resilience, and performance/security monitoring capabilities into one.

### Core content
Detailed guidance on how to actually deploy and configure each of 800-204's core features (authentication, service discovery, communication security, etc.) on the Kubernetes+Istio reference platform. Includes concrete deployment recommendations for API gateways, service proxies, circuit breakers, and load balancing.

## NIST SP 800-24B - Attribute-based Access Control for Microservices-based Applications Using a Service Mesh
### Purpose
Drills deep into authentication and authorization specifically, building on the reference platform 800-204A established. Provides deployment guidance for building an ABAC (attribute-based access control) authentication/authorization framework within the service mesh.

### Why ABAC is needed
Driven by two core requirements of the microservices environment — (1) implementing zero trust by applying mutual authentication to every pair of service-to-service communications, and (2) building an access control mechanism expressive enough to cover a wide range of policies while still scaling with user base, resources, and deployment size. The underlying problem is that conventional RBAC (role-based access control) alone struggles to handle the granularity and dynamism of microservices.

### Core Conetent
Deployment guidance for building an authentication/authorization framework inside the service mesh, along with reference platforms (one for the application, one for the service mesh) to demonstrate it. Covers concrete mechanisms including JSON Web Tokens, mutual TLS (mTLS), and policy enforcement points (PEPs).

## NIST SP 800-204C - Implementation of DevSecOps for a Microservices-based Application with Service Mesh
### Purpose
Covers how to actually implement DevSecOps practices on top of the architecture 800-204A/204B established (microservices + service mesh + ABAC). Also discusses the benefits of this approach for high security assurance and for enabling continuous authorization to operate (C-ATO).

### Why the shift to DevSecOps is needed
As cloud-native applications evolve into a standardized architecture made of loosely coupled microservices components, a more agile software lifecycle paradigm becomes necessary. DevSecOps is presented as the answer — enabling faster deployment and updates while integrating security throughout the lifecycle.

### Core Content
Divides the entire source code of an application environment into five code types — ① application code, ② application services code (for service-mesh functions like session establishment and network connections), ③ Infrastructure as Code, ④ Policy as Code (expressing runtime policies such as zero trust as declarative code), and ⑤ Observability as Code (continuous monitoring of runtime state). It proposes that a separate CI/CD pipeline can be set up for each of these five code types.

## NIST SP 800-24D - Strategies for the Integration of Software Supply Chain Security in DevSecOps CI/CD Pipelines
### Purpose
Presents integrated strategies for protecting the CI/CD pipelines discussed in 800-204C from software supply chain (SSC) attacks.

### Why supply chain security is needed
Cloud-native applications consist of multiple microservices and are developed under the agile DevSecOps paradigm. A defining feature of that paradigm is the use of CI/CD pipelines as a flow process — and the process of source code moving through build, test, package, and deploy stages is itself what constitutes the software supply chain (SSC). EO 14028 and the NIST SSDF, among other government initiatives, had already laid out a roadmap for SSC security; this document turns that roadmap into actionable measures for integrating it directly into CI/CD pipelines.

### Core Content
Lays out numbered security requirements at each pipeline stage, starting from repository misconfiguration (e.g., "PULL-PUSH_REQ-1: Project maintainers should run automated checks — unit tests, linters, integrity tests, security checks, and more — on all artifacts covered in a pushed change"). As an appendix, it provides a table mapping these requirements to the high-level practices of the NIST SSDF (SP 800-218), explicitly showing which SSDF provisions are satisfied by following this strategy.


## References
- [NIST SP 800-204](https://csrc.nist.gov/pubs/sp/800/204/final): It includes all related links





