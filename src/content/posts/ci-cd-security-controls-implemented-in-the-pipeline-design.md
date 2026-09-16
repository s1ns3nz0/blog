---
title: "CI/CD Security Controls and Implementation in the Pipeline Design"
description: "A technical overview of the CI/CD security controls implemented across the pipeline design, from token permissions to release signing, paired with concrete threat-mapped implementation detail."
pubDatetime: 2026-09-16T20:40:00+09:00
tags:
  - CI/CD
  - CI/CD Security
  - GitHub Actions
  - Policy as Code
  - Supply Chain Security
  - Hoodi
  - Validator
  - Security
---

**Status:** repository-defined control description.
**Scope:** GitHub Actions workflows and their referenced CI/release scripts in this repository.
**Assurance boundary:** this document describes controls present in source. It is not evidence that GitHub branch protection, environment approvals, AWS IAM, ECR, S3 Object Lock, or a workflow run is currently configured or effective.

This post combines the control-level overview with its companion implementation document, which maps each control to the concrete workflow/script paths and representative code that enforce it.

## Control objectives

The pipeline is designed to:

1. prevent untrusted pull-request source from gaining write-capable workflow authority;
2. require pinned, reproducible, and scan-verified release inputs;
3. keep cloud publication privileges narrowly scoped and short lived;
4. bind policy decisions, release artifacts, signatures, SBOMs, and evidence to exact immutable subjects; and
5. retain non-secret security evidence while minimizing collection of raw workspace and credential data.

## Control inventory

| ID | Control | Implemented by | Enforcement/evidence |
|---|---|---|---|
| CICD-01 | Default-deny GitHub token permissions | All workflow root `permissions` blocks | Workflows grant only job-level permissions required for the task. |
| CICD-02 | Immutable GitHub Actions dependencies | `.github/workflows/*.yml` | Actions are pinned to full commit SHAs. |
| CICD-03 | Checkout credential containment | CI workflows | `actions/checkout` uses `persist-credentials: false`. |
| CICD-04 | PR/source trust separation | `evidence-gate.yml` | Trusted control-plane code is checked out from the trusted workflow SHA; PR/base trees are treated as data. |
| CICD-05 | Exact-SHA evidence binding | `evidence-gate.yml`, `resolve-pr-evidence-context.sh` | The gate resolves and validates the current PR head before publishing a named check. |
| CICD-06 | Fail-closed quality/scanner gates | `continuous-integration.yml` | Aggregate jobs require dependencies to be `success`; cancelled/skipped/failed work does not become a passing gate. |
| CICD-07 | Pinned scanner and Terraform toolchains | CI/evidence workflows | Scanner and Terraform containers use immutable OCI digests. |
| CICD-08 | Isolated scanner execution | `continuous-integration.yml` | Selected tests run in read-only, network-disabled containers with a constrained tmpfs. |
| CICD-09 | Terraform offline validation | `run-terraform-ci.sh`, CI | Validation uses a pinned container and contract fixtures rather than a live plan/apply. |
| CICD-10 | Policy-as-code admission | `policy/*.rego`, OPA workflows | Normalized evidence is evaluated by a pinned OPA setup; blocking decisions fail the gate. |
| CICD-11 | Controlled evidence publication | `normalize-evidence.sh`, `publish-evidence.sh` | The gate uploads normalized JSON/SARIF and bound cache context, not the working tree. |
| CICD-12 | Evidence retention limits | CI workflows | Security evidence is retained for 30 days; PR policy evidence/posture evidence use bounded 90-day retention where configured. |
| CICD-13 | Review freshness | `review-signal.yml`, `evidence-gate.yml` | Review refresh validates evidence provenance, subject/head/base binding, and age before re-evaluation. |
| CICD-14 | Secret and script-quality checks | CI quality job | Pinned policy tools, ShellCheck, DevSecOps red-team contracts, and release-boundary tests run before quality passes. |
| CICD-15 | Immutable image publication evidence | `image-publish.yml`, `test-ci-image-attestation.py` | Publication is bound to exact image digest, SBOM, provenance, scan evidence, and signature/attestation contracts. |
| CICD-16 | Publisher-role isolation | Terraform/IAM contracts and publisher tests | Separate publishers are tested for digest/repository-scoped authority and denial before registry login/promotion. |
| CICD-17 | GitHub OIDC, not long-lived cloud keys | `private-ecr-mirror.yml` | Publication/mirror jobs request `id-token: write` only where needed and assume deployment-scoped cloud roles. |
| CICD-18 | Protected release bundle construction | `build-release-bundle.sh`, `release-bundle.yml` | A deterministic tarball is assembled only from an allowlist of tracked paths; secrets, tfstate, tfvars, keystores, plans, and keys are excluded. |
| CICD-19 | Release reproducibility and SBOM binding | release bundle and reproducibility tests | Bundle digest, SBOM, and selected source revision are cross-checked before release acceptance. |
| CICD-20 | Detached Cosign integrity checks | release/evidence scripts | Pinned Cosign tooling signs and verifies blobs; tamper-rejection tests cover the detached signature path. |
| CICD-21 | Immutable evidence archive boundary | `evidence-archive.yml`, archive contracts | CI archive contracts require dedicated immutable S3 evidence handling and signed manifests. |
| CICD-22 | Repository posture monitoring | `repository-posture.yml` | Scheduled/main-triggered OpenSSF Scorecard produces SARIF plus normalized posture evidence. |
| CICD-23 | Concurrency control | CI/evidence workflows | Runs for the same ref/PR evidence target are grouped; stale CI runs are cancelled where configured. |
| CICD-24 | No production deployment in ordinary CI | `continuous-integration.yml` | CI comments, permissions, and commands constrain normal validation to offline/mocked/contract execution. |

