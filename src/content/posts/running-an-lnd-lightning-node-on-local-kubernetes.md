---
title: "Running an LND Lightning Node on Local Kubernetes: Designing for State, Identity, and Recovery"
description: A Lightning node is state, not just a process. How I mapped LND's wallet, channel, and recovery model onto StatefulSets, PVCs, NetworkPolicy, and tests on local K3s.
pubDatetime: 2026-09-30T01:30:00+09:00
tags:
  - LND on Kubernetes
  - Lightning Network
  - Kubernetes
  - K3s
  - Blockchain
---

Running a Lightning node on Kubernetes looks deceptively similar to deploying any other containerized application.

Start a Pod, expose a Service, attach some storage, and let Kubernetes restart it when something goes wrong.

That mental model works for many web services.

It is incomplete for a Lightning node.

An LND node has an identity, wallet keys, channel state, authentication material, and recovery data that must survive independently of the lifecycle of a Pod. A restarted process is useful only if it comes back as the **same Lightning node with the same persistent state**.

That requirement shaped almost every Kubernetes decision in my `lnd-ops` project.

I built the environment on local, single-node K3s clusters: K3s inside a Lima Linux VM on macOS arm64, and K3s inside WSL 2 on Windows amd64. Both environments use the same Helm chart, while keeping their wallets and persistent data completely independent.

This post explains the design from two perspectives:

**What the official LND and Kubernetes documentation says about the underlying problem, and how I translated those requirements into my own local Kubernetes implementation.**

---

## The first design decision: treat LND as state, not just a process

Kubernetes is very good at replacing processes.

If a Pod disappears, Kubernetes can create another one.

But replacing an LND process and recovering an LND node are not the same operation.

LND stores wallet and Lightning state under its data directory. Its wallet must also be unlocked after a fresh daemon startup. Lightning Labs explicitly documents the distinction between creating a wallet and unlocking an existing wallet: after a restart or upgrade, an existing wallet is decrypted again using its wallet password rather than recreated.

Recovery introduces another important distinction.

LND's recovery documentation states that recovering both on-chain and off-chain funds requires the wallet seed and a Static Channel Backup, or SCB. The SCB is deliberately not a copy of the latest live channel database. It contains the static information required to initiate LND's data-loss recovery mechanism.

That immediately gave me three separate lifecycle problems:

```text
Application lifecycle
    LND container / Pod

Persistent node lifecycle
    wallet + database + node identity

Disaster recovery lifecycle
    seed + Static Channel Backup
```

I did not want those three concepts to collapse into one Kubernetes object.

A container image should be replaceable.

The wallet should survive that replacement.

And the recovery material should survive even if the Kubernetes storage itself is lost.

---

## Why I chose a StatefulSet

Kubernetes documents StatefulSets as the workload primitive for applications that require stable identities or stable persistent storage across Pod rescheduling. Its `volumeClaimTemplates` mechanism creates a persistent claim associated with each StatefulSet Pod.

That maps well to an LND node.

My Helm chart therefore renders each LND node as a **single-replica StatefulSet**, rather than treating one wallet as something that should be horizontally replicated.

The important part of the current template is conceptually this:

```yaml
spec:
  replicas: 1

  template:
    spec:
      containers:
        - name: lnd
          args:
            - --lnddir=/data/.lnd
          volumeMounts:
            - name: data
              mountPath: /data

  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes:
          - ReadWriteOnce
```

The actual implementation mounts the persistent volume at `/data` and tells LND to use `/data/.lnd` as its data directory.

The testnet profile currently requests a 30 GiB volume and creates one LND StatefulSet. The default regtest profile creates two independent LND nodes, each with its own volume.

That distinction matters.

Two replicas of one wallet would not mean “highly available Lightning.”

In this project, `lnd.nodes: 2` means **two separate Lightning nodes with separate storage**, which is useful in regtest for opening a channel between nodes and exercising both payment directions.

The Lightning identity also does not come from the Kubernetes Pod name.

`lnd-0-0` is a Kubernetes identity.

The Lightning node identity comes from the cryptographic keys persisted in the LND wallet.

A replacement Pod mounting the same wallet can return as the same Lightning node. A Pod with the same Kubernetes name but a fresh wallet would not.

---

## A PVC solves restart persistence, not disaster recovery

PersistentVolumes are deliberately separate from Pods. Kubernetes describes a PVC as a request for storage, with the PersistentVolume lifecycle independent of an individual Pod.

That is exactly what I needed for Pod replacement.

