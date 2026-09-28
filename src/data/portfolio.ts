/**
 * Single source of truth for the /launch portfolio page (and later the AI
 * assistant context). Evidence is either a blog post slug (the build fails
 * if it is missing, draft, or unlisted) or an external link.
 * See docs/portfolio-spec.md.
 */

export type StageId = "build" | "ship" | "operate";

/** Where the work came from; each stage shows one lane per zone. */
export type ZoneId = "field" | "test" | "oss";

export type Zone = { id: ZoneId; name: string; icon: string; blurb: string };

export const zones: Zone[] = [
  { id: "field", name: "Field Missions", icon: "◆", blurb: "delivered on the job" },
  { id: "test", name: "Test Flights", icon: "▲", blurb: "personal projects, built and run end to end" },
  { id: "oss", name: "Proactive Minds", icon: "●", blurb: "open-source work, contributed or reported upstream" },
];

export type FlightRule = { label: string; slug?: string };

/** A blog post slug, or an external link. */
export type Evidence = string | { label: string; url: string };

export type Card = {
  id: string;
  stage: StageId;
  zone: ZoneId;
  title: string;
  summary: string;
  evidence: Evidence[];
  flightRules?: FlightRule[];
};

/** One HUD systems readout; `source` is the post the number comes from. */
export type Readout = { label: string; value: string; source: string };

export type Stage = {
  id: StageId;
  /** Shown in the HUD systems line while this stage is active. */
  readouts: Readout[];
  /** Telemetry label shown in the HUD and section header. */
  event: string;
  name: string;
  /** The stage's claim; the log entries below are its evidence. */
  governing: string;
  /** One line on how the evidence backs the claim. */
  support: string;
  /** Standards and methods behind the stage, shown under its heading. */
  flightRules?: FlightRule[];
};

export type Audience = {
  id: string;
  label: string;
  subline: string;
  /** Replaces identity.fairing on the rocket. Keep it to ~9 characters. */
  fairing?: string;
  /** Card ids shown first, in this order. Others keep their default order. */
  priority: string[];
};

export const identity = {
  name: "Jinsoo Yang",
  handle: "s1ns3nz0",
  headline: "Launch your product securely.",
  /** Painted on the rocket fairing: the thing that actually reaches orbit. */
  fairing: "PRODUCT",
  subline:
    "I build the platform, secure the pipeline that ships to it, and watch it once it's running.",
  roles: ["Platform Engineer", "DevSecOps Engineer", "Security Engineer"],
};

/** Fairing lettering length in rocket viewBox units; the nose is narrow. */
export const fairingTextLength = (label: string) =>
  Math.min(48, Math.max(30, label.length * 5.2));

