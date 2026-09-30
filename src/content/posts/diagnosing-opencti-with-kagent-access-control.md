---
title: "Diagnosing OpenCTI with Kagent (3) - Designing Access Control in a GitOps Setup"
description: Access control for kagent has two sides, who can change an agent and what a running agent can reach. How I split them across Git review, GitOps, RBAC, MCP, application, and database controls.
pubDatetime: 2026-09-30T17:50:00+09:00
tags:
  - AI
  - Kagent
  - Kubernetes
  - MCP
  - GitOps
  - RBAC
---

*Part 3 of the series. [Part 1](/posts/diagnosing-opencti-with-kagent-architecture/) covered the architecture; [Part 2](/posts/diagnosing-opencti-with-kagent-tools/) the tools and read-only access.*

When reviewing access to kagent, you have to look at two processes together: changing the configuration, and a deployed agent doing actual work.

Suppose you add a Kubernetes lookup tool to an agent. The YAML that adds the tool is reviewed in Git and deployed. After that, when the tool calls the Kubernetes API, the ServiceAccount and RBAC of the Pod running the tool apply.

The two processes are controlled by different means.

| Area | Question | Main controls |
|---|---|---|
| Configuration change | Who can change the agent's model, tools, and permissions? | PRs, CODEOWNERS, merge protection rules, CI |
| Applying to the cluster | Who turns approved settings into real resources? | The GitOps controller's ServiceAccount and RBAC |
| Access at runtime | What can the agent and its tools read or change? | The running Pod's ServiceAccount and RBAC, API and database authentication and authorization |

This post assumes kagent's configuration is managed with GitOps. Changes to Agents, ModelConfigs, MCP connections, ServiceAccounts, RBAC, and so on are reviewed in Git, and a GitOps controller applies them to the cluster.

Regular operators use approved agents. When a configuration change is needed, they open a PR, and the owners of that area review it.

**Configuration change path**

```text
YAML, Helm values, or tool code change
  → Pull Request
  → CODEOWNERS review + CI
  → Merge into the protected branch
  → GitOps controller applies it
  → kagent controller builds the agent workload
```

**Runtime access path**

```text
Operator
  → kagent UI / API
  → Agent
  → MCP tool
  → Kubernetes API / application API / database
       └─ each target checks the caller's permissions
```

What to review:

| What to review | Access to check | Where it is enforced |
|---|---|---|
| kagent UI and API | Who can log in and run agents? Can they also change settings? | Authentication settings supported by the version in use, existing SSO integration, entry paths |
| Agent resources | Who can create, modify, or delete agents? | GitOps PRs and CODEOWNERS, Kubernetes RBAC, deployment permissions |
| ModelConfig | Who can change the model endpoint and credentials? | GitOps change approval, resource change permissions, Secret access |
| The agent's tool list | Which tools can the agent call? | `Agent.spec.declarative.tools`, tool-change PRs |
| MCP servers | Who can connect to an MCP server, and which tools can they run? | The MCP server's authentication and authorization, network access, deployment settings |
| Agent and MCP ServiceAccounts | What can each Pod read or change in Kubernetes? | ServiceAccount, Role, RoleBinding |
| Application and database | How much data can a tool read? | Access checks in the existing diagnostics API, database account permissions |
| A2A | Which agent can call which, and how far can the called agent go? | A2A connection settings, receiver-side authentication and authorization, tool permissions |
| Conversations and task results | Can someone see another user's conversation or results? | The behavior and access controls of the kagent version in use |

The paths below are an example of how a project can organize its settings. kagent does not create these directories.

```text
repository/
├── .github/
│   ├── CODEOWNERS
│   └── workflows/
│       └── validate.yaml
├── clusters/
│   └── production/
│       └── kagent/
├── deploy/
│   ├── kagent/
│   │   └── values.yaml
│   ├── agents/
│   │   └── paid-service-diagnosis.yaml
│   ├── models/
│   │   └── diagnostic-model.yaml
│   ├── mcp/
│   │   └── diagnostic-tools.yaml
│   └── rbac/
│       └── diagnostic-reader.yaml
└── services/
    └── diagnostic-mcp/
        └── tools.py
```

Check the resource fields and authentication settings in these examples against the kagent version you deploy. Don't assume that features of a separate product or another version are available in your environment.

## 1. kagent UI and API: separate using agents from changing them

Operators come to kagent for two reasons: to run an agent that is already deployed, or to change the configuration of agents, models, and tools.