It does **not** mean that the wallet is backed up.

This distinction is especially important because these are single-node local Kubernetes clusters. The storage ultimately depends on the Lima VM or WSL environment and the host disk beneath it.

So I use two separate mechanisms.

The PVC preserves the live LND state across normal Pod replacement and Helm reconciliation.

The SCB is copied outside the K3s data volume and encrypted separately. The wallet seed is retained separately from both of them.

This follows LND's recovery model more closely than attempting to periodically copy `channel.db`. LND's own safety documentation specifically warns that restoring an old channel database is dangerous and identifies `channel.backup` as the file intended for Static Channel Backup.

In my Windows testnet validation, for example, I encrypted the current SCB outside the Kubernetes volume and verified that the decrypted hash matched the live backup. The later acceptance tests also verified that the same SCB remained valid across ordinary Helm redeployment.

The practical model became:

```text
Pod replacement
        │
        ▼
StatefulSet
        │
        ▼
PVC ───────────────► live wallet and channel state

LND channel.backup
        │
        ▼
encrypted off-PVC SCB

wallet seed
        │
        ▼
separate offline recovery material
```

PVC persistence and Lightning recovery are related, but they are not interchangeable.

---

## Using different Bitcoin backends for regtest and testnet

The next design decision was how LND would obtain Bitcoin chain information.

LND supports multiple chain backends, including Bitcoin Core, btcd, and Neutrino. Lightning Labs documents that LND can operate with Neutrino without running a local Bitcoin backend, although running Bitcoin Core or btcd on the same machine or network is recommended for performance.

I therefore made the backend depend on the environment.

For **regtest**, the Helm chart deploys Bitcoin Core together with two LND nodes.

The generated LND arguments include:

```text
--bitcoin.regtest
--bitcoin.node=bitcoind
--bitcoind.rpchost=bitcoin:18443
--bitcoind.zmqpubrawblock=tcp://bitcoin:28332
--bitcoind.zmqpubrawtx=tcp://bitcoin:28333
```

Bitcoin Core gives me a completely controlled chain where I can generate blocks, fund wallets, open channels, and test payments without relying on public test infrastructure.

For **testnet**, I deliberately did not deploy Bitcoin Core.

The profile switches LND to:

```text
--bitcoin.testnet
--bitcoin.node=neutrino
```

That drastically reduces what the local Kubernetes environment needs to run and makes the testnet node practical on a developer workstation.

It is a tradeoff rather than a claim that Neutrino is universally the better LND backend.

For this project, regtest optimizes for deterministic experiments; testnet optimizes for operating a real Lightning node with a smaller local infrastructure footprint.

---

## Separating RPC access from Lightning P2P exposure

Another thing I did not want was to treat every LND port as equally public.

The default Kubernetes Service exposes LND's gRPC interface on `10009` and Lightning P2P on `9735` inside the cluster.

The LND process also listens for REST on `8080`, but the default Service does not expose that port.

This uses the normal Kubernetes Service model: a ClusterIP provides a cluster-internal endpoint, while NodePort can expose a Service through a node port.

External Lightning routing is explicitly opt-in in my chart.

Only when `router.enabled` is enabled does the chart render an additional NodePort Service for P2P traffic:

```text
Internet / LAN
      │
      │ TCP 9735
      ▼
host forwarding
      │
      ▼
K3s NodePort 30973
      │
      ▼
lnd-router-p2p Service
      │
      ▼
LND :9735
```

At the same time, RPC and REST are not moved into that public Service.

The chart also requires an operator-provided external address before enabling the LND `--externalip` option.

That separation was intentional.

A Lightning node needs public P2P connectivity if it is going to operate as a reachable routing node.

That does not imply that its management API should be public.

---

## Default-deny networking instead of assuming namespaces are isolation

I also learned not to treat a Kubernetes Namespace as if it were automatically a network firewall.

Kubernetes NetworkPolicy is the primitive that controls Layer 3/4 traffic, and the official documentation makes two points that mattered for this design.

First, traffic is allowed by default when no policies isolate the Pods.

Second, a default-deny egress rule also blocks DNS unless DNS is explicitly permitted. NetworkPolicy enforcement also depends on the cluster's networking plugin supporting it.

My chart starts with:

```yaml
podSelector: {}
policyTypes:
  - Ingress
  - Egress
```

and then adds explicit allowances.

DNS traffic to `kube-system` is allowed separately.

Regtest LND Pods are allowed to reach the Bitcoin Core RPC and ZMQ ports.