## Workflow controls

### CI (`continuous-integration.yml`)

CI runs on pull requests and pushes to `main`. Its workflow-level token is `contents: read`. Checkouts do not persist credentials. The quality job runs static, policy, contract, recovery, artifact-authority, release-reproducibility, SBOM, attestation, cleanup, and installer-boundary tests. The Terraform job uses a digest-pinned validation image and does not execute a live AWS apply. The scanner job mounts the workspace read-only and writes only to its dedicated evidence directory; its isolated Vault recovery test runs with `--network none`, a read-only filesystem, and a restricted tmpfs.

The `quality` and `scanners` aggregate jobs use `if: always()` but explicitly require all upstream results to equal `success`. This prevents an upstream cancellation, skip, or failure from producing a green compatibility check.

### Evidence gate (`evidence-gate.yml`)

The policy gate is triggered from completed CI/review-signal workflows. This is a sensitive `workflow_run` design, so it separates trusted control code from untrusted PR content:

- the event resolver and policy scripts are fetched from the trusted workflow revision;
- PR and base checkouts are separate untrusted input directories;
- scanner-policy replacement attempts are rejected before collection;
- scanner and Terraform containers are digest-pinned;
- the current PR head, base SHA, and trusted workflow SHA are bound into collected evidence;
- OPA evaluates normalized evidence; outputs are published even on rejection; and
- the published check targets the exact PR head SHA.

The threat model records a residual `workflow_run` risk (TM-008) because this class can be dangerous even with these constraints. This is a tracked, time-bounded risk acceptance, not a claim that the trigger is intrinsically safe.

### Private ECR mirror (`private-ecr-mirror.yml`)

Mirror jobs use read-only repository access plus OIDC only (`id-token: write`) and run in named GitHub Environments. The corresponding contracts restrict source repositories, digest identity, destination repositories, and role policy scope. These jobs are intentionally distinct from regular CI so image movement does not inherit broad test workflow authority.

### Release Images and Release Bundle (`image-publish.yml`, `release-bundle.yml`)

Release publication uses separate publication paths and validates image/archive subjects before promotion. The deterministic bundle builder reads a selected Git revision, materializes only the allowlisted release boundary, excludes operator-local/secret-bearing patterns, renders deployment inputs deterministically, and binds the result to a manifest and SBOM. Publication-record validation remains mandatory when a release selects first-party published artifacts; a public checkout does not fabricate those records.

### CI Evidence Archive (`evidence-archive.yml`)