In a GitOps setup, those two go through different paths.

```text
Using an agent
  → SSO authentication
  → Run an approved agent

Changing an agent's configuration
  → Git PR
  → Owner review
  → GitOps deployment
```

If you already use SSO, integrate it in the way your kagent version supports. Check how users are identified and which groups are allowed, and make sure authentication applies not only to the UI but also to the API and to direct agent calls.

These settings are managed in the values passed to the kagent chart:

```text
deploy/kagent/values.yaml
```

What to check:

| Item | What to check |
|---|---|
| UI access | Can only approved operators log in? |
| API access | Do calls that bypass the UI also require authentication? |
| Running agents | Which agents can a user run? |
| Changing settings | Can a regular operator change model, tool, or agent settings? |
| Direct endpoints | Are there paths left that bypass authentication? |

Supporting login and separating fine-grained permissions are different things. Logging in with SSO does not automatically separate the right to run from the right to change configuration.

Using GitOps also does not automatically forbid edits through the UI. If the kagent API can modify settings with its own Kubernetes permissions, check whether users could use that API to bypass the Git review process.

So limit administrative functions with the authentication and authorization features your version supports and with entry-path settings. If your version cannot separate them well enough, don't expose those admin screens and APIs to regular users as they are.

Manage `kubectl` write access to the cluster by the same principle. Don't give regular operators day-to-day write access to resources that GitOps manages.

## 2. Agent resources: approve changes with CODEOWNERS and merge protection

An Agent definition includes the model, prompt, tools, and runtime settings. Changing that file changes the agent's behavior and its access scope.

For example, every item here is subject to review:

```yaml
# part of deploy/agents/paid-service-diagnosis.yaml
spec:
  declarative:
    modelConfig: diagnostic-model
    tools:
      # tools to use
    deployment:
      serviceAccountName: diagnostic-agent
```

Changing `modelConfig` can change which model data is sent to. Adding a tool widens what the agent can do. Changing the ServiceAccount can change the workload's Kubernetes identity.

Submit these changes as PRs that need an owner's approval.

```text
Agent YAML change
  → Open a PR
  → Review by the owners listed in CODEOWNERS
  → CI passes
  → Merge
  → GitOps applies it
```

An example CODEOWNERS file:

```text
# .github/CODEOWNERS

*                          @example/platform-team

/deploy/agents/            @example/agent-maintainers
/deploy/models/            @example/platform-team
/deploy/mcp/               @example/platform-team
/deploy/rbac/              @example/security-team
/clusters/                 @example/platform-team

/services/diagnostic-mcp/  @example/service-team
/.github/                  @example/security-team
```

Use team names that fit your organization. Cover every path that affects real behavior: Helm templates, values, per-environment overlays, and tool code.

Writing a CODEOWNERS file does not by itself enforce approval. A protected branch or ruleset has to require PRs and Code Owner approval. Protect changes to CODEOWNERS itself as well. See the [GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).

Listing several teams on one line usually means approval from any one of those owners satisfies the requirement. If you need approval from both teams, set up an approval rule that enforces it separately.

The merge policy should include:

- Changes go through PRs, not direct pushes to the protected branch.
- Code Owner approval is required.
- Required CI checks must pass.
- Significant changes added after approval trigger a new review.
- Bypass rights for admins and automation accounts are limited too.

CI should check the final rendered result. A YAML syntax check is not enough.

With Helm, verify how the tool list, images, ServiceAccounts, and RBAC render once the templates and values are combined.