Testnet LND is allowed outbound access for Lightning peers and Bitcoin testnet P2P traffic.

Monitoring traffic is allowed only from the monitoring namespace when monitoring is enabled.

The design became:

```text
default deny
    │
    ├── DNS
    ├── Lightning P2P
    ├── Neutrino / Bitcoin P2P
    ├── regtest Bitcoin RPC + ZMQ
    └── monitoring scrape paths
```

This is much easier to reason about than deploying the node with unrestricted connectivity and trying to infer later which paths are actually necessary.

---

## Kubernetes credentials and LND credentials are different security domains

An LND container does not need permission to administer Kubernetes.

For that reason, I created a dedicated `lnd-node` ServiceAccount and disabled automatic ServiceAccount token mounting both in the ServiceAccount and the Pod configuration. Kubernetes explicitly supports `automountServiceAccountToken: false` for workloads that do not need Kubernetes API credentials.

This does not replace LND authentication.

LND uses TLS and macaroons for its own RPC authorization.

Lightning Labs documents macaroons as the API authentication mechanism and warns that an `admin.macaroon` represents highly privileged access to the daemon.

So there are two different questions:

```text
Can this Pod call the Kubernetes API?
        → Kubernetes ServiceAccount / RBAC

Can this process call sensitive LND RPC methods?
        → LND TLS + macaroon permissions
```

Keeping those concepts separate made the security model much easier to inspect.

For monitoring, `lndmon` is configured to use the read-only macaroon rather than intentionally calling LND with the admin macaroon. The sidecar mounts the LND data volume read-only.

There is still room to improve this design: mounting the entire LND data directory read-only gives the sidecar visibility into more files than the scoped credential it actually needs. A stricter future design would expose only the TLS certificate and purpose-specific macaroon to that workload.

---

## Container hardening: useful controls, but not yet the full Restricted profile

The LND Pod currently applies several Kubernetes hardening controls:

```yaml
allowPrivilegeEscalation: false

capabilities:
  drop:
    - ALL

seccompProfile:
  type: RuntimeDefault
```

Those line up with controls defined by the Kubernetes Restricted Pod Security Standard.

However, I would not describe the current manifest as fully satisfying the Restricted profile.

The Restricted standard also requires the workload to run as non-root, while the current LND template does not enforce `runAsNonRoot` or a specific non-zero UID.

That distinction is important.

Security documentation is much more useful when it describes what a deployment actually enforces rather than listing a set of best practices and implying that all of them have been implemented.

The current state is therefore:

**privilege escalation disabled, Linux capabilities dropped, RuntimeDefault seccomp enabled, Kubernetes API token removed — with non-root enforcement still a hardening item.**

---

## Resource configuration is a lab decision, not an LND sizing recommendation

Lightning Labs' LND documentation currently lists a minimum of 2 GB RAM and 5 GB of storage and recommends good-quality SSD storage because LND performs frequent reads and writes.

My chart currently uses:

```yaml
requests:
  cpu: 100m
  memory: 256Mi

limits:
  cpu: 2
  memory: 2Gi
```

with 30 GiB of requested storage for the testnet node.

The 256 MiB value is a **Kubernetes scheduling request**, not a claim that LND only needs 256 MiB of RAM.

Likewise, a 2 GiB limit is quite close to the documented minimum rather than generous production headroom.

These values were chosen for a controlled local lab. I would re-evaluate memory, disk growth, I/O performance, and storage topology before using the same configuration for a long-running mainnet deployment.

---

## Proving persistence instead of assuming it

The most useful part of this project was eventually not the YAML itself.

It was defining tests for the claims I was making about the YAML.

For example, “I use a StatefulSet” is not the same as proving that an LND node survives a Pod restart.

In the Windows testnet environment, I deliberately replaced the LND Pod and checked that the replacement had a new Kubernetes Pod UID while recovering the **same Lightning node identity, active channel, and peer connection** after the wallet was unlocked.

I also wrote a redeployment check around ordinary Helm reconciliation.

Before and after `helm upgrade`, the check compares the LND identity, channel points, LND PVC identity, Prometheus PVC identity, SCB hashes, and even a historical Prometheus sample.

That test passed while the Helm release revision changed, demonstrating that application configuration could be reapplied without silently replacing the wallet or its persistent state.

The same architecture was then exercised independently on macOS arm64 and Windows/WSL amd64 using the same project revision. Both hosts demonstrated a synchronized testnet node, an active public channel, bidirectional payments, Pod restart recovery, encrypted SCB integrity, NetworkPolicy controls, monitoring, and preservation of wallet state across normal Helm reapplication.

