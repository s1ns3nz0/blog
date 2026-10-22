/**
 * Single source of truth for the portfolio home page (and later the AI
 * assistant context). Evidence is either a blog post slug (the build fails
 * if it is missing, draft, or unlisted) or an external link.
 * See docs/portfolio-spec.md.
 */

export type StageId = "design" | "build" | "ship" | "operate";

/** Where the work came from; each stage shows one lane per zone. */
export type ZoneId = "test" | "oss";

/** `name` is the plain label; `metaphor` is the flight-themed name shown small beside it. */
export type Zone = { id: ZoneId; name: string; metaphor: string; icon: string };

export const zones: Zone[] = [
  { id: "test", name: "Personal projects", metaphor: "test flights", icon: "▲" },
  { id: "oss", name: "Open source contributions", metaphor: "proactive minds", icon: "●" },
];

/** A blog post slug, or an external link. */
export type Evidence = string | { label: string; url: string };

export type Card = {
  id: string;
  /** Title shown instead of `title` for a given audience id. */
  titleFor?: Record<string, string>;
  stage: StageId;
  zone: ZoneId;
  title: string;
  /** Collapsed row text. For a card with a story, the result in one line. */
  summary: string;
  /** Personal projects: the problem in one line, shown above the result when collapsed. */
  hook?: string;
  /** Marks a learning or practice project so the result isn't read as production. */
  badge?: "learning" | "practice";
  /** Personal projects: the four-part story shown when the row is expanded. */
  story?: { problem: string; solution: string; result: string; lesson?: string };
  /** Post tag that collects every post of this project; links "All N posts". */
  tag?: string;
  /** For a card with a story, the key posts (two) plus code links. */
  evidence: Evidence[];
  /** The whole row links here instead of expanding. */
  href?: string;
  /** Expanded row: posts under a heading per group (shown after the story). */
  groups?: { title: string; posts: string[] }[];
};

export type Stage = {
  id: StageId;
  /** Rocket state while this stage is on screen, when it differs from id
      (Design flies with the rocket exactly as in Build). */
  rocketStage?: StageId;
  /** Telemetry label shown in the HUD and section header. */
  event: string;
  name: string;
  /** The stage's claim; the log entries below are its evidence. */
  governing: string;
  /** One line on how the evidence backs the claim. */
  support: string;
  /** Green callout lines for a stage with no fault before it. */
  notes?: string[];
  /** The NIST SSDF practice Compliance Ops tracks for this stage, with the
      node-operator evidence files it records (at commit 8f4121f). */
  proof?: {
    practice: string;
    /** Compliance Ops requirement id, for the live page once it is public. */
    requirementId: string;
    title: string;
    status: "implemented" | "partial";
    files: string[];
  };
};

export type Audience = {
  id: string;
  label: string;
  subline: string;
  /** Open-source entry ids shown first in the summary. */
  ossPriority?: string[];
  /** Replaces identity.title and identity.openTo. */
  title?: string;
  openTo?: string;
  /** Replaces identity.fairing on the rocket. Keep it to ~9 characters. */
  fairing?: string;
  /** Card ids shown first, in this order. Others keep their default order. */
  priority: string[];
};

export const identity = {
  name: "Jinsoo Yang",
  handle: "s1ns3nz0",
  headline: "Launch your product securely.",
  /** The one claim the summary makes; everything else is evidence. */
  claim: "I turn security frameworks and compliance into platform code.",
  /** The summary's closing line: what the trip through the stages showed. */
  closing: "Security controls you can read, run, and prove.",
  /** Full-screen quote after Operate: the question the summary then answers. */
  quote: {
    text: "Know the enemy and know yourself, and you will not be imperiled in a hundred battles.",
    by: "Sun Tzu",
    /** Who he was, for readers who don't know the name. */
    byline: "Ancient Chinese military strategist, author of The Art of War",
    question: "How well do you know your organization's security activities?",
  },
  /** Painted on the rocket fairing: the thing that actually reaches orbit. */
  fairing: "PRODUCT",
  subline: "I turn security frameworks and compliance into platform code.",
  roles: ["Platform Engineer", "DevSecOps Engineer", "Security Engineer"],
  /** The one title a recruiter sees; audiences can swap it. */
  title: "DevSecOps Engineer",
  openTo: "Open to remote and overseas DevSecOps roles",
  available: "Available now",
};

/** Fairing lettering length in rocket viewBox units; the nose is narrow. */
export const fairingTextLength = (label: string) =>
  Math.min(48, Math.max(30, label.length * 5.2));

export const stages: Stage[] = [
  {
    id: "design",
    rocketStage: "build",
    event: "T-00:10  DESIGN REVIEW",
    name: "Design",
    proof: {
      practice: "PW.1",
      requirementId: "4b9cc029-4c26-4132-a4cb-63ecb262a4d3",
      title: "Design software to meet security requirements and mitigate security risks",
      status: "implemented",
      files: [
        "THREAT-MODEL.md",
        "deploy/validator/client-lease-fence-security-model.md",
        "docs/security/devsecops-redteam-2026-09-12.md",
      ],
    },
    governing: "I put security into the design before anything gets built.",
    support:
      "Threat models, blast-radius maps, and requirements for three AWS reference architectures.",
    notes: [
      "Security requirements",
      "Service characteristics",
      "Compliance requirements",
      "Framework-driven",
    ],
  },
  {
    id: "build",
    event: "T-00:05  PAD CHECKS",
    name: "Build",
    proof: {
      practice: "PW.9",
      requirementId: "04220fdf-9813-44c4-8fef-cae0e8f3a55e",
      title: "Configure software to have secure settings by default",
      status: "implemented",
      files: [
        "policy/runtime/hardening.rego",
        "deploy/base/network-policies.yaml",
        "deploy/base/hardened-workload.example.yaml",
      ],
    },
    governing: "I build platforms that are secure before the first workload ships.",
    support:
      "I set up the organization, environment, and activities for building software securely, based on NIST SSDF and NIST SP 800-204.",
  },
  {
    id: "ship",
    event: "T+01:12  STAGE 1 SEP",
    name: "Deploy",
    proof: {
      practice: "PS.2",
      requirementId: "ca30a24f-3b2c-4bcc-95b6-da5f810649c0",
      title: "Provide a mechanism for verifying software release integrity",
      status: "implemented",
      files: [
        "scripts/release/sign-ci-image-evidence.sh",
        "scripts/ci/verify-release-signature.sh",
        "scripts/ci/build-release-bundle.sh",
      ],
    },
    governing: "I make pipelines prove their own integrity, and I fix what I find upstream.",
    support:
      "24 controls mapped to 12 threat areas in my own CI/CD, plus contributions to SEAL, and a fuzzer bug in Trail of Bits' Gosentry fixed the same day.",
  },
  {
    id: "operate",
    event: "T+04:38  STAGE 2 SEP",
    name: "Operate",
    proof: {
      practice: "RV.2",
      requirementId: "1955a73f-5003-4d9d-86ef-150204335907",
      title: "Assess, prioritize, and remediate vulnerabilities",
      status: "implemented",
      files: [
        "docs/security/zizmor-findings.md",
        "docs/security/checkov-2026-09-08-disposition.md",
        "docs/operations/prysm-risk-acceptance.md",
      ],
    },
    governing: "I make running systems observable, and cheap enough to keep defending.",
    support:
      "An incident console for an L2 rollup I run, per-outcome L402 metrics upstream in Aperture, and 28 cloud security checks in Prowler.",
  },
];