Archive processing is separated from the PR quality path. Archive contracts require bounded, non-secret evidence inputs, signed manifest handling, and the dedicated immutable evidence-storage boundary. Raw scanner output, credentials, and arbitrary hidden workspace files are not intended archive inputs.

### CI Repository Posture (`repository-posture.yml`)

The posture workflow runs on `main`, weekly, or manual dispatch. It uses explicit empty default permissions, then grants Scorecard only `contents: read`, `security-events: write`, and `id-token: write`. Its checkout has no persisted credentials. Scorecard SARIF is uploaded through a pinned CodeQL action; the workflow also produces normalized posture evidence with 90-day retention.

## Threat-mapped implementation

Each control above maps to a specific threat and a concrete enforcement path. This is where the design gets tested against the failure it exists to prevent.

### 1. Least privilege and token containment

**Threat:** CI tokens or AWS identities are reused outside their approved task.

**Implementation:** `continuous-integration.yml` starts with read-only access:

```yaml
permissions:
  contents: read
```

`security-scans` adds only `packages: read`; the evidence-gate job alone gets `checks: write`; publishing jobs are the limited exception. Each checkout sets:

```yaml
with:
  persist-credentials: false
```

**Enforcement:** `scripts/ci/test-devsecops-redteam.sh`, `scripts/ci/test-repository-posture-contract.sh`.

### 2. Immutable CI dependencies

**Threat:** a mutable action/container changes after review.

**Implementation:** workflow actions use full Git commit SHAs; scanner/Terraform/release tools use OCI digests, for example:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
SCANNER_IMAGE: ghcr.io/s1ns3nz0/node-operator/security-scanners@sha256:b224...
```

`install-validator-signing-fence-release-tools.sh` checksum-verifies the Cosign binary before use.

**Enforcement:** scanner/toolchain release and CI-security-evidence contracts.

### 3. Untrusted PR isolation

**Threat:** contributor-controlled PR code executes in a workflow that writes required checks.

**Implementation:** `.github/workflows/evidence-gate.yml` checks out trusted gate code and PR source separately:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
  with:
    ref: ${{ steps.context.outputs.trusted_sha }}
    persist-credentials: false
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
  with:
    ref: ${{ env.SUBJECT_SHA }}
    path: .pr-source
    persist-credentials: false
```

The trusted workflow invokes `scripts/ci/workflows/reject-scanner-policy-replacement.sh` before collection. `collect-head-security.sh` and `collect-trusted-terraform.sh` run from the trusted checkout.

**Residual risk:** `workflow_run` remains a recorded risk (TM-008 in `THREAT-MODEL.md`); this is not claimed as fully eliminated.

### 4. Exact-SHA policy gate

**Threat:** decisions are published against an old commit, wrong PR, or a failed upstream run.

**Implementation:** event context resolution binds the current PR head, base, and trusted workflow revision. The check publisher receives the exact subject:

```bash
scripts/ci/publish-pr-evidence-check.sh \
  "$SUBJECT_SHA" "$EVIDENCE_ROOT/published/decision.json" "$DETAILS_URL"
```

OPA may complete to publish denial evidence, then `verify-policy-decision.sh` fails the gate for blocking decisions. Review refresh revalidates evidence age, head/base, and provenance.

### 5. Scanner and Terraform containment

**Threat:** scanning alters source, reaches arbitrary network targets, or applies infrastructure.

**Implementation:** a recovery-boundary scan runs with no network and read-only mounts:

```yaml
docker run --rm --network none --read-only
  --tmpfs /tmp:rw,noexec,nosuid,nodev
  --volume "$GITHUB_WORKSPACE:/workspace:ro"
```

Terraform validation uses a digest-pinned container and validation/contract commands, not a live `terraform apply`. Scanner output is written only to `EVIDENCE_ROOT`, which is the sole uploaded path.

### 6. Build/publish separation and image evidence

**Threat:** unreviewed or substituted image archives are published.

**Implementation:** `image-publish.yml` separates read-only build jobs from main-only publisher jobs:

```yaml
if: github.ref == 'refs/heads/main' &&
    needs.select.outputs.scanner == 'true' &&
    needs.scanner-build.result == 'success'
permissions:
  contents: read
  packages: write
  id-token: write
```

