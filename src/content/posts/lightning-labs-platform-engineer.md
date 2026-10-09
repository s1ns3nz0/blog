---
title: "Application notes: Platform Engineer at Lightning Labs"
description: My application notes for the Platform Engineer (Remote) role at Lightning Labs. A cover letter, my Bitcoin and Lightning experience, why I want the role, and the nodes I run.
pubDatetime: 2026-09-30T22:00:00+09:00
unlisted: true
tags: []
---

*These are my notes for the Platform Engineer (Remote) role at Lightning Labs: a cover letter, my experience with Bitcoin and Lightning, why I want to work there, and the details of the nodes I run.*

## Cover letter

Dear Lightning Labs team,

I am applying for the Platform Engineer role, and I want to say one thing up front: I have not held a paid production on-call role for Kubernetes. My career so far is security consulting at IBM and Deloitte, and network operations as an Army signal officer.

To make up for that, I [ran LND as a stateful workload](/posts/running-an-lnd-lightning-node-on-local-kubernetes/) and tested the claims I was making about it. After replacing the pod and after a helm upgrade, I compared node pubkey, channel points, PVC identity and SCB hashes against the values from before. Then I injected faults into an L402 payment path. My alert took 16 min 22 s to fire, so I [rebuilt the alerting](/posts/diagnosing-opencti-with-kagent-google-sre-review/) until the same fault paged in 5 min 14 s.

The lab has limits, and I wrote them down. It is single-node, so it is not highly available. It does not enforce non-root yet, and the PVC is still ReadWriteOnce. Those notes are public [on this blog](/tags/lnd/).

My operating experience comes from the Army. I led a 25-person platoon accountable for network availability, and I designed and tested its failover and recovery procedures. I stood duty officer rotations as a platoon leader and again as a corps CERT officer. During one night shift at a coastal defense unit, I spotted a suspicious person, reported it, and worked the response with higher headquarters. When others had the duty, I backed up the command post as part of the initial-response element.

I still need time on a team that runs this in production. That is the main reason I am applying.

I am based in Seoul and can work US hours.

Jinsoo Yang

## My experience with Bitcoin and Lightning

My Lightning experience is recent. It started in September 2026. I was reading about AI agents paying per API call (Coinbase's x402), found L402, and from there Lightning.

Since then:

- I run two LND testnet nodes [on Kubernetes (K3s) from one Helm chart](/posts/running-an-lnd-lightning-node-on-local-kubernetes/), plus a regtest setup with Bitcoin Core and two nodes. I opened public channels, [routed a payment through my own node](/posts/lnd-testnet-routing-practice/), and matched the forward and its 1,005 msat fee in `fwdinghistory`.
- I put [Aperture in front of a paid API as an L402 gate](/tags/opencti-payments/), with order-based pricing over gRPC and a receipt check against the merchant LND node.
- In lnd, I reported that the NodeAnnouncement2 address decoders accept short reads ([#11211](https://github.com/lightningnetwork/lnd/issues/11211)). A maintainer confirmed it and credited me as co-author on the fix, [PR #11219](https://github.com/lightningnetwork/lnd/pull/11219).
- In Aperture, I fixed a test flake ([PR #285](https://github.com/lightninglabs/aperture/pull/285), merged via [#292](https://github.com/lightninglabs/aperture/pull/292)) and proposed mint and verify counters ([#286](https://github.com/lightninglabs/aperture/issues/286)) with [a Go implementation on my fork](/posts/aperture-l402-metrics-before-and-after/). A maintainer reviewed it and asked for a pull request, which is now [PR #297](https://github.com/lightninglabs/aperture/pull/297). I also proposed [security event logging](/posts/aperture-l402-security-events-monitoring-proposal/) ([#291](https://github.com/lightninglabs/aperture/issues/291)).

I have not run a mainnet node or held funds in channels. Before this, my crypto experience was DeFi and trading, and running an Ethereum validator stack on the Hoodi testnet.

## Why I want to work at Lightning Labs

I spent the last few years as a security consultant at IBM and Deloitte, assessing other people's systems and writing recommendations. What I wanted was to own the security and operations of a system myself, to a standard I would be comfortable showing anyone. So I earned the Kubernetes and AWS certifications while consulting, and started building and operating things on my own time.

I picked blockchain nodes to practice on because I could run them alone, and because availability and security failures there cost money directly. That led to [an Ethereum validator platform](https://github.com/s1ns3nz0/node-operator-public), and then to LND.

That work already runs on your software. I run lnd, lndmon and Aperture, and the gaps I hit as an operator became issues and a PR in your repositories. I would rather do that full time, on the platform those services run on.

I also think AI agents and stablecoins will move a lot of payment volume onto open networks, and that bitcoin's proof of work and fixed supply give it a position other networks do not have. L402 and Taproot Assets are built for that kind of payment.

## The Lightning nodes I run

I run LND on testnet and regtest. I do not run a mainnet node yet.

- Two testnet nodes, running for about two weeks. One is on a MacBook Pro (M4 Pro, 48 GB RAM, 512 GB) in K3s inside a Lima VM. The other is on a Windows PC (64 GB RAM, 1 TB) in K3s inside WSL 2.
- Both use [the same Helm chart](/posts/running-an-lnd-lightning-node-on-local-kubernetes/): a single-replica StatefulSet, a PVC for wallet and channel state, the Neutrino backend, and default-deny NetworkPolicy. P2P is exposed through an opt-in NodePort, and gRPC and REST stay inside the cluster.
- I manage the nodes with `lncli` through `kubectl exec`. I unlock the wallet by hand after each restart and have not adopted `lndinit` yet. The Static Channel Backup is encrypted and copied off the volume, and the seed is kept offline.
- Monitoring is [lndmon with Prometheus](/posts/metrics-collector-prometheus-on-lnd/), Alertmanager and Grafana. `loopd` runs alongside.
- The WSL node has [seven channels](/posts/lnd-testnet-routing-node-readiness/), including public channels to two testnet peers and one to my Mac node.
- Regtest runs Bitcoin Core with two LND nodes, for tests I want to repeat.

The chart and the tests are in [github.com/s1ns3nz0/lnd-ops](https://github.com/s1ns3nz0/lnd-ops).
