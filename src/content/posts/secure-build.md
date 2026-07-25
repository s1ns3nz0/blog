---
title: Securing Workflows in CI Pipelines - Secure Build
description: Introduce the requirements for secure build and associated tools to secure your build stage in CI/CD pipeline.
pubDatetime: 2026-07-23T12:52:14+09:00
tags:
  - NIST SP 800-204D
  - CI/CD
  - CI/CD Security
  - GitHub Action
  - Supply Chain Security
  - Build
featured: true
---

Today, I'll explain how to meet the requirements of NIST SP 800-204D and secure your build using GitHub Actions and associated tools. You can find the general requirements in Section 5, 'Integrating SSC Security into CI/CD Pipeline' of this document. If you're looking for ways to harden your service's CI/CD pipeline, this article should be helpful to you

I believe these requirements should alsoow be implemented as policies in your organization, in order to strengthen your company's overall services and software supply chain, However, I will focus on technical practices in this post

## Table of contents

## Securing Workflows in CI Pipelines
NIST SP 800-204D says,'The workflows in the CI Pipeline mainly consist of build operations, push/pull operations on repositories (both public and private), software updates, and code commits.

### The overall security goals for the framework used for securely running CI pipelines include
- The capability to support both cloud-native and other types of applications.
- Standard compliant evidence structures, such as metadata and digital signatures
- Support for multiple hardware and software platforms
- Support for infrastructures for generating the evidence(e.g., SBOM generators, Digital signature generators)

## Secure Build
The following tasks are required to obtain SSC security assurance in the build process:
### Specifiy policies regarding the build, including 
- the use of a secure isolated platform, for performing the build and hardening the build servers
- the tools that will be used to perform the build
- the authentication/authorization required for the developers performing the build process
#### Evidence of 'the use of a secure isolated platform, for performing the build and hardening the build servers'
- The build system itself can be an evidence, which should be able to confirm that the tools or processes used are in an isolated environment.
- This provides internal operational assurance

##### Examples: The use of a secure isolated platform, for performing the build and hardening the build servers
- Github-hosted runners: Ephemeral by default, Strong isolation between jobs, No long-lived between runs, Limited customization
	+ Review the supply chain for Github-hosted runners
	+ Use specific version instead of 'latest'	
	```YAML
	jobs:
 	 build:
    	   runs-on: ubuntu-24.04	
	```
- Self-hosted runners: Access internal resources, Use costum tooling or environments, Optimize performance or cost
	+ Security Considerations: Persistence across jobs, Shared state betweem workflows, Network access to internal systems, Higher blast radius if compromised
	+ Self-hosted runners should almost never be used for public repositories on GitHub
	+ Similarly, be cautious when using self-hosted runners on private or internal repositories, as anyone who can fork the repository and open a pull request (generally those with read access to the repository) are able to compromise the self-hosted runnern environment
	+ Organization owners can choose which repositories are allowed to create repository-level self hosted runners
	+ Consider the environment of the self-hosted runner machines
		* What sensetive information resides on the machine configured as a self-hosted runner? (Private SSH keys, API access tokens, among others)
		* Does the machine have network access to sensitive services? (Azure or AWS metadata services)
	+ Use one runner per job
	+ Use runner groups as security boundaries
	+ Seperate runner fleets by privilege
	+ Run the agent as an unprivileged account
	+ Keep credentials off the runnenr image
	+ Restricted network access
	+ Started from a hardened immutable image
	+ Do not trust cleanup scripts as isolation
	+ Retain logs outside the runner
	+ Use distinct labels carefully
	> Treate every workflow job as potentailly hostile, and treat a self-hosted runner as compromised after executing it
	```YAML
	# Recommended Architecture: GitHub Action Job > Restricted Runner Group > Fresh Epheral VM or Pod
	jobs
	jobs:
	  build:
	    runs-on:
	      group: private-ephemeral-builders
	      labels: [self-hosted, linux, x64, build]
	```