export const stages: Stage[] = [
  {
    id: "build",
    readouts: [
      { label: "Public API", value: "0", source: "eks-security-controls-implemented-in-the-cluster-design" },
      { label: "Namespaces", value: "4", source: "kubernetes-namespace-design-for-a-hoodi-validator" },
      { label: "Secrets", value: "Vault+KMS", source: "vault-architecture-on-kubernetes" },
    ],
    event: "T-00:10  PAD CHECKS",
    name: "Build",
    governing: "I build platforms that are secure before the first workload ships.",
    support:
      "A private EKS validator with no public Kubernetes API and no static credentials, and a key management policy I wrote against NIST SP 800-57, a habit from auditing PKI systems at Deloitte.",
  },
  {
    id: "ship",
    readouts: [
      { label: "Pipeline ctrl", value: "24", source: "ci-cd-security-controls-implemented-in-the-pipeline-design" },
      { label: "Threat areas", value: "12", source: "ci-cd-security-controls-implemented-in-the-pipeline-design" },
      { label: "Actions", value: "SHA-pinned", source: "ci-cd-security-controls-implemented-in-the-pipeline-design" },
    ],
    event: "T+01:12  STAGE 1 SEP",
    name: "Ship",
    governing: "I make pipelines prove their own integrity, and I fix what I find upstream.",
    support:
      "24 controls mapped to 12 threat areas in my own CI/CD, plus contributions to SEAL and OSCAL Compass, and a fuzzer bug in Trail of Bits' gosentry fixed the same day.",
  },
  {
    id: "operate",
    readouts: [
      { label: "L402 outcomes", value: "6+10", source: "aperture-l402-metrics-before-and-after" },
      { label: "Audit sources", value: "4", source: "audit-and-logging-architecture-for-hoodi-node-validator" },
      { label: "Archive", value: "Immutable", source: "audit-and-logging-architecture-for-hoodi-node-validator" },
    ],
    event: "T+04:38  STAGE 2 SEP",
    name: "Operate & Defend",
    governing: "I make running systems observable, and cheap enough to keep defending.",
    support:
      "Per-outcome L402 metrics for Lightning Labs' Aperture, a tamper-evident audit trail, and controls I cut when they cost more than they protected.",
    flightRules: [
      { label: "MITRE ATT&CK", slug: "palantir-ads" },
      { label: "CACAO", slug: "cacao-playbook" },
      { label: "CISA playbooks", slug: "cisa-incident-vulnerability-response-playbooks" },
    ],
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
  /** Short HUD form; `resolution` is the full sentence (tooltip). */
  fix: string;
  resolution: string;
  motion: "overheat" | "sputter" | "wobble" | "fairing";
  source: string;
  anchor?: string;
};

const LESSONS = "prioritizing-security-controls-hoodi-validator-lessons";

export const anomalies: Anomaly[] = [
  {
    id: "cost-overrun",
    resolvesAt: "build",
    caution: "Cost overrun",
    fix: "Simplified",
    resolution: "Architecture simplified",
    motion: "overheat",
    source: LESSONS,
    anchor: "2-the-architecture-became-too-expensive-to-operate",
  },
  {
    id: "insecure-cicd",
    resolvesAt: "ship",
    caution: "Insecure CI/CD",
    fix: "Hardened",
    resolution: "Pipeline hardened: 24 controls",
    motion: "sputter",
    source: "ci-cd-security-controls-implemented-in-the-pipeline-design",
    anchor: "threat-mapped-implementation",
  },
  {
    id: "anomaly-detected",
    resolvesAt: "operate",
    caution: "Anomaly detected",
    fix: "Contained",
    resolution: "Triaged with ADS, contained",
    motion: "wobble",
    source: "palantir-ads",
  },
  {
    id: "ai-over-reliance",
    resolvesAt: "orbit",
    caution: "AI over-reliance",
    fix: "Human-reviewed",
    resolution: "Answers human-reviewed",
    motion: "fairing",
    source: LESSONS,
    anchor: "4-i-relied-too-much-on-ai",
  },
];

const GH = "https://github.com/s1ns3nz0";

export const cards: Card[] = [
  // ---------- Build ----------
  {
    id: "deloitte-pki",
    stage: "build",
    zone: "field",
    title: "PKI digital signature audits",
    summary:
      "At Deloitte, audited PKI-based digital signature systems and contributed to the Digital Signature System Audit Assessment Guide v1.4.0, built on WebTrust criteria.",
    evidence: [
      {
        label: "Digital Signature Audit Assessment Guide (Deloitte)",
        url: "https://www.deloitte.com/kr/ko/services/consulting/perspectives/crisis-management-article-20201230.html",
      },
    ],
  },
  {
    id: "private-eks",
    stage: "build",
    zone: "test",
    title: "Private EKS for an Ethereum validator",
    summary:
      "Designed and ran a Hoodi testnet validator (Prysm, Nethermind) on a private EKS cluster with namespace isolation, workload identity, and private image delivery.",
    evidence: [
      { label: "node-operator-public on GitHub", url: `${GH}/node-operator-public` },
      "hoodi-node-validator-aws-architecture-overview",
      "securing-a-hoodi-ethereum-testnet-validator-on-aws-eks",
      "eks-security-controls-implemented-in-the-cluster-design",
      "kubernetes-namespace-design-for-a-hoodi-validator",
      "private-ecr-delivery-architecture-for-private-eks",
    ],
  },
  {
    id: "secrets-and-keys",
    stage: "build",
    zone: "test",
    title: "Secrets and identity with Vault",
    summary:
      "Vault on Kubernetes with KMS auto-unseal, cert-manager for TLS, and workload identity so no application holds a static credential.",
    evidence: [
      "vault-architecture-on-kubernetes",
      "vault-secret-management-for-hoodi-validator",
      "cert-manager-and-vault-roles-scope-and-collaboration",
      "identity-management-in-this-project",
    ],
  },
  {
    id: "kms-policy",
    stage: "build",
    zone: "test",
    title: "Web3 key management policy",
    summary:
      "An 18-section key management policy for validator infrastructure, aligned with NIST SP 800-57 and SP 800-131A and published as an OSCAL catalog.",
    evidence: [
      { label: "kms-policy on GitHub", url: `${GH}/kms-policy` },
      "validator-key-types-and-key-management-policy-for-a-hoodi-validator",
      "web3-key-management-policy-applied-to-my-hoodi-validator",
      "converting-the-web3-key-management-policy-to-oscal",
    ],
    flightRules: [
      {
        label: "NIST SP 800-57",
        slug: "nist-sp-800-57-and-sp-800-131a-in-the-web3-key-management-policy",
      },
      { label: "OSCAL", slug: "converting-the-web3-key-management-policy-to-oscal" },
    ],
  },

  // ---------- Ship ----------
  {
    id: "pipeline-controls",
    stage: "ship",
    zone: "test",
    title: "Pipeline security controls",
    summary:
      "Controls from token permissions to release signing, each paired with the threat it answers and how it's implemented.",
    evidence: [
      "ci-cd-security-controls-implemented-in-the-pipeline-design",
      "secure-build",
      "securing-workflows-in-ci-pipelines-secure-code-commits",
      "securing-workflows-in-cd-pipelines",
      "security-review-process-for-private-repositories",
    ],
    flightRules: [
      { label: "NIST SP 800-218 (SSDF)", slug: "nist-sp-218-ssdf" },
      { label: "NIST SP 800-204D", slug: "relationship-between-nist-sp-800-218-and-sp-800-204-d" },
    ],
  },
  {
    id: "security-requirements",
    stage: "ship",
    zone: "test",
    title: "Security Requirements plugin",
    summary:
      "An AI plugin that derives service-specific security requirements from a service's context, users, and compliance obligations, with Kubernetes analysis and blast-radius mapping.",
    evidence: [
      { label: "security-requirements on GitHub", url: `${GH}/security-requirements` },
      "security-requirements-plugin",
      "security-requirements-plugin-kubernetes-analysis",
      "security-requirements-plugin-blast-radius",
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
    id: "seal-registries",
    stage: "ship",
    zone: "oss",
    title: "SEAL Frameworks: private registries and mirrors",
    summary: "Guidance on private registries and package mirrors so builds pull only reviewed artifacts.",
    evidence: ["private-registries-and-mirrors-seal-frameworks"],
  },
  {
    id: "gosentry",
    stage: "ship",
    zone: "oss",
    title: "gosentry: a fuzzer that died silently",
    summary:
      "Reported a LibAFL corpus bug in Trail of Bits' gosentry where fuzzing stopped but go test still passed; fixed the same day.",
    evidence: [
      "reporting-a-libafl-corpus-id-bug-in-gosentry",
      { label: "Issue #210", url: "https://github.com/trailofbits/gosentry/issues/210" },
    ],
  },
  {
    id: "oscal-compass",
    stage: "ship",
    zone: "oss",
    title: "OSCAL Compass",
    summary:
      "Added a GitHub Actions integration for Compliance-to-Policy workflows and fixed a KeyError in compliance-trestle.",
    evidence: [
      { label: "compliance-trestle PR #2222", url: "https://github.com/oscal-compass/compliance-trestle/pull/2222" },
      "nist-oscal-and-associated-projects",
    ],
  },

  // ---------- Operate & Defend ----------
  {
    id: "army-automation",
    stage: "operate",
    zone: "field",
    title: "Security automation in the Army Signal Corps",
    summary:
      "As a platoon leader, wrote security-check automation scripts and a game-based security awareness program; won an Army cybersecurity competition.",
    evidence: [],
  },
  {
    id: "audit-logging",
    stage: "operate",
    zone: "test",
    title: "Audit and logging architecture",
    summary:
      "CloudTrail, AWS Config, Fluent Bit, and Vault audit feeding an immutable, KMS-protected archive with cross-region recovery.",
    evidence: ["audit-and-logging-architecture-for-hoodi-node-validator"],
  },
  {
    id: "compliance-ops",
    stage: "operate",
    zone: "test",
    title: "Compliance Ops dashboard",
    summary:
      "An OSCAL-based dashboard that tracks controls, policies, evidence, and owners, with an MCP interface for Slack and Jira.",
    evidence: [{ label: "compliance-ops on GitHub", url: `${GH}/compliance-ops` }],
  },
  {
    id: "prioritization",
    stage: "operate",
    zone: "test",
    title: "Risk-based prioritization",
    summary:
      "Lessons on deployment speed, infrastructure cost, and operational burden: a control that is too expensive or too hard to run is not a good control.",
    evidence: ["prioritizing-security-controls-hoodi-validator-lessons"],
  },
  {
    id: "aperture-metrics",
    stage: "operate",
    zone: "oss",
    title: "Aperture: L402 metrics",
    summary: "Per-outcome Prometheus counters for Aperture's L402 mint and verify paths (issue #286).",
    evidence: [
      "aperture-l402-metrics-before-and-after",
      { label: "Issue #286", url: "https://github.com/lightninglabs/aperture/issues/286" },
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

export const career = [
  {
    role: "Captain, Republic of Korea Army Signal Corps",
    detail:
      "Led a platoon of about 20. First place in a communications-site deployment evaluation; won an Army cybersecurity competition.",
  },
  {
    role: "Deloitte",
    detail:
      "Audited PKI-based digital signature systems; contributed to the Digital Signature System Audit Assessment Guide v1.4.0 (WebTrust-based).",
  },
  {
    role: "IBM",
    detail: "Security consulting for global clients.",
  },
];

export const certifications = [
  { name: "Kubestronaut (CKA, CKAD, CKS, KCNA, KCSA)", count: 5 },
  { name: "AWS Certified Security - Specialty", count: 1 },
  { name: "AWS Certified Solutions Architect - Professional", count: 1 },
  { name: "AWS Certified CloudOps Engineer - Associate", count: 1 },
];

export const openSource = [
  { name: "Prowler", url: "https://github.com/prowler-cloud/prowler" },
  { name: "SEAL Frameworks", url: "https://github.com/security-alliance/frameworks" },
  { name: "OSCAL Compass", url: "https://github.com/oscal-compass/compliance-trestle" },
  { name: "Aperture (Lightning Labs)", url: "https://github.com/lightninglabs/aperture" },
  { name: "gosentry (Trail of Bits)", url: "https://github.com/trailofbits/gosentry" },
];

export const audiences: Audience[] = [
  {
    id: "lightning-labs",
    label: "Lightning Labs",
    fairing: "LIGHTNING",
    subline:
      "Kubernetes in production, observability that operators can act on, and hands-on work with Aperture and the Lightning stack.",
    priority: ["private-eks", "aperture-metrics", "aperture-events", "pipeline-controls", "secrets-and-keys", "gosentry"],
  },
];