Build jobs upload named archives with input hashes and SBOMs. Publishers download the same-run named artifact, validate inputs, sign/publish it, and upload signature evidence. Fence publishing additionally requires the reusable SAST/DAST workflow.

### 7. Signing-fence security checks

**Threat:** signing-fence code is published without static and behavioral testing.

**Implementation:** `fence-security.yml` has `contents: read` only and runs:

```yaml
go test ./cmd/validator-signing-fence
bash scripts/ci/test-fence-security-sast.sh
scripts/ci/run-fence-security-sast.sh "$RUNNER_TEMP/fence-security/sast"
scripts/ci/run-fence-security-dast.sh "$RUNNER_TEMP/fence-security/dast"
```

DAST runs against a local process, not EKS. Report artifacts use `if: always()` to preserve failure evidence and have 30-day retention.

### 8. OIDC and private-ECR role separation

**Threat:** a broadly trusted workflow mirrors arbitrary artifacts.

**Implementation:** `private-ecr-mirror.yml` validates inputs in `preflight` before AWS credentials are acquired. Each artifact family requires `main`, a dedicated Environment, and OIDC:

```yaml
if: github.ref == 'refs/heads/main' && inputs.target == 'validator-runtime' &&
    needs.preflight.result == 'success'
environment: validator-runtime-ecr-mirror
permissions:
  contents: read
  id-token: write
```

Target validators constrain immutable source/destination shapes. Separate role variables exist for GitOps, validator-client/runtime, log collector, DAST, charts, and signer images.

### 9. Deterministic secret-excluding release bundles

**Threat:** releases contain local credentials/state or mutable workspace data.

**Implementation:** `scripts/ci/build-release-bundle.sh` materializes a strict allowlist from the selected Git revision. It excludes sensitive operational patterns:

```bash
*/.env|*/env|*/.env.*|*/keystore-*.json|*/deposit_data-*.json|
*/terraform.tfstate*|*/terraform.tfvars|*.tfplan|*.p12|*.pfx|*.key)
  return 1
```

`.github/workflows/release-bundle.yml` validates main ancestry/CI provenance, creates reproducibility evidence, freezes publication records, and rebuilds the release through the dedicated private runner.

### 10. SBOM, provenance, and vulnerability gates

**Threat:** a release has unknown composition/provenance or unacceptable vulnerability findings.

**Implementation:** Release Bundle generates GitHub provenance for the exact tarball and rejects failed or critical/high/unknown SBOM scans:

```yaml
- uses: actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8
  with:
    subject-path: ${{ runner.temp }}/current/node-operator-release-bundle.tar

- run: jq -e '.status == "passed" and .findings.critical == 0 and
    .findings.high == 0 and .findings.unknown == 0' \
    "$RUNNER_TEMP/current/sbom-sca.json"
```

The scan-exported artifact digest is the publisher's required expected digest.

### 11. Signed and bounded evidence archives

**Threat:** evidence from another/ambiguous workflow run or altered unsigned files are archived.

**Implementation:** `evidence-archive.yml` starts only after successful Evidence Gate completion, resolves one exact gate/review source, acquires a short-lived archive role, and signs then verifies evidence:

```yaml
- name: Short-lived archive identity
  run: scripts/ci/assume-ci-evidence-archive-role.sh
- name: Cosign sign, verify, and archive
  run: scripts/ci/archive-ci-evidence.sh ...
```

Security scan evidence is retained for 30 days. Exact-head policy evidence and Scorecard evidence are configured for 90 days. Live S3 Object Lock/IAM enforcement requires AWS-side verification.

### 12. Continuous posture and stale-run controls

**Threat:** posture regression is missed or obsolete CI results race new source.

**Implementation:** `repository-posture.yml` runs on `main`, weekly, and manual dispatch with minimal permissions and pinned Scorecard/SARIF upload actions. CI cancels superseded ref runs:

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Evidence/archive workflows preserve exact-run attribution instead. Fence Security sets `timeout-minutes: 20`.

## Workflow mapping

