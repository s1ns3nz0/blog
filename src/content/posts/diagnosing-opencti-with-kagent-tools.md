---
title: "Diagnosing OpenCTI with Kagent (2) - Tools, Code-First Diagnosis, and Read-Only Access"
description: The four MCP tools behind the paid-service diagnosis agent, why the code classifies the state before the model explains it, and how Kubernetes access stays read-only.
pubDatetime: 2026-09-30T17:45:00+09:00
tags:
  - AI
  - Kagent
  - Kubernetes
  - MCP
  - L402
  - Prometheus
---

*Part 2 of the series. [Part 1](/posts/diagnosing-opencti-with-kagent-architecture/) covered the architecture: Agent, ModelConfig, system prompt, and MCP server.*

## 1. The four tools

### Order diagnosis: `diagnose_paid_order`

The input is a `tenant_id` and an `order_id`. The tool reads order-related state from the dedicated diagnostics API and classifies which stage the order is in.

```text
/internal/v1/diagnostics/tenants/{tenant_id}/orders/{order_id}
```

`agent/paid_scan_diagnostics.py` defines each tool's name, description, and input schema. The order tool's contract is:

```python
{
    "name": "diagnose_paid_order",
    "description": (
        "Read one tenant-scoped order projection to locate "
        "payment, dispatch or result stage. "
        "Database facts only; no automatic repair."
    ),
    "inputSchema": {
        "type": "object",
        "required": ["tenant_id", "order_id"],
        "additionalProperties": False,
        "properties": {
            key: {"type": "string", "format": "uuid"}
            for key in ("tenant_id", "order_id")
        },
    },
}
```

This tells the model: "Order diagnosis needs a tenant ID and an order ID. No other input, such as an arbitrary URL or SQL, is accepted."

The call the model chooses looks like this:

```json
{
  "name": "diagnose_paid_order",
  "arguments": {
    "tenant_id": "<tenant UUID>",
    "order_id": "<order UUID>"
  }
}
```

The MCP server maps that name to a Python function, runs it, and returns the result. The model does not write and run new Python code.

This tool checks the processing state recorded in the database. It does not connect to LND to re-verify settlement.

### Workload status: `get_opencti_workload_status`

This tool reads the Deployments, scan Jobs, Pods, and Warning Events in the OpenCTI namespace.

Comparing the order record's `dispatch_job_name` with the actual Job name connects the application's record to the Kubernetes execution state.

The tool does not pass raw logs or full resource definitions to the model. It returns only the fields the diagnosis needs.

### Payment path diagnosis: `diagnose_l402_funnel`

This tool sends fixed queries to Prometheus to check how Aperture is handling L402.

| What it observes | Why |
|---|---|
| Invoice issuance successes and failures in the last 15 minutes | Whether payment instructions can be issued |
| Requests without a token vs. invoices issued | Requests arriving while no invoice comes out |
| Authentication results and storage errors | Problems while verifying payment proofs |
| Authentication rejections compared with a past baseline | A security signal that needs a closer look |
| Component health probes | State of the pricing service, merchant LND, and Aperture |

Missing metrics or a failed query are never treated as healthy. Conversely, the absence of L402 traffic alone is not treated as an outage.

The tool's scope is L402. It does not prove MPP or x402 state, or that an individual order has been paid.

### Playbooks: `get_playbook`

Given a playbook name, this tool returns the reviewed response procedure.

| Playbook | Covers |
|---|---|
| `opencti-paid-order-stuck` | Payment, scan, or result problems for a specific order |
| `opencti-l402-funnel` | Aperture, invoice issuance, and L402 authentication problems |

It also returns the playbook's revision and hash, so you can tell which version of the procedure the agent followed.

## 2. The code and the model split the diagnosis

Not every judgment is left to the model. The tool code validates the state and classifies the stage first.

For example, the order diagnosis function has these branches:

```python
elif order != "paid":
    stage, check = (
        "payment",
        "inspect_payment_confirmation_and_receipt_commit",
    )

elif facts["receipt_commit_state"] == "pending" \
        or facts["challenge_state"] not in {None, "settled"}:
    stage, check = (
        "payment_records_need_review",
        "inspect_payment_confirmation_and_receipt_commit",
    )

elif scan is None:
    stage, check = (
        "scan_creation",
        "inspect_backend_reconciliation",
    )
```

Read in order:

```text
The order is not paid yet
    → check the payment stage

Payment records are not fully applied
    → check payment record consistency

Passed both, but there is no scan record
    → check the scan creation stage
```

The model then connects this result to the playbook, calls more tools if needed, and explains it to the operator.

```text
Raw state
    ↓
Tool code: validate and classify
    ↓
Structured result
    ↓
Model: further investigation, playbook comparison, explanation
```

When the API lookup fails or its response cannot be trusted, the tool states the uncertainty explicitly:

```python
return dict(
    result,
    status="unknown",
    reason=reason,
    observed_facts={},
    next_check="restore_diagnostic_evidence",
)
```

The decision not to treat a failed lookup as healthy lives in the code, not in the model.

## 3. Kubernetes permissions match the tools' scope

The Role given to the MCP server is:

```yaml
rules:
  - apiGroups: [apps]
    resources: [deployments]
    verbs: [get, list]

  - apiGroups: [batch]
    resources: [jobs]
    verbs: [get, list]

  - apiGroups: [""]
    resources: [pods]
    verbs: [get, list]

  - apiGroups: [""]
    resources: [events]
    verbs: [get, list]
```

Only `get` and `list` are allowed. This Role cannot modify a Deployment, create a Job, or delete a Pod.

A RoleBinding in the OpenCTI namespace connects this Role to the MCP server's ServiceAccount. The agent runtime is not given cluster administration rights.

The main Kubernetes resources are:

| Resource | Role |
|---|---|
| Agent | Connects the model, prompt, and tools |
| ModelConfig | Model connection settings |
| RemoteMCPServer | Registers the tool server's address |
| Deployment, Service | Run and expose the MCP server |
| ConfigMap | Supplies the Python code and playbooks |
| Secret | Holds the diagnostics API token and CA |
| ServiceAccount, Role, RoleBinding | Identity and permissions for lookups |
| NetworkPolicy | Limits the allowed network paths |

## 4. How a real question is handled

Suppose an operator asks:

> "This order was paid, but there are no scan results."

The agent reads the matching playbook and looks up the order. If it needs to confirm execution, it also checks Kubernetes.

```text
get_playbook
    ↓
diagnose_paid_order
    ↓
get_opencti_workload_status
    ↓
Compare the order record with the actual Job state
    ↓
Explain observed facts, possible causes, and what to check next
```

For example, if the order is paid and its Job's Pod is still `Pending`, that is evidence of a problem at the execution start stage.

But that alone does not prove a memory shortage or an image error. Anything not backed by further evidence should be reported as unconfirmed.

## 5. Where to change what

| What you want to change | Where |
|---|---|
| Diagnosis target API and namespace | `paid-scan-wsl-e2e.values.yaml` |
| Agent instructions and answer style | `templates/_helpers.tpl` |
| Tools the agent may use | `toolNames` in `templates/paid-scan.yaml` |
| MCP server connection, deployment, permissions | RemoteMCPServer, Deployment, and RBAC in the same file |
| Actual lookup and diagnosis logic | `agent/paid_scan_diagnostics.py` |
| Model and Ollama connection | The deploy configuration read by `ops/deploy-agent` |
| Operational response procedures | Documents in `docs/playbooks/` |

Adding a new diagnostic capability usually goes in this order: implement the Python tool, register it in the tool list, then add usage instructions to the agent. Connection settings and permissions are extended only when a new data source is needed.

Next: [Diagnosing OpenCTI with Kagent (3) - Designing Access Control in a GitOps Setup](/posts/diagnosing-opencti-with-kagent-access-control/)
