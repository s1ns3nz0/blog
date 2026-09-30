---
title: "Diagnosing OpenCTI with Kagent (1) - Architecture: Agent, Model, and MCP Server"
description: How I built a diagnosis agent for a paid OpenCTI and ASM service on kagent, and how the Helm values, Agent, ModelConfig, system prompt, and MCP server fit together.
pubDatetime: 2026-09-30T17:40:00+09:00
tags:
  - AI
  - Kagent
  - Kubernetes
  - MCP
  - Helm
---

*Part 1 of the series. Next: [(2) Tools, Code-First Diagnosis, and Read-Only Access](/posts/diagnosing-opencti-with-kagent-tools/).*

While building a service that combines OpenCTI with Attack Surface Management (ASM) tools, I also had to think about how to diagnose problems after a customer pays.

When a user says "I paid, but my scan results never showed up," there is no single thing to check. The payment record, scan creation, job dispatch, the Kubernetes Job that runs the scan, and result storage all have to be looked at together.

So I built a diagnosis agent for the paid service on top of kagent. This post compares what kagent provides with what I added, and shows how the actual configuration connects.

The description follows the current repository implementation. It is separate from any record of verifying a running cluster's deployment state.

## 1. What does kagent do?

kagent is a platform for declaring and running AI agents on Kubernetes.

An agent here is not just a model. It bundles the model to use, the instructions it follows, the tools it can call, and the environment it runs in.

```text
User
   ↓
kagent UI / API
   ↓
Agent runtime
   ├─ Model: interprets the question, picks tools, writes the answer
   └─ MCP server: actually runs the tools
                  ↓
           APIs, Kubernetes, Prometheus
```

Separately, the kagent controller reads Agent declarations registered in Kubernetes and manages the resources that run them.

```text
Agent declaration
    ↓
kagent controller
    ↓
Creates and manages the agent's runtime resources
```

The controller manages the agent's deployment. When a user asks a question, it is the agent runtime that calls the model and the tools.

## 2. What kagent provides, and what I built

Installing kagent does not make it understand OpenCTI's order model or payment flow. The tools and diagnostic procedures for the business have to be connected.

| What kagent provides | What I added |
|---|---|
| Running and managing agents | A diagnosis agent declaration for the paid service |
| Model connections | The Ollama connection settings |
| MCP server connections and tool calls | Order, workload, and L402 diagnosis tools |
| Applying a system prompt | An evidence-first diagnostic procedure |
| Running on Kubernetes | The tool server's Deployment, permissions, and network limits |

`charts/agent/templates` in my repository is the template folder of a Helm chart I wrote myself. The OpenCTI-specific features were not in kagent to begin with.

This chart creates both the kagent Agent resources and the Kubernetes resources for my own MCP server.

## 3. The diagnosis architecture

The chain of configuration looks like this:

```text
Helm values
    ↓ decide which diagnosis services to deploy
Agent
    ├─ ModelConfig → Ollama
    └─ RemoteMCPServer → Python tool server
                            ├─ OpenCTI diagnostics API
                            ├─ Kubernetes API
                            ├─ Prometheus
                            └─ Playbooks
```

And this is how a question travels through it:

```text
Operator
  │ "I paid, but there are no scan results"
  ▼
Agent: paid-scan-diagnosis
  │
  ├─ ModelConfig → Ollama
  │
  └─ RemoteMCPServer
          ↓
     paid-scan-diagnostics MCP server
          │
          ├─ OpenCTI diagnostics API
          │   order, payment, scan, and result state
          │
          ├─ Kubernetes API
          │   Deployments, Jobs, Pods, Warning Events
          │
          ├─ Prometheus
          │   Aperture L402 metrics, component health
          │
          └─ Playbooks
              investigation order, response criteria
```

The model does not explore the database or Kubernetes freely. It receives only what the tools implemented in the MCP server return.

## 4. Helm values choose what to diagnose

The extra values for the paid service contain:

```yaml
paidScan:
  enabled: true

  origin: https://order-diagnostics.opencti-paid-scan-e2e.svc.cluster.local:8443
  namespace: opencti-paid-scan-e2e

  podLabels:
    app: null
    app.kubernetes.io/name: order-diagnostics

  port: 8443
  credentialSecret: paid-scan-diagnostics-client

  eval:
    enabled: true
```

| Setting | Role |
|---|---|
| `enabled` | Create the paid-service diagnosis resources |
| `origin` | Address of the dedicated diagnostics API that reads order state |
| `namespace` | The OpenCTI namespace to inspect in Kubernetes |
| `podLabels`, `port` | The diagnostics API target that the NetworkPolicy allows |
| `credentialSecret` | The Secret holding the diagnostics API token and CA certificate |
| `eval.enabled` | Also create an evaluation agent and a fixture server |

`origin` is not the Aperture address. It is a read-only diagnostics API I built on the OpenCTI side to look up order processing state.

This values file is for end-to-end practice, so the evaluation setup is enabled too. The evaluation agent uses prepared scenario responses and is kept separate from the agent that diagnoses the real service.

## 5. The Agent declaration bundles the model and tools

The core Agent definition, from `charts/agent/templates/paid-scan.yaml`:

```yaml
apiVersion: kagent.dev/v1alpha2
kind: Agent
metadata:
  name: paid-scan-diagnosis
  namespace: lndops-kagent
spec:
  type: Declarative

  declarative:
    runtime: python
    modelConfig: default-model-config

    systemMessage: |
      {{- include "agent.paidScanSystemMessage" . | nindent 6 }}

    tools:
      - type: McpServer
        mcpServer:
          name: paid-scan-diagnostics
          kind: RemoteMCPServer
          apiGroup: kagent.dev
          toolNames:
            - diagnose_paid_order
            - get_opencti_workload_status
            - diagnose_l402_funnel
            - get_playbook

  deployment:
    replicas: 1
    serviceAccountName: kagent-no-kubernetes-api
```

