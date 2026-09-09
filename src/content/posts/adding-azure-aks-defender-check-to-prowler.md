---
title: Adding an Azure AKS Defender Check to Prowler
description: How Prowler identifies AKS clusters without Microsoft Defender for Containers security monitoring enabled.
pubDatetime: 2026-09-09T13:45:00+09:00
tags:
  - Azure
  - AKS
  - Kubernetes
  - Prowler
  - Contribution
  - CSPM
  - CloudSecurity
  - Cloud
  - MicrosoftDefender
featured: true
---

Kubernetes security is not limited to a secure cluster configuration at deployment time. Container images change, workloads run code from multiple sources, and runtime activity can reveal behavior that static checks cannot see. A production AKS environment needs visibility into those signals.

[Prowler PR #11028](https://github.com/prowler-cloud/prowler/pull/11028) adds `aks_cluster_defender_enabled`, an Azure check that identifies Azure Kubernetes Service clusters without Microsoft Defender for Containers security monitoring enabled.

## What Defender for Containers adds to AKS

Microsoft Defender for Containers extends Defender for Cloud coverage to Kubernetes environments. For AKS, it provides container image vulnerability assessment, runtime threat detection and alerting, and security posture insights for clusters and workloads. It also integrates with Azure-native security tooling and collects AKS control-plane audit signals through managed integration. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-deployment-overview)

This does not replace Kubernetes RBAC, network controls, admission policies, or secure image practices. It gives the security team detection and posture signals that those preventative controls alone cannot provide: suspicious runtime behavior, image vulnerabilities, anomalous Kubernetes API activity, and configuration risks.

Without a monitoring layer, a compromised workload can remain invisible long enough to mine cryptocurrency, access cloud APIs, move laterally, or extract data from the cluster environment.

## What the new check does

The new Prowler check is named `aks_cluster_defender_enabled`. It evaluates the AKS managed-cluster Defender security-monitoring flag:

```text
securityProfile.defender.securityMonitoring.enabled
```

- It reports `PASS` when the value is explicitly `true`.
- It reports `FAIL` when the value is `false`, absent, or invalid.
- It produces one finding per AKS cluster and retains the relevant Azure subscription and location in the report.

The check is intentionally strict. A value that is not the boolean `true` does not count as enabled, which avoids treating an incomplete or malformed API response as a healthy security control.

The PR also builds on the AKS service-layer fields used by the related auto-upgrade, monitoring, and local-account checks. That shared model makes it possible to assess several aspects of cluster posture from one discovery pass.

## Enabling the control

Defender for Containers requires both the relevant Defender for Cloud plan at the subscription level and the AKS cluster security profile. After enabling the Containers plan, the cluster can be updated with the Azure CLI:

```bash
az aks update \
  --resource-group <RESOURCE_GROUP> \
  --name <CLUSTER_NAME> \
  --enable-defender
```

The AKS configuration should route the security-monitoring integration to the appropriate Log Analytics workspace, and the team responsible for the cluster should know where Defender findings are triaged.

## A passing check is the start of operations

A `PASS` means the AKS Defender security-monitoring flag is enabled. It does not prove that the subscription plan is active, all required components are healthy, alerts reach responders, or a team is acting on the findings.

After enabling Defender for Containers, review the full operating model:

- Confirm the Defender for Containers plan is enabled for each subscription containing AKS clusters.
- Verify that monitoring data reaches the intended workspace and retention policy.
- Route high-severity Defender alerts into the incident-response workflow.
- Review image-vulnerability findings and define remediation ownership for base images and application images.
- Test the alert path and escalation process rather than relying only on the portal status.
- Account for the service’s billing model, which depends on enabled components and protected resources. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-deployment-overview)

## Detection works best with prevention

Defender for Containers adds detection and posture management. It should sit alongside preventative AKS controls, including least-privilege Kubernetes and Azure RBAC, hardened workload identities, network policies, secure image supply chains, and regular cluster upgrades.

Prowler's `aks_cluster_defender_enabled` check makes a key visibility question observable at scale: *does every AKS cluster have the intended Microsoft Defender security-monitoring profile enabled?* It helps teams find gaps quickly, then validate that the monitoring service is connected to a real response process.

#Azure #AKS #Kubernetes #Prowler #Contribution #CSPM #CloudSecurity #Cloud #MicrosoftDefender