- Github Action Runner Controller
	+ Ephemeral runners and Pod isolation in Kubernetes
	+ It enables for users who must use self-hosted runner to operate ephemeral runner in Kubernetes environments
	+ [Web Page](https://www.systemshardening.com/articles/cicd/actions-runner-controller-security/)

- Hardening the runner
	+ This could be an agent example of 'Enforce those build policies using techniques such as an agent and policy enforcement engine'
	+ Use tools for hardening
		- [step-security/harden-runner](https://github.com/step-security/harden-runner/pkgs/container/harden-runner): A third-party Github action that adds runtime monitoring and outbound-network controls to a GitHub Actions job. 
		- [bullfrogsec/bullfrog](https://bullfrogsec.com/?utm_source=chatgpt.com)
		- Starts with 'audit' mode and intensify your workflow after review them
		```YAML
		jobs:
		  build:
		    runs-on: ubuntu-24.04

		    permissions:
		      contents: read

		    steps:
		      - name: Harden runner
		        uses: step-security/harden-runner@f808768d1510423e83855289c910610ca9b43176 # v2.17.0
		        with:
		          egress-policy: audit

		```
		```YAML
		- name: Harden runner
		  uses: step-security/harden-runner@<FULL_COMMIT_SHA>
		  with:
		    egress-policy: block
		    allowed-endpoints: |
		      github.com:443
		      api.github.com:443
		      objects.githubusercontent.com:443
		      registry.npmjs.org:443
		```
#### Evidence of 'the tools that will be used to perform the build'
- A common technique for facilitating the second task is to wrap commands from a CI tool with capabilities to gather evidence and ultimately create an evidence trail of the entire SDLC.


#### Evidence of 'the authentication/authorization required for the developers performing the build process'
- The build system itself can be an evidence, which should be able to confirm that the tools or processes used are in an isolated environment.
- This provide s internal operational assurance

##### Examples of 'the authentication/authorization required for the developers performing the build process'
- Github supports enterprise authentication through SAML or OIDC SSO, including IdP-managed identities and conditional-access integration
- Authentication requirements
	+ Use a uniquely assigned individual identity; shared build accounts are prohibited
		* Integrate github accounts with IdP
		* [Github provides the way how the enterprise manage the lifecycle and authentication of users on GitHub](https://docs.github.com/en/enterprise-cloud@latest/admin/concepts/identity-and-access-management/enterprise-managed-users?utm_source=chatgpt.com)
		* Don't use shared account, and tokens(PAT, API keys, and so on)
	+ Authenticate through the organization's approved identity provider using SSO
		* Integrate github accounts with IdP
		* [Configuring authentication for Enterprise Managed Users](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/configuring-authentication-for-enterprise-managed-users?utm_source=chatgpt.com)
	+ Use multi-factor authentication, preferably phishing-resistant authenticatiors such as passkeys or hardware security keys
		* Highly recommended to set MFA by using phishing-reistant authenticators through Enterprise IdP
		* [Github provides many functions to apply MFA to accounts through various methods](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa)
		* For management and audit purpose, Enforce MFA via IdP conditional access to other services
	+ Reauthenticate before sensitive actions such as initiating a release build, approving a release, or changing build credentials
		* [Use sudo mode for sensitive actions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/sudo-mode?utm_source=chatgpt.com)
		* [Leverage IdP's conditional accesss with Github repository environments protection rules such as reuqired reviewers, wait timer, and other custom rules](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
		```YAML
		jobs:
		  build-production:
		    environment: protected-build
		    runs-on: ubuntu-latest
		```
	+ Use managed identities whose access can be centrally provisioned, suspended, and revoked
		* [Use your organization IdP](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/provisioning-user-accounts-with-scim/deprovisioning-and-reinstating-users?utm_source=chatgpt.com)
	+ Not use personal access tokens, passwords, SSH keys, or other long-lived credentials as their primary build identity where federated authentication is available.
		* [Setting a personal access token policy for your organization](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization?utm_source=chatgpt.com)
		* Restricting access, enforcing a maximum lifetime policy, enforcing an approval policy for fine-grained
		* Do not maintain shared SSH private key
- Authorization requirements
	+ Be assigned to named identities, not shared accounts.
		* Manage github accounts by IdP and not maintain shared accounts
	+ Be based on an approved organizational role
		* [Github provides organizational role to Organization users](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/about-organizations)
		* Team consists of organization, connect the teams to your IdP
		* [Giving permissions to your team about each repository through repository role](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
	+ Follow least privilege
		* The core principle is removing default permissions and grant required permissions on each job
		* [Grant permissions at the 'job' level instead of the 'workflow' level](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax?apiVersion=2022-11-28&utm_source=chatgpt.com#permissions)
		```YAML
		name: Build and publish
		on:
		  push:
		    branches: [main]

		permissions: {}

		jobs:
		  build:
		    permissions:
		      contents: read

		    runs-on: ubuntu-latest

		    steps:
		      - uses: actions/checkout@v4

		      - run: |
			  ./build.sh
			  ./test.sh

		  publish:
		    needs: build

		    permissions:
		      contents: read
		      packages: write

		    runs-on: ubuntu-latest

		    steps:
		      - uses: actions/checkout@v4

		      - name: Publish package
			run: ./publish.sh	
		```
	+ Distinguish between initiating, modifying, approving, and releaseing a build
		* Use repository 'Environments' to seperate permissions depending on the environments such as build, deployment
	+ Prevent developers from granting themselves additonal build authority
		* Properly manage members not to modify their permissions, teams, and identities through IdP/Github Organizations
	+ Prevent an individual from approving their own privileged or release build
		* Properly manage members not to modify their permissions, teams, and identities through IdP/Github Organizations
	+ Require independent authorization for production or release builds
		* Use repository 'Environments' to seperate permissions depending on the environments such as build, deployment
		* Set required reviewers and use prevent self-review
	+ Be time-limited for temparary or elevated build privileges
		* Use repository 'Environments' to seperate permissions depending do the environments such as build, deployment
		* Integrate Github OIDC with Cloud IAM session TTL
		* Use IdP to provide a user with temporarily privileged permission
		* Use Github App Token
		```YAML
		- name: Generate App token (1시간 유효)
		  id: app-token                    # ← ③에서 참조할 이름표
		  uses: actions/create-github-app-token@bcd2ba49... # v3.2.0
		  with:
		    app-id: ${{ vars.DEPLOY_APP_ID }}              # ← ① vars
		    private-key: ${{ secrets.DEPLOY_APP_PRIVATE_KEY }} # ← ① secrets
		    repositories: my-deploy-manifests               # ← ② Reduce the Scope
		    permission-contents: write                      # ← ② Reduce the Scope
		```
	+ Be revoked immediately when employment, team membership, or responsibilities changes
		* Deprovisioning and reinstating users with SCIM
### Enforce those build policies using techniques such as an agent and policy enforcement engine.
- A common technique for facilitating the second task is to wrap commands from a CI tools with capabilities to gather evidence and ultimately create an evidence trail of the entire SDLC
- Uses Policy as Code solutions such as OPA, Confest, Kyverno, Sentinel, Cedar

#### Examples of build policies usages - OPA
- Users can apply their custom rules to their environments with OPA
- Workflow Static Analysis : Convert github actino YAML file to JSON, analyze them with OPA
	- These policy engine doesn't ensure their signature and attestation, it only verify whether workflow configurations meet the rules
	- Example repository structure
	```
	repository/
	├── .github/
	│   └── workflows/
	│       ├── build.yml # workflow 
	│       └── policy-check.yml # Seperate policy analysis workflow from build.yaml
	│
	└── policy/
	    └── github_actions/
		├── workflow.rego
		└── workflow_test.rego
	``` 
	- Example 
	```rego
	# policy/github_actions/workflow.rego
	package main
	
	deny[msg] {
	  step := input.jobs[_].steps[_]
	  uses := step.uses
	  not regex.match(`match(`@[a-f0-9]{40}$`, uses)
	  msg := sprintf("Not using SHA: %s", [uses])
	}	
	```
	```YAML
	# .github/workflow/build.yml
	policy-check:
	  runs-on: ubuntu-24.04
	  steps:
	    - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0
	      with: { persist-credentials: false }
	    - uses: open-policy-agent/setup-opa@<SHA>
	    - run: |
		opa exec --decision main/deny --bundle policy/ .github/workflows/*.yml
	- Policy should be verified through spereate workflow
	```
	# .github/workflows/policy-check.yml

	name: Workflow policy check

	on:
	  pull_request:
	    paths:
	      - ".github/workflows/**"
	      - "policy/**"

	permissions:
	  contents: read

	jobs:
	  static-policy-check:
	    runs-on: ubuntu-24.04
	    timeout-minutes: 10

	    steps:
	      - name: Checkout
		uses: actions/checkout@FULL_40_CHARACTER_COMMIT_SHA
		with:
		  persist-credentials: false

	      - name: Validate Rego syntax
		run: |
		  set -Eeuo pipefail

		  opa check \
		    --strict \
		    policy/github_actions

	      - name: Run Rego tests
		run: |
		  set -Eeuo pipefail

		  opa test \
		    policy/github_actions \
		    --verbose \
		    --fail-on-empty

	      - name: Check GitHub Actions workflows
		run: |
		  set -Eeuo pipefail

		  conftest test \
		    --output github \
		    --policy policy/github_actions \
		    .github/workflows/*.yml \
		    .github/workflows/*.yaml
	```
	- Divide severity levels into deny, warn, and violation to allow OPA to land softly within the workflow
- Verify Build Context Policy
	+ Convert the GitHub Actions context at the time of execution into JSON and deliver it to OPA
	+ Github Action context -> Create a standarized build-context.json -> Validate OPA Rego policy -> allo/deny
	+ Build Context: Context provided by Github + Trusted Metadata managed by Organization
		* Repository = `github.repository`
		* commit SHA = `github.sha`
		* branch/tag = `github.ref`
		* trigger event = `github.event_name`
		* workflow identity/revision = `github.workflow_ref`
		* runner OS = `runner.os`
		* deployment environment` = `environment:`
		* manual input = `workflow_dispatch` inputs
		* [Context reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts?ref=jdno.dev&utm_source=chatgpt.com)
- Verify Build Results: Whether the build results are accordance with organization policies
	+ Standarize Unit Test, Coverage Tool, Vulnerability Scanner, SBOM, Artifactor Builder for OPA to validate whether workflow can be proceeded
	+ Compare the results to organization's SW QA tests, security baselines, and License management
	+ [Artifact promotion decision](https://noopsschool.com/blog/artifact-promotion/)
	+ Detailed attestation requirements are covered in the next section
### Ensure the concurrent generation of evidence for build attestation to demonstrate compliance with secure build processes during the time of software delivery
- In the context of "concurrent generation of evidence", the evidence generated should be enabled by a process with a higher level of trust or isolation than the build itself to protect against tampering. 
- The generation of such evidence requires verification within the build as it occurs
- [The attestation for a build consists of the following components](https://docs.github.com/en/actions/concepts/security/artifact-attestations?utm_source=chatgpt.com)
- Github action uses [Sigstore](https://openssf.org/blog/2023/10/03/running-sigstore-as-a-managed-service-a-tour-of-sigstores-public-good-instance/)
- When to generate attestations
	+ You should sign:
		* Software you are releasing that you expect people to run `gh atteestation verify ...` on.
		* Binaries people will un, packages people will download, or manifests that include hashes of detailed contents
	+ You should not sign:
		* Frequent builds that are jus for automated testing
		* Individual files like source code, documentation files, or embedded images
#### Evidence of 'concurrent generation of evidence for build attestation to demonstrate compliance with secure build processes'
- Leverage '[in-toto](https://slsa.dev/blog/2023/05/in-toto-and-slsa)' framework predicate type, integrate 'in-toto Statement' with 'Custom Predicate'
- The software was built by authorized systems using authorized tools(e.g., infrastructure for each step) in the correct sequence of steps
- There is no evidence of potential tampering or malicious activity
- Environment attestation
	+ Environment attestation involves an inventory of the system when the CI process happens and generally refers to the platform on which the build is run.
	+ The components of the platform(e.g., compiler, interpreter) must be hardened, isolated, and secure
	+ Considers below requirements
		* Retrospective search capability
		* Security Gate Usability
		* Re-validation Capability
- Process attestation
	+ Process attestation pertains to the computer programs that transformed the original source code or materials into an artifact(e.g., compilers, packaging tools) and/or the programs that performed testing on that software
- Materials attestation
	+ Materials attestation pertains to any raw data and can include configuration, source code, another data(e.g., dependencies)
- Artifacts attestation
	+ An artifact is the result or outcome of a CI process

#### Examples of 'concurrent generation of evidence for build attestation to demonstrate compliance with secure build processes'

##### Gating grades
 
| Grade | Meaning | Role |
|---|---|---|
| 🟢 | Consumer can **independently re-verify**. Holds without trusting the producer | Sufficient on its own to block |
| 🟡 | Only meaningful if the producer's workflow wasn't compromised | Supporting evidence |
| 🔴 | Self-asserted, or unprovable from inside the job | Lookup only — never gate on it |
 
A signature attests that **"this workflow wrote this content."** It says nothing about whether the content is true.
 
```bash
# Even if nothing was actually blocked
echo '{"networkEgress":"blocked"}' > predicate.json
# the signature attaches cleanly and verification passes
```
 
🟢 items escape this problem, because the consumer recomputes the value and compares. Record the sha256 of `go.sum` and a consumer can check out that commit, hash the file themselves, and catch a lie on the spot.
 
Two caveats:
 
- **🟡 still earns its place.** Forging a 🟡 value means editing the workflow file, and that edit lands in commit history and in the provenance. It raises the cost of an attack and leaves a trace.
- **A 🟢 item is only 🟢 if you actually recompute it.** Record a digest but never write the comparison code and it is effectively 🟡. This is where implementations leak most often.
---

##### Environment
 
> Inventory of the system at CI time. Platform components must be hardened, isolated, and secure.
 
| Group | What to collect | Source | Gate |
|---|---|---|---|
| Runner | Hosted vs. self-hosted | `$RUNNER_ENVIRONMENT` | 🟡 |
| Runner | Image family + version | `$ImageOS`, `$ImageVersion` | 🟡 |
| Runner | Kernel, architecture | `uname -r`, `$RUNNER_ARCH` | 🟡 |
| Runner | Running inside a container? | `/.dockerenv`, `/proc/1/cgroup` | 🟡 |
| Runner | **Ephemerality, clean workspace** | — | 🔴 |
| Components | **Compiler binary digest** | `sha256sum $(command -v go)` | 🟢 |
| Components | Compiler / interpreter version | `go env -json` | 🟡 |
| Components | OS package list digest | `dpkg -l \| sha256sum` | 🟡 |
| Hardening | Declared `permissions:` block | Parse the workflow file | 🟢 |
| Hardening | **Names** of injected secrets | Parse the workflow file | 🟢 |
| Hardening | Egress control (declared / observed) | Config value / eBPF trace | 🔴 / 🟡 |
 
- **Why the compiler digest is 🟢:** it can be compared against the published hash of the official distribution. It's a minimum defense against a trojaned compiler. This only holds if your organization maintains the reference hash list.
- `permissions:` and secret names are 🟢 for the same underlying reason: **the consumer can parse the workflow file at that commit and compare.** Anything recomputable from source is 🟢.
- Record secret **names only**. Values get signed and published permanently.
- **Why isolation claims are 🔴:** a job cannot prove its own isolation from inside itself. A compromised runner is perfectly capable of writing "I am ephemeral."
---

##### Process

> Programs that transformed source into artifacts, and programs that tested them. Populating this is explicitly "best effort."
 
| Group | What to collect | Gate |
|---|---|---|
| Tool identity | Binary digest / container image digest | 🟢 |
| Tool identity | Name, version string | 🟡 |
| Invocation | **Full argv** | 🟡 |
| Invocation | Behavior-affecting env vars (`GOFLAGS`, `CGO_ENABLED`, `CC`, `LDFLAGS`) | 🟡 |
| Invocation | Exit code, start/end timestamps | 🟡 |
| Config | Config file paths + digests (`.golangci.yml`, `semgrep.yml`) | 🟢 |
| Config | Plugin / extension list | 🟡 |
 
- **A digest is 🟢; a version string is 🟡.** The same fact lands in different grades depending on how you express it. That's the central pattern of this whole post.
- Collect env vars via an **allowlist**. Dumping all of `env` will sweep in secrets.
- Config file digests catch **a scanner ruleset being quietly weakened**.
- Go binaries embed build info, so a consumer can run `go version -m` on the artifact. That promotes build flags to 🟢. **It's worth checking whether your runtime stamps build metadata into the output.**
--- 

##### Materials
 
> Raw data of any kind: configuration, source code, dependencies.
 
| Group | What to collect | Gate |
|---|---|---|
| Source | Repo URI + commit SHA, submodule SHAs | 🟢 |
| Source | Commit signature verification status | 🟢 |
| Source | **Clean working tree?** | 🟡 |
| Dependencies | Lockfile digests | 🟢 |
| Dependencies | Resolved dependency list (purl + version + digest) | 🟢 |
| Dependencies | Base container image ref + digest | 🟢 |
| Dependencies | Registry URLs, mirror usage | 🟡 |
| Hidden inputs | External assets downloaded during the build + digests | 🟢 |
| Hidden inputs | Artifacts handed over from another step + digests | 🟢 |
| Hidden inputs | Digest of the workflow file itself | 🟢 |
| Hidden inputs | **Cache restore hit + cache key** | 🟡 |
| Hidden inputs | **Integrity of the cache contents** | 🔴 |
 
- **Clean working tree** fills a gap SLSA leaves open. SLSA records only the commit SHA, so a build script that `sed`s the source right before compiling goes unnoticed. The value itself can't be re-derived, so it stays 🟡. **Collect it before the build** — afterwards the tree is always dirty from build output.
- **Cache is the biggest hole.** A restored `node_modules` or `~/.cache/go-build` **bypasses lockfile verification entirely.** The lockfile hash can match while poisoned compilation output sits in the cache and gets used as-is. Turning the cache off for release builds is the safe default; if you keep it on, that fact needs to be in the evidence.
- The dependency list is effectively an SBOM. Don't hand-roll it — reference the digest of a Syft or CycloneDX output.
---

##### Artifacts
 
> The output of a step, final or intermediate. Scan results count.
 
| Group | What to collect | Gate |
|---|---|---|
| Output | Name + sha256 + size | 🟢 |
| Intermediate | Container layer / multi-stage image digests | 🟢 |
| Intermediate | Object files, static library digests | 🟢 |
| Byproducts | SBOM file digest | 🟢 |
| Byproducts | Scan result digests (SAST / SCA / secrets) | 🟢 |
| Byproducts | Test report, build log digests | 🟢 |
| Linkage | Reference to the producing process step | 🟡 |
 
- **Almost everything here is 🟢**, because a consumer holding the file can just hash it. This is the strongest gating surface of the four, and **starting here gives the best return for the effort.**
- But a digest only proves **the scan result exists**. Whether **the scan passed** requires the consumer to parse the file's contents. Trusting a "passed" summary the producer wrote for you drops the whole thing to 🔴.
---
 

##### Drawing the boundaries
 
Separating Process from Materials is hard, and the source definition admits as much: a file a tool reads may **shape how the transformation behaves**, or it may **end up inside the output**.
 
| Question | Category |
|---|---|
| Do its contents end up **in the output**? | Materials |
| Does it **determine how the transformation runs**? | Process |
| Both? | **Record it in both** |
 
Don't force a single choice. Recording twice beats being unable to answer.
 
| File | Category |
|---|---|
| `Dockerfile`, workflow YAML | **Both** |
| `.golangci.yml`, `semgrep.yml`, linker scripts, `.env` | Process |
| `go.mod`, `go.sum`, code generation templates | Materials |
 
**Two more rulings**
 
- **The compiler appears in both Environment and Process** — and it should. The roles differ. Environment is "what is installed" (inventory); Process is "what was invoked" (a call). When it's the same binary, Process should **reference** the Environment entry rather than copying the digest. Two copies means ambiguity the moment they disagree.
- **SBOM** — the file is an Artifact (byproduct); the dependency set it describes is Materials. Materials references the file's digest.
---

##### Linking the steps
 
```
[checkout] Artifacts: source tree (D1)
              ↓ D1
[build]    Materials: D1 + go.sum + base image
           Process:   go build (digest) + argv
           Artifacts: my-app (D2), build log (D3)
              ↓ D2
[scan]     Materials: D2
           Process:   trivy (digest) + DB version
           Artifacts: scan.sarif (D4)
              ↓ D2, D4
[release]  Artifacts: Release (D2)
```
 
**Digests are the glue between steps.** Without that linkage a consumer can't answer this:
 
> "Does a scan result exist for the binary I'm about to deploy — and did that scan target **this exact digest**?"
 
Recording only that a scan ran cannot answer it. The scanned binary and the shipped binary may not be the same file, and in practice that happens often. Note that this linkage check is itself **🟢**.
 
---
 
##### Limits
 
| Claim | Provable from inside the job? | Alternative |
|---|---|---|
| The compiler was genuine | ✅ digest comparison | — |
| Dependencies match the lockfile | ✅ recompute | — |
| The artifact matches what was scanned | ✅ digest comparison | — |
| The runner was ephemeral | ❌ | Platform control-plane logs |
| The network was blocked | ❌ | eBPF runtime monitor |
| The platform was hardened | ❌ | External audit / TEE |
 
**Much of Environment attestation is a record, not evidence.** When a CVE lands against Go 1.22.3 and below, figuring out which of your 500 internal artifacts are affected works fine on 🟡 data alone. Blocking a deploy on it, however, proves nothing.
 
To move 🟡 closer to 🟢, **push the collection logic into a trusted builder** — a reusable workflow whose script the calling repo cannot modify. The signing identity moves there too. That separation, **between whoever defines the build and whoever signs it**, is also the core requirement of SLSA Build L3.
 
---
 
##### Wrapping up
 
**Build your blocking gates on 🟢** — and write the code that actually recomputes. A 🟢 you never compare is a 🟡.
**Layer 🟡 on top, but never alone.** The cost it imposes on an attacker is real.
**Put 🔴 on a dashboard, not in a gate.** Unprovable isn't worthless. It just has a different job.
 
A reasonable rollout order: **Artifacts → Materials digests → Process digests → Environment → trusted builder.** Run the consumer gate in observe-only mode for a week or two before enforcing. Flip it on immediately and every existing artifact fails at once, and shipping stops.
 
---

- To use cosign and attest, 'write' and 'id-token' permissions are required
- [cosign](https://github.com/sigstore/cosign) is a keyless signature system based on OIDC
```YAML
name: build-attest

on:
  workflow_dispatch:     # 버튼으로 아무 때나 실행

permissions:
  contents: read
  id-token: write        # Sigstore keyless 서명 (필수)

jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22.5'

      - uses: sigstore/cosign-installer@v3
        with:
          cosign-release: 'v2.4.1'

      # ── 빌드 ────────────────────────────────
      - name: Build
        run: |
          set -euo pipefail
          mkdir -p dist
          CGO_ENABLED=0 go build -trimpath -o dist/my-app ./cmd/my-app

      # ── predicate 생성 ──────────────────────
      - name: Create predicate
        run: |
          set -euo pipefail
          jq -n \
            --arg image  "${ImageOS:-unknown}" \
            --arg kernel "$(uname -r)" \
            --arg go     "$(go env GOVERSION)" \
            --arg commit "$GITHUB_SHA" \
            --arg ts     "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '{
              runner:      { image: $image, kernel: $kernel },
              toolchain:   { go: $go, buildFlags: "-trimpath" },
              source:      { commit: $commit },
              collectedAt: $ts
            }' > predicate.json
          jq . predicate.json

      # ── 서명 ────────────────────────────────
      - name: Attest
        run: |
          set -euo pipefail
          cosign attest-blob dist/my-app \
            --predicate predicate.json \
            --type https://myorg.dev/attestations/build-env/v1 \
            --bundle my-app.sigstore.json \
            --yes

      # ── 결과 확인 ───────────────────────────
      - name: Inspect bundle
        run: |
          set -euo pipefail
          echo "── in-toto Statement ──"
          jq -r '.dsseEnvelope.payload' my-app.sigstore.json | base64 -d | jq .

      - uses: actions/upload-artifact@v4
        with:
          name: attestation
          path: |
            dist/my-app
            my-app.sigstore.json
```