In plain words: "Create one Python-based agent runtime, use this model and this system prompt, and connect only these four tools from this MCP server."

The declaration bundles:

- a Python-based agent runtime,
- the model configuration it refers to,
- the system prompt that sets its behavior,
- four callable tools,
- the replica count and ServiceAccount.

Two things are easy to confuse here. `runtime: python` is the runtime of the kagent agent itself. The Python MCP server I wrote, `paid_scan_diagnostics.py`, runs separately in its own Deployment.

The agent also uses a ServiceAccount with no Kubernetes API access. Kubernetes read access goes to the MCP server that actually runs the tools.

## 6. The model is referenced through a separate resource

The Agent does not contain a model name. It points at a configuration:

```yaml
modelConfig: default-model-config
```

The model settings in my kagent chart use Ollama:

```yaml
providers:
  default: ollama

  ollama:
    provider: Ollama
    model: qwen3:8b

    config:
      host: https://ollama.invalid
      options:
        num_ctx: "16384"
```

But these are only the file's defaults. The deploy script reads its own configuration and overrides them with Helm arguments:

```python
"--set-string", f'providers.ollama.model={config["model"]}',
"--set-string", f'providers.ollama.config.host={config["endpoint"]}',
```

So the chain is:

```text
Agent
  → default-model-config
      → the Ollama address and model given at deploy time
```

To know which model is actually running, check the deployment configuration. Don't assume it from the file's defaults.

Running Ollama on a Mac and the agent in WSL also works, as long as WSL can reach that Ollama address.

## 7. The system prompt sets the diagnostic procedure

The prompt lives in `charts/agent/templates/_helpers.tpl`. It defines the agent's role like this:

```text
You are the OpenCTI paid-scan and L402 payment diagnosis agent.
You can read evidence; you cannot change anything.
```

It also tells the agent to read the matching playbook first:

```text
Playbooks: before diagnosing, call get_playbook for the matching playbook:
opencti-paid-order-stuck for a specific order,
opencti-l402-funnel for the payment gate or Aperture.
```

The intended investigation order is:

```text
Read the matching playbook
    ↓
Check state with the tools
    ↓
Fetch additional evidence if needed
    ↓
Separate observed facts from hypotheses
    ↓
Explain what to check next
```

The prompt also says not to invent facts that were not retrieved, and to state uncertainty when information is missing or stale.

However, access is not limited by the prompt's "don't change anything" alone. No tool that changes state is provided, and the Kubernetes permissions are read-only.

## 8. The MCP server runs the actual tools

The RemoteMCPServer resource declares how to reach the MCP server:

```yaml
apiVersion: kagent.dev/v1alpha2
kind: RemoteMCPServer
metadata:
  name: paid-scan-diagnostics
  namespace: lndops-kagent
spec:
  protocol: STREAMABLE_HTTP
  url: http://paid-scan-diagnostics.{{ .Release.Namespace }}.svc.cluster.local:8080/mcp
  timeout: 15s
```

When the chart is installed into the `lndops-agent` namespace, the address becomes:

```text
http://paid-scan-diagnostics.lndops-agent.svc.cluster.local:8080/mcp
       └─ Service name       └─ namespace                    └─ MCP path
```

The agent fetches the tool list from this server and calls the tools it needs. This resource does not run any tool code itself. The actual server runs in a separate Deployment:

```yaml
containers:
  - name: gateway
    image: {{ .Values.gateway.image | quote }}

    command:
      - python3
      - /app/paid_scan_diagnostics.py

    env:
      - name: PAID_SCAN_DIAGNOSTICS_ORIGIN
        value: {{ $origin | quote }}

      - name: PAID_SCAN_DIAGNOSTICS_TOKEN_FILE
        value: /credentials/token

      - name: PAID_SCAN_DIAGNOSTICS_CA_FILE
        value: /credentials/ca.crt

      - name: OPENCTI_NAMESPACE
        value: {{ .Values.paidScan.namespace | quote }}

      - name: PROMETHEUS_URL
        value: http://lnd-ops-monitoring-kube-pr-prometheus.lndops-monitoring.svc:9090

      - name: PLAYBOOK_DIR
        value: /playbooks
```

Each environment variable tells a tool where to read its information:

| Tool | Connection settings it uses |
|---|---|
| `diagnose_paid_order` | Diagnostics API address, token, CA |
| `get_opencti_workload_status` | Kubernetes ServiceAccount and `OPENCTI_NAMESPACE` |
| `diagnose_l402_funnel` | `PROMETHEUS_URL` |
| `get_playbook` | `PLAYBOOK_DIR` |

The Prometheus address is currently fixed in the template. If Prometheus is installed under another name or namespace, this address and the related NetworkPolicy have to be updated too.

Code, playbooks, and credentials are mounted like this:

```yaml
volumes:
  - name: source
    configMap:
      name: runbook-gateway-source

  - name: playbooks
    configMap:
      name: paid-scan-playbooks

  - name: credentials
    secret:
      secretName: {{ .Values.paidScan.credentialSecret | quote }}
```

In other words, my code is not baked into the Python image. The code in a ConfigMap is mounted as files and executed.

The next part looks inside the MCP server: the four tools, how the diagnosis is split between code and model, and how its Kubernetes access is kept read-only.

Next: [Diagnosing OpenCTI with Kagent (2) - Tools, Code-First Diagnosis, and Read-Only Access](/posts/diagnosing-opencti-with-kagent-tools/)