This changed how I define a successful Kubernetes deployment.

For a normal stateless application, seeing `Running` might be enough to begin testing.

For an LND node, `Running` is only the beginning.

I want to know:

```text
Is this the same node?

Is the wallet still there?

Are the same channels still present?

Can it reconnect to its peers?

Did the same PVC survive?

Is the SCB current?

Can I still observe what happened before the restart?
```

Those became operational invariants rather than assumptions.

---

## Why I still unlock the wallet manually

LND's documented lifecycle requires the wallet password after daemon startup before an existing encrypted wallet becomes usable.

For this lab I intentionally kept that action operator-controlled.

I did not want to solve restart automation by immediately putting a wallet-unlock password into the same Kubernetes environment that contains the wallet.

That creates a tradeoff.

A Kubernetes restart can recreate the Pod automatically, but the Lightning node may remain locked until the operator unlocks it.

So the current architecture favors an explicit security boundary over unattended recovery.

That would need a different secrets-management and threat-model discussion if the objective changed to fully unattended production operation.

---

## What Kubernetes gives me — and what it does not

At this point the division of responsibility is much clearer to me.

Kubernetes gives me repeatable scheduling, declarative configuration, stable storage attachment, internal service discovery, network-policy enforcement, resource controls, and a clean way to attach monitoring components.

LND still owns the Lightning-specific guarantees: wallet identity, channel state, TLS, macaroons, wallet encryption, peer behavior, and Static Channel Backups.

And the operator still owns some things outside both systems: the wallet seed, the SCB recovery strategy, host storage security, public port forwarding, and ultimately the decision to move real funds.

The architecture therefore looks less like “Kubernetes manages my Lightning node” and more like this:

```text
                    ┌─────────────────────┐
                    │     Operator        │
                    │ seed / unlock /     │
                    │ recovery decisions  │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │         Local K3s              │
              │                                │
              │  ┌──────────────────────────┐  │
P2P :9735 ───►│  │ Service / NetworkPolicy  │  │
              │  └─────────────┬────────────┘  │
              │                │               │
              │  ┌─────────────▼────────────┐  │
              │  │ StatefulSet: lnd-0       │  │
              │  │                          │  │
              │  │ LND + optional metrics   │  │
              │  └─────────────┬────────────┘  │
              │                │               │
              │          /data/.lnd            │
              │                │               │
              │  ┌─────────────▼────────────┐  │
              │  │ PersistentVolumeClaim    │  │
              │  └──────────────────────────┘  │
              └─────────────────────────────────┘
                               │
                       channel.backup
                               │
                               ▼
                    encrypted external SCB
```

That is the model I was actually trying to build.

---

## What I would change before calling this production-ready

This project demonstrates persistent Lightning operation on local Kubernetes.

It does **not** demonstrate a highly available Lightning architecture.

Both targets are single-node K3s installations. A StatefulSet can recreate a Pod, but if the underlying VM, WSL storage, or host disk disappears, Kubernetes does not magically recreate the LND wallet.

There are also a few Kubernetes hardening changes I would make for a more production-oriented version.

The current PVC uses `ReadWriteOnce`; current Kubernetes documentation recommends `ReadWriteOncePod` for production StatefulSet storage when that access mode is supported.

I would enforce non-root execution rather than stopping at capability dropping and seccomp.

I would narrow the monitoring containers' access to LND credentials instead of mounting the complete data volume.

I would also give LND more resource headroom and revisit the Bitcoin backend decision depending on the operational objective.

And I would treat host-level storage redundancy and disaster recovery as separate architecture problems rather than pretending a local PVC solves them.

---

## The biggest lesson

The main lesson from running LND on Kubernetes was not how to write a StatefulSet.

It was learning where Kubernetes' abstractions stop.

Kubernetes understands Pods, volumes, Services, identities, and network policies.

It does not understand what it means for a Lightning channel to remain recoverable.

It does not know whether a replacement Pod has returned as the same cryptographic node.

And a green Kubernetes workload does not tell me whether my recovery material is usable.

So I ended up designing the platform around LND's state and failure model first, then mapping Kubernetes primitives onto those requirements.

That produced a much more useful question than:

> “Is my LND Pod running?”

The question I now ask is:

> **“If the process, Pod, deployment, or machine changes, which parts of this Lightning node survive — and how can I prove it?”**

For a stateful financial protocol running on disposable infrastructure, that is the boundary that matters.