| Workflow | Controls |
|---|---|
| `continuous-integration.yml` | token minimization, pinned dependencies, scanner/terraform isolation, policy contracts, aggregate fail-closed gates |
| `evidence-gate.yml` | trusted/untrusted split, exact-SHA PR decision, normalized evidence, OPA policy |
| `review-signal.yml` | review-triggered policy refresh |
| `fence-security.yml` | Fence unit/SAST/DAST and retained failure reports |
| `image-publish.yml` | build/publish separation, SBOM/signature evidence |
| `private-ecr-mirror.yml` | preflight, OIDC, role/environment-specific mirroring |
| `release-bundle.yml` | release eligibility, deterministic bundle, SBOM/SLSA/reproducibility |
| `evidence-archive.yml` | exact-run evidence resolution, Cosign, archive role |
| `repository-posture.yml` | OpenSSF Scorecard/SARIF posture tracking |

## Supply-chain and artifact controls

1. **Actions are commit-pinned.** A tag cannot silently move the executed action revision.
2. **OCI tool images are digest-pinned.** CI scanner and Terraform subjects are selected by SHA-256 digest rather than mutable tags.
3. **Release source is allowlisted.** The bundle builder materializes selected tracked files from the selected Git revision instead of copying the workspace wholesale.
4. **Sensitive material is excluded.** Bundle rules reject `.env` variants, keystores, deposit data, Terraform state/variables, plans, PKI files, and private keys.
5. **Image evidence is bound.** Publication contracts require exact subject digests, SBOM/provenance/scan evidence, and signature verification before acceptance.
6. **Artifact destinations are constrained.** Mirror/publisher contracts bind a digest-pinned approved source to the expected private ECR destination and reject broad repository permissions.
7. **Local fresh-deployment artifacts remain fail closed.** The installer validates the verified bundle first, uses deployment-bound ECR prerequisites, and requires signed local authority only for artifacts that a public bundle intentionally does not pre-publish.

## Identity and permission controls

- Workflow defaults are read-only; elevated permissions are declared per job.
- `id-token: write` is limited to jobs that need AWS OIDC federation or Scorecard identity.
- `checks: write` is limited to evidence jobs that publish the exact-SHA result.
- `packages: read` is limited to jobs that pull private digest-pinned OCI tools.
- AWS publication roles are exercised through OIDC and tested for narrow source/destination scope.
- Checkouts disable persisted GitHub credentials to reduce credential reuse by later shell steps.

## Evidence handling and retention

| Evidence | Producer | Storage behavior |
|---|---|---|
| Security scan evidence | CI security-scans job | Dedicated non-hidden directory; 30-day Actions artifact retention. |
| Policy decision, SARIF, and bound cache context | Evidence gate | Exact-head named artifact; 90-day retention. |
| Review refresh decision | Evidence gate | Separate artifact; 30-day retention. |
| Scorecard posture evidence | Repository posture workflow | SARIF plus normalized JSON; 90-day retention. |
| Long-term release/CI archive | Archive workflow | Separate signed immutable-archive contract; live lock state must be verified outside repository source. |

## Required external configuration

These controls depend on settings and infrastructure that source alone cannot enforce:

- protected `main` branch rules and required checks;
- GitHub Environment protection rules and reviewer approvals;
- repository secret and Actions-variable access restrictions;
- AWS IAM trust policies, permission boundaries, SCPs, and ECR/KMS/S3 policies;
- private runner hardening and Docker daemon security;
- object-lock retention mode and actual archive bucket configuration;
- live Cosign signature validity at verification time; and
- timely remediation or explicit renewal of accepted findings.

Verify those controls in GitHub and AWS before claiming a production CI/CD assurance level.

## Verification commands

Run the repository-level CI/CD boundary checks locally where their tools are available:

```bash
npm run harness:check
scripts/ci/test-devsecops-redteam.sh
scripts/ci/test-script-quality.sh
scripts/ci/test-ci-security-evidence-contract.sh
scripts/ci/test-release-reproducibility-gate-contract.sh
scripts/ci/test-image-publisher-isolation.sh
scripts/ci/test-repository-posture-contract.sh
```

The canonical full set is the `CI` GitHub workflow. Local success does not verify GitHub Environment approvals, branch protection, OIDC federation, or live AWS policy state.
