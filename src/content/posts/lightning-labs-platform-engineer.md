---
title: "Application notes: Platform Engineer at Lightning Labs"
description: A cover letter for the Platform Engineer (Remote) role at Lightning Labs, and the details of the Lightning nodes I run.
pubDatetime: 2026-09-30T22:00:00+09:00
unlisted: true
tags: []
---

*These are my notes for the Platform Engineer (Remote) role at Lightning Labs: a cover letter, and the details of the Lightning nodes I run.*

## Cover letter

Dear Lightning Labs team,

I am applying for the Platform Engineer role, and I want to say one thing up front: I have not held a paid production on-call role for Kubernetes. My career so far is security consulting at IBM and Deloitte, and network operations as an Army signal officer.

To make up for that, I [ran LND as a stateful workload](/posts/running-an-lnd-lightning-node-on-local-kubernetes/) and tested the claims I was making about it. After replacing the pod and after a helm upgrade, I compared node pubkey, channel points, PVC identity and SCB hashes against the values from before. Then I injected faults into an L402 payment path. My alert took 16 min 22 s to fire, so I [rebuilt the alerting](/posts/diagnosing-opencti-with-kagent-google-sre-review/) until the same fault paged in 5 min 14 s.

The lab has limits, and I wrote them down. It is single-node, so it is not highly available. It does not enforce non-root yet, and the PVC is still ReadWriteOnce. Those notes are public [on this blog](/tags/lnd/).

My operating experience comes from the Army. I led a 25-person platoon accountable for network availability, and I designed and tested its failover and recovery procedures. I stood duty officer rotations as a platoon leader and again as a corps CERT officer. During one night shift at a coastal defense unit, I spotted a suspicious person, reported it, and worked the response with higher headquarters. When others had the duty, I backed up the command post as part of the initial-response element.

I still need time on a team that runs this in production. That is the main reason I am applying.

I am based in Seoul and can work US hours.

Jinsoo Yang

## The Lightning nodes I run

I run LND on testnet and regtest. I do not run a mainnet node yet.

- Two testnet nodes, running for about two weeks. One is on a MacBook Pro (M4 Pro, 48 GB RAM, 512 GB) in K3s inside a Lima VM. The other is on a Windows PC (64 GB RAM, 1 TB) in K3s inside WSL 2.
- Both use [the same Helm chart](/posts/running-an-lnd-lightning-node-on-local-kubernetes/): a single-replica StatefulSet, a PVC for wallet and channel state, the Neutrino backend, and default-deny NetworkPolicy. P2P is exposed through an opt-in NodePort, and gRPC and REST stay inside the cluster.
- I manage the nodes with `lncli` through `kubectl exec`. I unlock the wallet by hand after each restart and have not adopted `lndinit` yet. The Static Channel Backup is encrypted and copied off the volume, and the seed is kept offline.
- Monitoring is [lndmon with Prometheus](/posts/metrics-collector-prometheus-on-lnd/), Alertmanager and Grafana. `loopd` runs alongside.
- The WSL node has [seven channels](/posts/lnd-testnet-routing-node-readiness/), including public channels to two testnet peers and one to my Mac node. I [routed a test payment](/posts/lnd-testnet-routing-practice/) through it.
- Regtest runs Bitcoin Core with two LND nodes, for tests I want to repeat.

The chart and the tests are in [github.com/s1ns3nz0/lnd-ops](https://github.com/s1ns3nz0/lnd-ops).