/**
 * In-flight anomalies. Each fires in the transit gap before `resolvesAt`
 * and clears once that stage arrives; `motion` picks the rocket fault and
 * `source`/`anchor` point at the post that tells the real story.
 */
export type Anomaly = {
  id: string;
  resolvesAt: StageId | "orbit";
  caution: string;
  /** Short HUD form of the fix. */
  fix: string;
  /** Green callout lines, shown in turn while the stage's cards scroll by. */
  resolution: string[];
  motion: "overheat" | "sputter" | "wobble" | "fairing";
  source: string;
  anchor?: string;
};

const LESSONS = "prioritizing-security-controls-hoodi-validator-lessons";

export const anomalies: Anomaly[] = [
  {
    id: "cost-overrun",
    resolvesAt: "build",
    caution: "No tests or scans",
    fix: "Scanned",
    resolution: ["IaC scanning", "Secret scanning", "SAST"],
    motion: "overheat",
    source: LESSONS,
    anchor: "2-the-architecture-became-too-expensive-to-operate",
  },
  {
    id: "insecure-cicd",
    resolvesAt: "ship",
    caution: "Insecure CI/CD",
    fix: "Hardened",
    resolution: ["Git as single source of truth", "Policy as code", "Risk assessment"],
    motion: "sputter",
    source: "ci-cd-security-controls-implemented-in-the-pipeline-design",
    anchor: "threat-mapped-implementation",
  },
  {
    id: "anomaly-detected",
    resolvesAt: "operate",
    caution: "Anomaly detected",
    fix: "Contained",
    resolution: ["Incident response", "Logs, metrics, traces"],
    motion: "wobble",
    source: "palantir-ads",
  },
  {
    id: "no-visibility",
    resolvesAt: "orbit",
    caution: "No visibility",
    fix: "Visible",
    resolution: ["Full visibility"],
    motion: "fairing",
    source: LESSONS,
    anchor: "4-i-relied-too-much-on-ai",
  },
];

const GH = "https://github.com/s1ns3nz0";
/** Public read-only Compliance Ops; each stage card deep-links its requirement. */
export const COMPLIANCE_OPS_LIVE: string | undefined = "https://compliance-ops.miata.cloud";