Limit the deployment permissions of the GitOps controller as well. An approved PR is no reason to deploy with more cluster access than needed. Flux also treats the deploying ServiceAccount and permission limits in multi-tenant setups as security concerns. See the [Flux security best practices](https://fluxcd.io/flux/security/best-practices/).

## 3. ModelConfig: changing the model changes where data goes

An agent refers to its model through a ModelConfig:

```yaml
# part of an Agent definition
spec:
  declarative:
    modelConfig: diagnostic-model
```

Model settings can include the provider, model name, endpoint, and authentication settings. Check the exact fields against your provider and kagent version. See the [kagent API reference](https://kagent.dev/docs/kagent/0.x/resources/api-ref/).

In a GitOps setup, model settings can live in:

```text
deploy/models/diagnostic-model.yaml
```

A change to this file is not just "let's try another model." It can change where the order information and operational state that the agent reads are sent.

In the PR, check:

| Change | Why review it |
|---|---|
| Model endpoint | Customer and operational data would go somewhere else |
| Provider | Data handling and retention terms may change |
| Credential reference | A different service account or contract scope may be used |
| A shared ModelConfig | Several agents are affected at once |
| Model image or settings | The deployed model's actual behavior changes |

Don't store credentials in Git in plain text. Manage references or encrypted settings according to your organization's Secret management.

```text
Git
  → Secret references or approved encrypted settings

Runtime
  → Real credentials only for the workloads that need them
```

At runtime, limit access for the workloads that use the model credentials and endpoint. Make sure regular operators cannot change them directly through the UI or API and bypass PR review.

Looking only at direct read access to ModelConfigs and Secrets is not enough. Also review who can change a workload's settings to mount a different Secret or select a different ServiceAccount.

## 4. The agent's tool list: a tool-adding PR is a permission review

The tools an agent can call are defined in `Agent.spec.declarative.tools`.

A diagnosis agent for a paid service might connect specific lookup tools:

```yaml
# part of deploy/agents/paid-service-diagnosis.yaml
spec:
  declarative:
    tools:
      - type: McpServer
        mcpServer:
          name: diagnostic-tools
          kind: RemoteMCPServer
          apiGroup: kagent.dev
          toolNames:
            - diagnose_order
            - get_workload_status
            - get_payment_metrics
            - get_playbook
```

Review changes to the tool list in Git, and don't judge a tool read-only by its name.

| Tool | Actual behavior to check |
|---|---|
| `diagnose_order` | Does it read orders without changing their state? |
| `get_workload_status` | Does it return only the workload information needed? |
| `get_payment_metrics` | Does it query only approved metrics and data? |
| `get_playbook` | Can it read only registered documents? |

For example, if retry or restart logic is added to an existing tool's code, its effective permissions can grow without any change to the Agent YAML.

So the review has to cover:

```text
The agent's toolNames
+ the MCP tool implementation
+ the MCP image being deployed
+ the credentials the tools use
+ permissions on the target systems
```

Pin tool images so the reviewed version can be reproduced. If the same image tag is replaced with different content, the running code changes without any YAML change in Git.

The prompt can state a read-only diagnosis principle:

```yaml
systemMessage: |
  Diagnose incidents using approved read-only tools.
  Separate observed facts from hypotheses.
  Do not modify application or infrastructure state.
```

But a prompt is not a permission boundary. Even if the model asks for a change, the tools and the target systems must refuse it.

Be especially careful with PRs that add a general-purpose shell or arbitrary SQL tool. Their reach depends entirely on the arguments.

## 5. MCP servers: approve the connection in Git, check calls on the server

A RemoteMCPServer defines which MCP server the agent connects to:

```yaml
# deploy/mcp/diagnostic-tools.yaml
apiVersion: kagent.dev/v1alpha2
kind: RemoteMCPServer
metadata:
  name: diagnostic-tools
  namespace: agents
spec:
  protocol: STREAMABLE_HTTP
  url: https://diagnostic-mcp.tools.svc:8443/mcp
```

Changing this address also goes through CODEOWNERS review. Pointing at a different MCP server can change the tool implementations the agent uses and where its data goes.

In the PR, check:

- Is it an approved MCP server?
- Does it use TLS and verify the server certificate?
- Are no credentials embedded in a plain URL or setting?
- Is it not exposed externally without need?
- Were MCP code, image, and permission changes reviewed together?

After deployment, the MCP server itself has to authenticate and authorize each request.

```text
GitOps
  → approves which MCP server to connect to

MCP server
  → decides whether to allow the call coming in now
```

This pseudocode shows where the MCP server checks permissions:

```python
def handle_tool_call(request):
    caller = authenticate(request)

    tool_name, arguments = parse_tool_call(request)

    require_tool_permission(caller, tool_name)
    validate_arguments(tool_name, arguments)

    return tools[tool_name](caller, arguments)
```

`toolNames` is the list of tools offered to the agent. It does not replace the MCP server's authentication and authorization.

If you use a shared service token, understand exactly what it identifies. If the token identifies only the agent application, the permissions of the individual operator who started the call are not being applied.

If per-user data limits are needed, confirm that the user's identity is verified along the actual call path. Never treat a `user_id` written by the model as authentication.

Use NetworkPolicy to limit connections between the agent and the MCP server. Who may use which tool is decided by the server's authentication and authorization.

## 6. Agent and MCP ServiceAccounts: the permissions of the approved configuration at runtime

GitOps CODEOWNERS and Kubernetes ServiceAccounts answer different questions.

```text
CODEOWNERS
  → Who approves this permission setting?

ServiceAccount + RBAC
  → What can the running workload do?
```

Add the deploying party and there are three kinds of permissions to separate:

| Actor | Permissions it needs |
|---|---|
| GitOps controller or deployment ServiceAccount | Apply the approved Kubernetes configuration |
| kagent controller | Manage workloads according to Agent resources |
| Agent and MCP ServiceAccounts | The API access needed at runtime |

That the GitOps controller can deploy resources does not mean the agent gets those permissions. Check each workload's ServiceAccount separately.

If the MCP server does the Kubernetes lookups, the agent does not need an API token at all:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: diagnostic-agent
  namespace: agents
automountServiceAccountToken: false
```

The agent refers to this ServiceAccount:

```yaml
spec:
  declarative:
    deployment:
      serviceAccountName: diagnostic-agent
```

The MCP server runs under its own ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: diagnostic-mcp
  namespace: tools
automountServiceAccountToken: false
```

The MCP Pod that needs Kubernetes lookups opts into the token explicitly:

```yaml
# part of the MCP Deployment's Pod spec
serviceAccountName: diagnostic-mcp
automountServiceAccountToken: true
```

Grant only the read access needed in the business namespace:

```yaml
# deploy/rbac/diagnostic-reader.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: diagnostic-workload-reader
  namespace: paid-service
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list"]

  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["get", "list"]

  - apiGroups: [""]
    resources: ["pods", "events"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: diagnostic-workload-reader
  namespace: paid-service
subjects:
  - kind: ServiceAccount
    name: diagnostic-mcp
    namespace: tools
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: diagnostic-workload-reader
```

This YAML also goes through PR and CODEOWNERS review and is applied by GitOps. After deployment, real Kubernetes API requests are allowed or denied according to this RBAC.

Don't grant these unless the diagnosis needs them:

- reading Secrets
- `pods/exec`
- `pods/log`
- creating, modifying, or deleting resources
- changing Roles and RoleBindings
- cluster-wide reads

The official Kubernetes guidance also stresses least privilege and namespace-scoped permissions. See [Kubernetes RBAC good practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/).

Even read access needs a review of what data it exposes. A Pod definition can contain environment variables and command arguments, so tools should return only the status fields they need.

Reading every Job in a namespace is also different from reading only one customer's Jobs. Per-order limits need additional checks in the tool or the application.

## 7. Application and database: deploying with GitOps doesn't settle business permissions

Kubernetes ServiceAccounts and RBAC control access to the Kubernetes API. Application APIs and databases apply their own authentication and authorization.

```text
Kubernetes API
  → ServiceAccount + RBAC

Application API
  → API authentication + tenant and order access checks

Database
  → Database account + database permissions
```

If a diagnostics API already exists, the path can be:

```text
Agent
  → MCP tool
  → Diagnostics API
  → Database
```

The diagnostics API compares the requested tenant and order with what the verified caller is allowed to see:

```python
# example checks in an existing diagnostics API
def get_order(caller, tenant_id, order_id):
    require_tenant_access(caller, tenant_id)
    require_order_in_tenant(tenant_id, order_id)

    return read_order(
        tenant_id=tenant_id,
        order_id=order_id,
    )
```

`tenant_id` and `order_id` are what is being looked up. The fact that a model or user supplied those values is no basis for access.

The database can use a dedicated diagnostics account with read access to specific views:

```sql
-- example diagnostics view owned by an administrator
CREATE VIEW diagnostics.order_status AS
SELECT
    id AS order_id,
    status,
    updated_at
FROM public.orders;

GRANT USAGE ON SCHEMA diagnostics
TO diagnostic_reader;

GRANT SELECT ON diagnostics.order_status
TO diagnostic_reader;
```

Don't give the diagnostics account write access to the underlying tables or the right to change views. Also check whether it gains extra permissions through `PUBLIC`, role inheritance, or ownership.

Changes in this area are reviewed in Git too.

| What changes | What to review |
|---|---|
| Diagnostics API code | Tenant and order access checks |
| SQL migrations | Columns exposed in views, database permissions |
| Credential references | Whether the dedicated diagnostics account is used |
| Deployed images | Whether the reviewed code is what runs |

Apply database migrations through your organization's approved migration process. The GitOps controller does not run SQL automatically just because it is in Git.

Linking an order to its Kubernetes Job should also use information the business application manages. Receiving a Job name as a tool argument is no reason to allow access to it.

## 8. A2A: review agent-to-agent connections together with the delegated work's permissions

With A2A, one agent can ask another agent to do work.

```text
Order diagnosis agent A
  → Workload diagnosis agent B
  → Kubernetes lookup tool
```

Here too, separate change time from run time.

| When | What to check |
|---|---|
| Git change review | Which B is A configured to call? |
| Deployment review | Which tools and credentials are connected to B? |
| Runtime | Does B authenticate A's request and check what it is allowed to do? |

A PR that adds an agent-to-agent connection creates a new path for work. Review the receiving agent's tools and permissions along with it.

For example, suppose A has only read-only tools, but B has a Pod restart tool. If A asks B to restart and B does it, you cannot call A read-only just by looking at A's own tool list.

So check:

- Which agents' calls does B accept?
- What operations should A be allowed to request?
- How far does B's data access reach?
- Do the limits still hold when B actually runs its tools?
- Can B in turn ask other agents?

Conceptually, the receiving side checks:

```python
# checks on the A2A receiving side: pseudocode
def receive_task(request):
    caller = authenticate(request)

    require_agent_access(caller, target_agent="workload-agent")
    require_allowed_operation(caller, request.operation)
    require_data_access(caller, request.target)

    return execute_authorized_task(request)
```

It is not enough to check only the initial request and then allow everything when the tool actually runs. The requested scope has to be kept all the way to the real action.

B runs with its own ServiceAccount and tool credentials. Don't assume A's RBAC is inherited by B because A made the call, or that B's stronger permissions are automatically narrowed.

An Agent Card describes capabilities and authentication requirements. Declaring a connection is different from enforcing access.

If you want to pass a delegated identity or apply fine-grained scopes, check that your version and implementation support it. Don't assume controls that aren't supported; start with approved agent-to-agent connections and a limited tool scope.

## 9. Conversations and task results: connect access control with change history

Even with configuration and runtime permissions under control, customer information can leak if results are visible to other users.

So conversations and task results are their own access review:

- Can users read only their own sessions?
- Is a lookup with another user's session ID denied?
- Can someone read results just by knowing an A2A task ID?
- Do authentication and authorization apply when a stream reconnects?
- Are result files and artifact downloads protected?

SSO login alone does not guarantee session isolation. Verify your kagent version's actual API behavior with at least two accounts.

| Test | Expected result |
|---|---|
| User A reads their own session | Allowed |
| User B reads A's session | Denied |
| B calls A's task result endpoint | Denied |
| Stream reconnect without authentication | Denied |
| Result download with expired authentication | Denied |

Keep change history and execution history as separate audit records.

```text
Change history
  → Which PR was approved?
  → Who reviewed it?
  → Which commit and image were deployed?

Execution history
  → Who ran which agent?
  → Which tool looked up which target?
  → Was it allowed or denied?
```

For resources managed by GitOps, you need to be able to trace the applied Git revision. If an agent behaves unexpectedly, you should be able to check the Agent definition, model settings, MCP image, and RBAC that were deployed at the time.

But don't let GitOps sync and drift correction stand in for access control. Even if a direct edit is reverted later, whatever happened before the revert cannot be undone.

So block routine direct edits, and give emergency changes a separate approval and audit process. After an emergency change, bring the desired state in Git and the actual state back in line.

Split pre-production verification into the same paths:

| Area | What to check |
|---|---|
| Change path | Are unapproved merges, direct pushes, and admin API edits blocked? |
| Deployment path | Does GitOps apply the reviewed revision and images? |
| Runtime permissions | Are Secret reads, exec, and change requests from the MCP server actually denied? |
| Business data | Are lookups of other tenants and orders denied? |
| A2A | Can permissions not escalate through another agent? |
| Result access | Are other users' sessions and results protected? |

In running kagent, GitOps controls who approved and deployed which configuration. ServiceAccounts and RBAC control what the workloads running that configuration can do in Kubernetes.

Connect those to permission checks in the MCP server, the application, and the database, plus access control on results, and you get one consistent permission structure from change approval to the actual data lookup.

Next: [Diagnosing OpenCTI with Kagent (4) - Rehearsing Incidents with an LLM Agent](/posts/rehearsing-incidents-with-an-llm-agent/)