export const cards: Card[] = [
  // ---------- Design ----------
  {
    id: "security-requirements",
    stage: "design",
    zone: "test",
    title: "Security Requirements plugin",
    hook: "Shift-left tooling skips the first stage: what a service must satisfy",
    summary: "19 verifiable requirements for a paid service, 3 no NIST baseline covers",
    story: {
      problem:
        `DevSecOps preaches shift left, but requirements analysis, the first stage of the lifecycle, has almost no tooling. Nothing states what a service must satisfy before code exists.`,
      solution:
        `A Claude Code plugin that derives requirements from the service's characteristics, operating environment, compliance obligations, and stack: FIPS 199 impact, an 800-53B baseline, STRIDE and LINDDUN threats, regulatory overlays, and verifiable requirements.`,
      result:
        `Ran on the Lightning-paid OpenCTI scan service: 11 service-specific threats, 19 verifiable requirements, 3 of them for risks no NIST baseline control expresses.`,
      lesson:
        `Let the model interpret; let scripts own control IDs, baselines, and approvals. A wrong recovery objective quietly rewrites dozens of requirements.`,
    },
    tag: "Security Requirements Plugin",
    evidence: [
      { label: "security-requirements on GitHub", url: `${GH}/security-requirements` },
      "security-requirements-plugin",
      "deriving-security-requirements-for-opencti-paid-scan",
    ],
  },
  {
    id: "aws-saas-design-review",
    stage: "design",
    zone: "test",
    title: "AWS SaaS Security Design Review",
    hook: "One requirement set doesn't fit every AWS deployment model",
    summary: "3 architectures, 31 threats; ECS and EKS broke at different boundaries",
    story: {
      problem:
        `A requirements plugin is only as good as the architectures it has been run on. I needed to see it handle three different deployment models end to end, not one demo.`,
      solution:
        `Ran the Security Requirements plugin through its whole lifecycle on three AWS reference architectures (ECS SaaS, EKS SaaS, and a serverless movie-voting API): impact, threats, blast radius, responsibility, requirements, refresh, evidence, CI/CD verification, and regulatory overlays.`,
      result:
        `Three reviews in 29 posts, with threat models of 13 (ECS), 10 (EKS), and 8 (serverless). In the serverless review, a route-dispatch mismatch surfaced as a threat-only requirement the 800-53 baseline doesn't express.`,
      lesson:
        `The deployment model changes the threat model, even between two container platforms. On ECS, tenant isolation broke at the routing layer: a shared mapping Lambda that could rewrite any tenant's routes, and services trusting a forged tenant header. On EKS, it broke at boundaries ECS didn't have: ingress rules routing into another tenant's namespace, namespace isolation without NetworkPolicy, and a service account picking up the wrong AWS role. One requirement set copied across all three would have missed each of these.`,
    },
    evidence: [
      { label: "ECS SaaS series", url: "/tags/ecs-saas/" },
      { label: "EKS SaaS series", url: "/tags/eks-saas/" },
      { label: "Serverless series", url: "/tags/serverless/" },
    ],
  },

  // ---------- Build ----------
  {
    id: "hoodi-local",
    stage: "build",
    zone: "test",
    title: "Ethereum Hoodi Validator, running locally",
    summary: "Validator 1645272 on a local Kubernetes cluster: Besu, Teku, and Web3Signer, watched in Grafana.",
    href: "https://hoodi.beaconcha.in/validator/1645272",
    evidence: [],
  },
  {
    id: "private-eks",
    stage: "build",
    zone: "test",
    titleFor: { "lightning-labs": "Stateful validator workload on private EKS" },
    title: "Ethereum Hoodi Validator on Private EKS (earlier build)",
    hook: "Public client images run right next to a slashable signing key",
    summary: "Validator active on Hoodi; revoking the signer's role stopped signing at once",
    story: {
      problem:
        `Staking operators run consensus and validator clients pulled from public registries, right next to the signing key, so a swapped image or a stolen credential means a slashable signature. Running the hardware yourself adds patching, uptime, and key custody on top.`,
      solution:
        `Moved the node to a private EKS cluster with no public API endpoint. Every upstream client image is reviewed, pinned by digest, checked against an allowlist, and mirrored into private ECR with immutable tags and KMS encryption, published through GitHub OIDC with a single-purpose role. Kyverno admission blocks workloads that don't meet the baseline.`,
      result:
        `Validator 1559065 went active on Hoodi and had attestations included on chain. During live rollout, admission rejected a sidecar image pinned by tag instead of digest until it was re-pinned. In a revocation drill, pulling the signer's Vault role stopped signing at once; after reactivation with the same slashing-protection volume, its next attestation was finalized.`,
      lesson:
        `Every control has a cost. I started with about ten private registries and every scanner I could add, then cut back to the controls that answer a real risk.`,
    },
    tag: "Hoodi",
    evidence: [
      { label: "node-operator-public on GitHub", url: `${GH}/node-operator-public` },
      "private-ecr-delivery-architecture-for-private-eks",
      "prioritizing-security-controls-hoodi-validator-lessons",
    ],
  },
  {
    id: "lnd-kubernetes",
    stage: "build",
    zone: "test",
    title: "LND node on Kubernetes",
    hook: "A Running Pod can come back as a different Lightning node",
    badge: "learning",
    summary: "Same identity, channels, and backups after Pod replacement and Helm upgrade",
    story: {
      problem:
        `A learning project: I wanted to see what Kubernetes actually guarantees for a stateful node, and what it doesn't. A Lightning node is its wallet, channel database, and static channel backups, so a Pod that restarts successfully can still come back as a different node.`,
      solution:
        `Packaged LND as a Helm chart: a StatefulSet with per-node volumes, default-deny NetworkPolicy, RPC kept apart from P2P, wallet unlock left as an operator step, and optional monitoring sidecars. Then wrote a test for every claim the chart makes.`,
      result:
        `After a forced Pod replacement and a helm upgrade, the same node identity, channels, volumes, and SCB hash came back. Reproduced on macOS arm64 and WSL amd64 from the same revision, with a synced testnet node, an active public channel, and payments both ways.`,
      lesson:
        `For stateful workloads, Running is only where testing starts. Kubernetes gives scheduling and storage; LND still owns identity and channel state, and the operator still owns the seed.`,
    },
    tag: "LND on Kubernetes",
    evidence: [
      "running-an-lnd-lightning-node-on-local-kubernetes",
      "metrics-collector-prometheus-on-lnd",
    ],
  },
  {
    id: "oscal-compass",
    stage: "build",
    zone: "oss",
    title: "OSCAL Compass",
    summary:
      "Fixed a KeyError in compliance-trestle (merged) and opened a GitHub Actions DevSecOps pipeline plugin for compliance-to-policy.",
    evidence: [
      { label: "compliance-trestle PR #2222", url: "https://github.com/oscal-compass/compliance-trestle/pull/2222" },
      { label: "compliance-to-policy PR #51", url: "https://github.com/oscal-compass/compliance-to-policy/pull/51" },
      "nist-oscal-and-associated-projects",
    ],
  },
  {
    id: "seal-registries",
    stage: "build",
    zone: "oss",
    title: "SEAL Frameworks: private registries and mirrors",
    summary: "Guidance on private registries and package mirrors so builds pull only reviewed artifacts.",
    evidence: [
      "private-registries-and-mirrors-seal-frameworks",
      { label: "PR #627", url: "https://github.com/security-alliance/frameworks/pull/627" },
    ],
  },
  {
    id: "lightning-disclosures",
    stage: "build",
    zone: "oss",
    title: "3 security reports submitted to blockchain companies",
    summary: "2 confirmed by the vendor with fixes scheduled for the next release; 1 submitted and under review. Product names and details stay private until fixes ship.",
    evidence: [],
  },

  // ---------- Deploy ----------
  {
    id: "pipeline-controls",
    stage: "ship",
    zone: "test",
    title: "Pipeline security controls",
    hook: "The pipeline itself can ship a forged artifact to production",
    summary: "24 controls; every Action and image pinned; 25 workflows → 8",
    story: {
      problem:
        `The pipeline that builds and ships the validator is itself an attack path: a stolen token, a swapped action, or a forged evidence file reaches the production cluster without touching application code. NIST SP 800-218 (SSDF) and SP 800-204D say what to protect, not which controls one repository needs.`,
      solution:
        `Mapped SSDF practices and 800-204D's CI/CD threats to 24 controls in the node-operator pipeline, each tied to the threat it answers: default-deny token permissions and SHA-pinned actions, untrusted PR code treated as data, fail-closed scanner gates, OPA policy-as-code, GitHub OIDC instead of long-lived keys, and digest-bound SBOM and provenance.`,
      result:
        `Controls enforced in CI and release workflows, with evidence bound to the exact commit. OpenSSF Scorecard: all 84 GitHub Actions and 39 container images pinned, least-privilege tokens, no dangerous workflow patterns, and 30 of 30 merged PRs CI-tested. Consolidated 25 workflows into 8. A mirror step shown to accept a wrong image digest now rejects it.`,
      lesson:
        `More scanners slowed delivery without making it safer; fewer tools, containerized and pinned, did more. A control earns its place by the threat it answers.`,
    },
    tag: "Pipeline Controls",
    evidence: [
      "ci-cd-security-controls-implemented-in-the-pipeline-design",
      "relationship-between-nist-sp-800-218-and-sp-800-204-d",
    ],
  },
  {
    id: "seal-policy-as-code",
    stage: "ship",
    zone: "oss",
    title: "SEAL Frameworks: Policy as Code",
    summary: "Guidance on enforcing security policy through the CI/CD pipeline for the Security Alliance frameworks.",
    evidence: [
      "policy-as-code-seal-frameworks",
      {
        label: "Pull requests",
        url: "https://github.com/security-alliance/frameworks/pulls?q=is%3Apr+involves%3As1ns3nz0",
      },
    ],
  },
  {
    id: "aperture-flake",
    stage: "ship",
    zone: "oss",
    title: "Aperture: flaky L402 test fix",
    summary: "Fixed a rare (1 in 256) flake in TestTamperedL402 that could fail CI at random. Merged with authorship kept via #292.",
    evidence: [
      { label: "PR #285", url: "https://github.com/lightninglabs/aperture/pull/285" },
      { label: "Merged via PR #292", url: "https://github.com/lightninglabs/aperture/pull/292" },
    ],
  },
  {
    id: "gosentry",
    stage: "ship",
    zone: "oss",
    title: "Gosentry: a fuzzer that died silently",
    summary:
      "Reported a LibAFL corpus bug in Trail of Bits' Gosentry where fuzzing stopped but go test still passed; fixed the same day.",
    evidence: [
      "reporting-a-libafl-corpus-id-bug-in-gosentry",
      { label: "Issue #210", url: "https://github.com/trailofbits/gosentry/issues/210" },
    ],
  },
  {
    id: "lnd-short-reads",
    stage: "ship",
    zone: "oss",
    title: "LND: short reads in address decoders, fixed",
    summary:
      "Reported that NodeAnnouncement2's fixed-width address decoders accept short reads. Fixed upstream in PR #11219 for LND 0.22.0, with a co-author credit on the fix.",
    evidence: [
      { label: "Issue #11211", url: "https://github.com/lightningnetwork/lnd/issues/11211" },
      { label: "PR #11219 (merged)", url: "https://github.com/lightningnetwork/lnd/pull/11219" },
      "lnd-node-announcement-2-address-short-reads",
    ],
  },

  // ---------- Operate ----------
  {
    id: "lineth-l2",
    stage: "operate",
    zone: "test",
    title: "Lineth L2: a full rollup I run and watch",
    summary: "A local L1 and a zk-rollup L2 on one Kubernetes node, how a transaction moves through it, and five postmortems.",
    tag: "Layer 2",
    evidence: [],
    groups: [
      {
        title: "Workflow process",
        posts: [
          "lineth-l2-following-a-transaction-through-besu-and-maru",
          "lineth-l2-from-blocks-to-execution-proofs-trace-and-conflation",
          "lineth-l2-inside-the-prover-from-request-to-proof-response",
          "lineth-l2-following-a-blob-from-creation-to-finalization-on-l1",
          "lineth-l2-web3signer-signing-https-and-l1-sender-verification",
          "lineth-l2-following-a-message-to-a-successful-claim-on-l1",
        ],
      },
      {
        title: "Incident management",
        posts: ["lineth-l2-homelab-kubernetes-architecture-and-monitoring", "lineth-postman-stuck-claim-cancel-bigint"],
      },
      {
        title: "Postmortems",
        posts: [
          "lineth-l2-postmortem-postman-bigint-nonce-gap",
          "lineth-l2-postmortem-prover-trace-limit-host-memory",
          "lineth-l2-postmortem-startup-dns-peer-lost",
          "lineth-l2-postmortem-grafana-forward-alive-but-dead",
          "lineth-l2-postmortem-l1-engine-api-deadlock",
        ],
      },
    ],
  },
  {
    id: "sre-ops",
    stage: "operate",
    zone: "test",
    title: "AI SRE Ops: incident console for an L2 rollup",
    summary: "One console for the on-call problems that came back every shift, from alert to postmortem.",
    href: "/sre",
    evidence: [],
  },
  {
    id: "lineth-postman",
    stage: "operate",
    zone: "oss",
    title: "Lineth: stuck-claim recovery fix in the bridge postman",
    summary: "The postman's cancel path for stuck claims crashed on Postgres fees read as strings, leaving deposits unclaimed. Reported and fixed; the PR is in review.",
    evidence: [
      "lineth-postman-stuck-claim-cancel-bigint",
      { label: "Issue #4200", url: "https://github.com/LFDT-Lineth/lineth-monorepo/issues/4200" },
      { label: "PR #4201", url: "https://github.com/LFDT-Lineth/lineth-monorepo/pull/4201" },
    ],
  },
  {
    id: "aperture-metrics",
    stage: "operate",
    zone: "oss",
    title: "Aperture: L402 metrics",
    summary: "Per-outcome Prometheus counters for Aperture's L402 mint and verify paths. A maintainer reviewed the proposal and asked for a PR; it's open as #297.",
    evidence: [
      "aperture-l402-metrics-before-and-after",
      { label: "Issue #286", url: "https://github.com/lightninglabs/aperture/issues/286" },
      { label: "PR #297", url: "https://github.com/lightninglabs/aperture/pull/297" },
    ],
  },
  {
    id: "aperture-events",
    stage: "operate",
    zone: "oss",
    title: "Aperture: security event proposal",
    summary: "Structured L402 security events that carry HMAC references instead of raw macaroons and preimages.",
    evidence: ["aperture-l402-security-events-monitoring-proposal"],
  },
  {
    id: "prowler",
    stage: "operate",
    zone: "oss",
    title: "Prowler: 28 Azure and GCP checks",
    summary: "Posture checks for AKS, Cosmos DB, Databricks, Entra ID, Cloud SQL, Secret Manager, and more.",
    evidence: [
      {
        label: "Pull requests",
        url: "https://github.com/prowler-cloud/prowler/pulls?q=is%3Apr+state%3Aclosed+involves%3As1ns3nz0",
      },
      "adding-azure-aks-defender-check-to-prowler",
      "adding-gcp-secret-manager-rotation-check-to-prowler",
    ],
  },
];

/** Newest first; from the resume. Rendered as a vertical timeline. */
export const career = [
  {
    period: "Nov 2024 – Sep 2026",
    role: "Cybersecurity Consultant",
    keywords: ["Cloud security", "Supply chain (SSDF)", "OT security"],
    org: "IBM Consulting Korea",
    logo: "ibm",
    bullets: [
      "Built an AWS security posture assessment tool on open-source CSPM (Prowler) and defined a cloud security maturity grading model",
      "Designed and recommended automated AWS posture scanning with AWS Batch, which later detected a crypto miner in the client's environment",
      "Led product security assessments based on NIST SSDF (SP 800-218) and SP 800-204D to strengthen clients' software supply chain controls and DevSecOps culture",
      "Conducted OT risk assessments across 10 plant sites and implemented OT SOC solutions",
      "Reviewed and implemented iDMZ architecture across global plants for semiconductor, industrial vehicle, and energy companies",
      "Managed OT SOC detection rules with IBM's global SOC, leading weekly tuning meetings to propose new rules and optimize existing ones",
    ],
  },
  {
    period: "Mar 2024 – Nov 2024",
    role: "Sr. Security Consultant",
    keywords: ["ISO 27001", "PKI", "Evaluation guide"],
    org: "Deloitte Consulting Korea",
    logo: "deloitte",
    bullets: [
      "Ran an ISO 27001 certification audit for a global IoT service: gap analysis, control-effectiveness testing, and remediation validation, and reported findings to global stakeholders in English",
      "Audited digital-signature authentication services covering cryptographic controls, access management, and key lifecycle",
      "Reviewed AWS architectures against compliance frameworks and set prioritized remediation",
      "Drafted the evaluation criteria in Appendices 2–3 of Korea's Digital Signature Certification Service Evaluation Guide v1.4.0 (published in Korean)",
    ],
  },
  {
    period: "Jun 2023 – Feb 2024",
    role: "Vulnerability Analysis Track",
    keywords: ["Vulnerability analysis", "CIEM", "Multi-cloud IAM"],
    org: "KITRI Best of the Best (BoB) 12th",
    logo: "kitri",
    bullets: [
      "Selected for a national program with about a 3% acceptance rate. Trained in web and binary exploitation and reverse engineering",
      "Led a multi-cloud CIEM platform with an IAM policy normalization engine for AWS, Azure, and GCP. The project was published as research and spun out as a startup",
    ],
  },
  {
    period: "Dec 2021 – Mar 2023",
    role: "Signal Officer (Captain), Corps CERT",
    keywords: ["Corps CERT", "Incident response", "Splunk"],
    org: "Republic of Korea Army",
    logo: "rok-army",
    bullets: [
      "Led first-line incident investigations for a command of about 10,000 members, in a country still under armistice, covering triage, evidence collection, timeline reconstruction, and incident reporting",
      "Tuned Splunk detection rules and dashboards, reducing false positives. Built an SPL query assistant and a SIEM training platform for new analysts",
      "Managed firewall, IDS, and endpoint security policies through security event analysis",
      "Audited security configurations of servers, networks, PCs, and military equipment, and built a self-audit script that let users find and fix their own misconfigurations",
      "Built control-level audit evidence packages and drove remediation for cybersecurity assessments",
      "Went through an internal security audit by the Defense Counterintelligence Command",
      "Selected for the Army's Elite 300 Cyber Warriors. Won the Ground Operations Command incident response CTF. Placed 2nd in a cybersecurity education competition with a web-based security awareness game",
    ],
  },
  {
    period: "Mar 2018 – Dec 2021",
    role: "Signal Officer (Lieutenant), Network Platoon Leader",
    keywords: ["Network ops", "25-member platoon", "#1 of 24"],
    org: "Republic of Korea Army",
    logo: "rok-army",
    bullets: [
      "Led a 25-member signal platoon responsible for military network availability and security. Ranked #1 of 24 signal sites in a corps-level readiness evaluation",
      "Designed and tested network failover and disaster recovery procedures",
    ],
  },
];

export const education = [
  { period: "Aug 2026 – Aug 2028", degree: "M.S., Cyber Defense", school: "Dakota State University" },
  { period: "Feb 2014 – Mar 2018", degree: "B.S., Civil Engineering", school: "Korea Military Academy" },
];

/**
 * Summary proof points: one small line of stats under the claim; each opens
 * its detail dialog (Career / Open source / Credentials).
 */
export type TileId = "career" | "oss" | "credentials";

/** Second hero row: the reach of the work. Each card opens a short detail dialog. */
export const reach: {
  id: string;
  stat: string;
  label: string;
  note?: string;
  items: string[];
}[] = [
  {
    id: "users",
    stat: "33M+",
    label: "Users of services I've secured",
    note: "Counted from publicly available figures. Client names are withheld.",
    items: [
      "Global IT services",
      "Digital signature services",
      "Automotive IoT services",
      "OT security",
      "…",
    ],
  },
  {
    id: "industries",
    stat: "8",
    label: "Industries",
    items: [
      "Defense",
      "Semiconductors",
      "Heavy equipment",
      "Energy",
      "Telecommunications",
      "Real estate",
      "IoT",
      "Mobile",
    ],
  },
  {
    id: "countries",
    stat: "7",
    label: "Countries I've worked with",
    items: [
      "South Korea",
      "United States",
      "United Kingdom",
      "Israel",
      "Czech Republic",
      "India",
      "Singapore",
    ],
  },
];

export const tiles: { id: TileId; title: string; stat: string; label: string }[] = [
  { id: "career", title: "Career", stat: "5+", label: "Years in security" },
  // oss and credentials stats are computed in the page
  { id: "oss", title: "Open source", stat: "", label: "Open-source contributions" },
  { id: "credentials", title: "Credentials", stat: "", label: "Credentials" },
];

/** Hero tech stack, one row per area. */
export const stack = [
  { area: "Languages", items: ["Go", "Python", "Bash"] },
  { area: "Cloud", items: ["AWS", "Azure", "GCP"] },
  { area: "Container", items: ["Kubernetes (EKS)", "Helm", "Docker"] },
  { area: "CI/CD", items: ["GitHub Actions", "ArgoCD", "FluxCD"] },
  { area: "IaC", items: ["Terraform"] },
  { area: "Supply chain", items: ["Sigstore/Cosign", "SBOM", "Trivy"] },
  { area: "Policy", items: ["OPA", "Kyverno", "OSCAL"] },
  { area: "Secrets", items: ["Vault", "AWS KMS"] },
  { area: "Observability", items: ["Prometheus", "Grafana", "Loki", "OpenTelemetry", "Fluent Bit"] },
  { area: "GRC", items: ["PKI", "ISO 27001", "ISMS-P", "EU CRA", "NIST CSF", "NIST SP 800-53", "NIST SP 800-30", "NIST SSDF", "NIST SP 800-204"] },
];

/** "Field notes": posts shown above How I work in the summary (slugs). */
export const fieldNotes = ["what-shouldnt-i-miss-in-the-ai-era", "open-source-contribution"];

/** "How I work" lines under the stat cards; "{oss}" is the computed open-source total. */
export const traits = [
  {
    name: "Self-starter",
    line: "I get to security problems before they ship.",
    proof:
      "Maintainer of the Supply Chain section of the SEAL Frameworks, with {oss} contributions and 3 security reports and 3 hardening reports sent upstream.",
  },
  {
    name: "Fast learner",
    line: "I learn a new stack by running something real on it.",
    proof:
      "To learn Web3 infrastructure, I built and ran an Ethereum testnet validator on EKS. Picked up 12+ credentials along the way, Kubestronaut included.",
  },
  {
    name: "Problem solver",
    line: "I turn slow, manual work into code.",
    proof:
      "Compliance used to live in documents. I moved it into OSCAL: controls, policies, evidence, and owners in one dashboard the team can query from Slack and Jira.",
  },
];

/** Resume highlights (kept for the assistant context; teasers carry them on the page). */
export const highlights = [
  { title: "Kubestronaut", detail: "3 hands-on and 2 knowledge-based Kubernetes certifications." },
  // "{oss}" is replaced with the computed open-source total in the page
  { title: "Open-source contributor", detail: "{oss} contributions to cloud, compliance, security, and blockchain tooling." },
  { title: "Top signal platoon leader", detail: "#1 of 24 signal platoons in a corps-level readiness evaluation." },
];

export const certifications = [
  { name: "Kubestronaut (CKA, CKAD, CKS, KCNA, KCSA)", count: 5 },
  { name: "AWS Certified Security - Specialty", count: 1 },
  { name: "AWS Certified Solutions Architect - Professional", count: 1 },
  { name: "AWS Certified CloudOps Engineer - Associate", count: 1 },
  { name: "Engineer Information Security (정보보안기사)", count: 1 },
  { name: "Engineer Information Processing (정보처리기사)", count: 1 },
  { name: "Engineer Information & Communication (정보통신기사)", count: 1 },
  { name: "Certified Privacy Protection General, CPPG (개인정보관리사)", count: 1 },
];

/** Open-source work, one entry per project, shown in the summary. */
export type ContributionStatus = "merged" | "open" | "proposed" | "reported" | "fixed" | "embargo" | "confirmed" | "coauthored" | "review" | "submitted" | "accepted" | "planned";

export const statusLabel: Record<ContributionStatus, string> = {
  merged: "Merged",
  open: "Open PR",
  proposed: "Proposed",
  reported: "Reported",
  fixed: "Fixed upstream",
  embargo: "Under embargo",
  confirmed: "Confirmed, fix in next release",
  coauthored: "Co-authored fix merged",
  review: "Under review",
  submitted: "Submitted, under review",
  accepted: "Accepted, fix in PR",
  planned: "Hardening, fix planned in a public PR",
};

export type Contribution = {
  what: string;
  /** A few words for the grouped open-source list; `what` is the tooltip. */
  short?: string;
  /** How many PRs/reports this line stands for (default 1). */
  count?: number;
  /** Checked against GitHub; update when a PR or issue changes state. */
  status: ContributionStatus;
  links: Evidence[];
};

export type OpenSourceEntry = {
  id: string;
  name: string;
  about: string;
  /** Omitted for embargoed disclosures, which must not name a product. */
  url?: string;
  /** Bold one-line summary of what I did, shown collapsed. */
  headline: string;
  /** Row line 2: what I contributed (line 1 is `about`). Reviewed for AI tells. */
  did: string;
  /** 2-3 technology keywords recruiters can match against a JD. */
  tags: string[];
  /** Row badges: [ecosystem, work type], e.g. ["Cloud", "CSPM"]. Ecosystem is colored. */
  kind: string[];
  /** Standing role in the project, shown bold above the contributions. */
  role?: string;
  contributions: Contribution[];
};

const PR = (repo: string, n: number) => ({ label: `PR #${n}`, url: `https://github.com/${repo}/pull/${n}` });
const ISSUE = (repo: string, n: number) => ({ label: `Issue #${n}`, url: `https://github.com/${repo}/issues/${n}` });

export const openSource: OpenSourceEntry[] = [
  {
    id: "prowler",
    name: "Prowler",
    about: "Open-source cloud security platform that scans AWS, Azure, and GCP for misconfigurations.",
    url: "https://github.com/prowler-cloud/prowler",
    did: "Added 28 checks for Azure and GCP services, including AKS, Cosmos DB, Entra ID, and Secret Manager. All merged.",
    headline: "28 cloud security checks",
    kind: ["Cloud", "CSPM"],
    tags: ["Azure", "GCP", "CSPM"],
    contributions: [
      {
        short: "Azure & GCP checks: AKS, Cosmos DB, Entra ID, Secret Manager",
        what:
          "28 Azure and GCP checks: AKS (Defender, auto-upgrade, local accounts, monitoring), Cosmos DB (TLS, failover, backup, public access), Databricks, Entra ID, MySQL and PostgreSQL HA and geo-backup, Recovery Vault, NSG, DDoS, Cloud Functions, Cloud SQL, and Secret Manager.",
        count: 28,
        status: "merged",
        links: [
          {
            label: "28 PRs",
            url: "https://github.com/prowler-cloud/prowler/pulls?q=is%3Apr+is%3Amerged+author%3As1ns3nz0",
          },
          "adding-azure-aks-defender-check-to-prowler",
        ],
      },
    ],
  },
  {
    id: "seal",
    name: "SEAL Frameworks",
    about: "Security Alliance's open-source security framework for blockchain teams.",
    url: "https://github.com/security-alliance/frameworks",
    did: "Maintainer of the Supply Chain section. Wrote the Policy as Code and private registries sections and an endpoint compromise runbook, all merged.",
    headline: "Policy as Code & supply-chain guidance",
    kind: ["Web3", "Supply chain"],
    tags: ["Policy as Code", "Supply chain", "Incident response"],
    role: "Secure Software Supply Chain section maintainer",
    contributions: [
      {
        short: "Policy as Code section",
        what: "Policy as Code enforced through the CI/CD pipeline.",
        status: "merged",
        links: [PR("security-alliance/frameworks", 592), "policy-as-code-seal-frameworks"],
      },
      {
        short: "Private registries section",
        what: "Private registries and package mirrors, so builds pull only reviewed artifacts.",
        status: "merged",
        links: [PR("security-alliance/frameworks", 627), "private-registries-and-mirrors-seal-frameworks"],
      },
      {
        short: "Endpoint compromise runbook",
        what: "An endpoint compromise runbook for incident management.",
        status: "merged",
        links: [PR("security-alliance/frameworks", 647)],
      },
    ],
  },
  {
    id: "oscal-compass",
    name: "OSCAL Compass",
    about: "CNCF project that turns NIST's OSCAL format into compliance-as-code tooling.",
    url: "https://github.com/oscal-compass",
    did: "Fixed a KeyError in compliance-trestle's SSP generation (merged). Opened a GitHub Actions plugin for compliance-to-policy.",
    headline: "Compliance-as-Code fix & CI plugin",
    kind: ["CNCF", "Compliance"],
    tags: ["OSCAL", "Compliance as Code", "CI/CD"],
    contributions: [
      {
        short: "KeyError fix in compliance-trestle",
        what: "Fixed an ssp-generate KeyError on a missing profile-param-value-origin in compliance-trestle.",
        status: "merged",
        links: [PR("oscal-compass/compliance-trestle", 2222)],
      },
      {
        short: "GitHub Actions plugin for compliance-to-policy",
        what: "A GitHub Actions DevSecOps pipeline plugin for compliance-to-policy.",
        status: "open",
        links: [PR("oscal-compass/compliance-to-policy", 51), "nist-oscal-and-associated-projects"],
      },
    ],
  },
  {
    id: "lnd",
    name: "LND",
    about: "Lightning Labs' implementation of a Lightning Network node.",
    url: "https://github.com/lightningnetwork/lnd",
    did: "Reported that the fixed-width decoders for node announcement addresses accept short reads; the fix was merged with a co-author credit.",
    headline: "Short-read bug in address decoders, fixed",
    kind: ["Bitcoin", "Hardening"],
    tags: ["Lightning", "Go", "Input validation"],
    contributions: [
      {
        short: "Short-read fix in address decoders (LND 0.22.0)",
        what: "Found that the fixed-width NodeAnnouncement2 address decoders accept short reads. Fixed in PR #11219 (LND 0.22.0), co-authored.",
        status: "coauthored",
        links: [ISSUE("lightningnetwork/lnd", 11211), PR("lightningnetwork/lnd", 11219), "lnd-node-announcement-2-address-short-reads"],
      },
    ],
  },
  {
    id: "aperture",
    name: "Aperture",
    about: "Lightning Labs' reverse proxy that gates APIs behind L402 payments.",
    url: "https://github.com/lightninglabs/aperture",
    did: "Opened a PR for per-outcome Prometheus metrics after a maintainer reviewed the proposal. Proposed a dedicated security event log. Fixed a flaky test, merged via #292.",
    headline: "L402 metrics & security events",
    kind: ["Bitcoin", "Reliability"],
    tags: ["Lightning", "L402", "Observability"],
    contributions: [
      {
        short: "Per-outcome L402 metrics",
        what: "Per-outcome Prometheus counters for the L402 mint and verify paths, reworked after maintainer review.",
        status: "open",
        links: [PR("lightninglabs/aperture", 297), ISSUE("lightninglabs/aperture", 286), "aperture-l402-metrics-before-and-after"],
      },
      {
        short: "Security event log",
        what: "Dedicated security event logging that keeps raw macaroons and preimages out of logs.",
        status: "proposed",
        links: [ISSUE("lightninglabs/aperture", 291), "aperture-l402-security-events-monitoring-proposal"],
      },
      {
        short: "Flaky TestTamperedL402 fix",
        what: "A fix for a rare (1 in 256) flake in TestTamperedL402.",
        status: "merged",
        links: [PR("lightninglabs/aperture", 285), PR("lightninglabs/aperture", 292)],
      },
    ],
  },
  {
    // All three classed as hardening (informational, no CVE) under Web3Signer's trust model;
    // fixes land in public PRs. Keep the unfixed two to a one-line summary until their PRs open.
    id: "web3signer",
    name: "Web3Signer",
    about: "Consensys' remote signer for Ethereum validators, with a database-backed slashing protection.",
    url: "https://github.com/Consensys-Incorporated/web3signer",
    did: "Reported three issues in slashing protection and the Key Manager API. The maintainers classed all three as hardening under Web3Signer's trust model, with fixes in public PRs and reporter credit.",
    headline: "3 hardening reports",
    kind: ["Ethereum", "Hardening"],
    tags: ["Responsible disclosure", "Slashing protection"],
    contributions: [
      {
        short: "First caller sets the slashing-protection genesis validators root",
        what: "The first signing request's genesis validators root was stored for good; a mismatched root then got 412 on every later request. PR #1260 sets it at startup from --network or --genesis-state.",
        status: "accepted",
        links: [PR("Consensys-Incorporated/web3signer", 1260)],
      },
      {
        short: "Slashing-protection low watermark has no upper bound",
        what: "Classed as hardening; the fix will land in a public PR. Details follow once it opens.",
        status: "planned",
        links: [],
      },
      {
        short: "Key Manager import has no upper bound on KDF cost",
        what: "Under analysis by the maintainers as hardening; the fix will land in a public PR. Details follow once it opens.",
        status: "review",
        links: [],
      },
    ],
  },
  {
    // Undisclosed reports: vendor only. No product, date, severity, or link
    // until fixes ship and disclosure is agreed. Listed in Company A, B order.
    id: "disclosure-1",
    name: "Coordinated disclosure",
    about: "Private reports to a blockchain company, held until fixes ship.",
    did: "Submitted and under review by the vendor. Product names and details stay private until fixes ship.",
    headline: "1 security report submitted to a blockchain company",
    kind: ["Blockchain", "Security"],
    tags: ["Responsible disclosure"],
    contributions: [
      {
        what: "Details will be added once fixes ship and disclosure is agreed.",
        count: 1,
        status: "submitted",
        links: [],
      },
    ],
  },
  {
    // Undisclosed reports: vendor only, as above.
    id: "disclosure",
    name: "Coordinated disclosure",
    about: "Private reports to a blockchain company, held until fixes ship.",
    did: "Both confirmed by the vendor; fixes are scheduled for the next release. Product names and details stay private until fixes ship.",
    headline: "2 security reports confirmed by a blockchain company",
    kind: ["Blockchain", "Security"],
    tags: ["Responsible disclosure"],
    contributions: [
      {
        short: "Identified a vulnerability in a digital asset issuance platform\n(under embargo)",
        what: "Details will be added once fixes ship and disclosure is agreed.",
        status: "confirmed",
        links: [],
      },
      {
        short: "Identified a vulnerability in a blockchain payment platform\n(under embargo)",
        what: "Details will be added once fixes ship and disclosure is agreed.",
        status: "confirmed",
        links: [],
      },
    ],
  },
  {
    id: "x402",
    name: "x402",
    about: "An open protocol for paying for HTTP resources, with TypeScript, Python, and Go SDKs.",
    url: "https://github.com/x402-foundation/x402",
    did: "Fixed a V1 payment header that crashed the Python server, and a skipHandler path that skipped settlement across all three SDKs.",
    headline: "Payment-flow fixes across SDKs",
    kind: ["Web3", "Hardening"],
    tags: ["Payments", "Python", "Go"],
    contributions: [
      {
        short: "V1 payloads get a 402, not a 500",
        what: "Python resource server rejects V1 payloads with a 402 instead of failing with a 500.",
        status: "merged",
        links: [PR("x402-foundation/x402", 3715), "x402-python-reject-v1-payment-payload"],
      },
      {
        short: "skipHandler requests settle",
        what: "Requests that skip the handler settle like normal requests, checked against real escrow programs on forked chains.",
        status: "review",
        links: [PR("x402-foundation/x402", 3718), "x402-skip-handler-settlement"],
      },
    ],
  },
  {
    id: "stakefish",
    name: "stakefish",
    about: "An Ethereum staking provider's open-source validator monitor and Python web3 utilities.",
    url: "https://github.com/stakefish",
    did: "Fixed an epoch replay that never finished, RPC retries web3 7 broke, and a version gate that misread prereleases; reported release binaries that overwrite each other.",
    headline: "Validator monitoring & web3 utility fixes",
    kind: ["Ethereum", "Reliability"],
    tags: ["Ethereum", "Python", "Go"],
    contributions: [
      {
        short: "eth2-monitor: replay restart loop",
        what: "eth2-monitor: completed epoch replays no longer restart forever.",
        status: "review",
        links: [PR("stakefish/eth2-monitor", 33), "eth2-monitor-epoch-replay-restart-loop"],
      },
      {
        short: "eth2-monitor: release binaries overwrite",
        what: "eth2-monitor: release binaries for every OS were written to the same two file names.",
        status: "reported",
        links: [ISSUE("stakefish/eth2-monitor", 32), "eth2-monitor-release-binaries-overwrite"],
      },
      {
        short: "web3-utils: RPC timeout retry",
        what: "web3-utils: RPC timeout retries restored for web3 7, limited to read-only methods after review.",
        status: "review",
        links: [PR("stakefish/web3-utils.py", 52), "web3-utils-rpc-timeout-retry-web3rpcerror"],
      },
      {
        short: "web3-utils: prerelease version gate",
        what: "web3-utils: the CI version gate compares prerelease versions correctly.",
        status: "review",
        links: [PR("stakefish/web3-utils.py", 51), "web3-utils-version-gate-prerelease"],
      },
    ],
  },
  {
    id: "lineth",
    name: "Lineth",
    about: "An EVM layer 2 framework under LF Decentralized Trust, with a postman that relays L1 to L2 messages.",
    url: "https://github.com/LFDT-Lineth/lineth-monorepo",
    did: "Fixed the postman's cancel path for stuck claims, which crashed on Postgres fees read as strings and left deposits unclaimed.",
    headline: "Bridge postman: stuck-claim recovery fix",
    kind: ["Ethereum", "Reliability"],
    tags: ["Layer 2", "TypeScript", "PostgreSQL"],
    contributions: [
      {
        short: "postman: stuck claims never cancelled",
        what: "postman: claim tx fees read from Postgres as strings are converted to bigint, so a stuck claim can be cancelled and reset.",
        status: "review",
        links: [
          PR("LFDT-Lineth/lineth-monorepo", 4201),
          ISSUE("LFDT-Lineth/lineth-monorepo", 4200),
          "lineth-postman-stuck-claim-cancel-bigint",
        ],
      },
    ],
  },
  {
    id: "gosentry",
    name: "Gosentry",
    about: "Trail of Bits' security-focused Go toolchain for fuzzing.",
    url: "https://github.com/trailofbits/gosentry",
    did: "Found a LibAFL bug that stopped fuzzing while go test still passed. Fixed upstream the same day.",
    headline: "Silent fuzzer failure, fixed upstream",
    kind: ["Go", "Fuzzing"],
    tags: ["Fuzzing", "Go", "LibAFL"],
    contributions: [
      {
        short: "Silent LibAFL fuzzer failure",
        what: "Reported a LibAFL corpus bug where fuzzing stopped while go test still passed; fixed in #212.",
        status: "fixed",
        links: [
          ISSUE("trailofbits/gosentry", 210),
          PR("trailofbits/gosentry", 212),
          "reporting-a-libafl-corpus-id-bug-in-gosentry",
        ],
      },
    ],
  },
];

export const audiences: Audience[] = [
  {
    id: "lightning-labs",
    label: "Lightning Labs",
    fairing: "LIGHTNING",
    subline: "I build secure, observable cloud-native platforms.",
    title: "Platform Engineer",
    openTo: "Open to remote and overseas Platform Engineering roles",
    priority: ["private-eks", "aperture-metrics", "aperture-events", "lnd-short-reads", "pipeline-controls", "gosentry"],
    ossPriority: ["lnd", "aperture", "disclosure"],
  },
];
