/**
 * Single source of truth for the /launch portfolio page (and later the AI
 * assistant context). Evidence and flight-rule links reference blog post
 * slugs; the page build fails if a slug is missing, draft, or unlisted.
 * See docs/portfolio-spec.md.
 */

export type StageId = "build" | "ship" | "operate";

export type FlightRule = { label: string; slug?: string };

export type Card = {
  id: string;
  stage: StageId;
  title: string;
  summary: string;
  evidence: string[];
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
  tagline: string;
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
    tagline: "A platform that is safe to launch from.",
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
    tagline: "Every change reaches production through a pipeline I can trust.",
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
    tagline: "Once it's up, I can see it, and I can respond.",
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

export const cards: Card[] = [
  // Build
  {
    id: "private-eks",
    stage: "build",
    title: "Private EKS for an Ethereum validator",
    summary:
      "Designed and ran a Hoodi testnet validator (Prysm, Nethermind) on a private EKS cluster with namespace isolation, workload identity, and private image delivery.",
    evidence: [
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
    title: "Secrets and validator keys",
    summary:
      "Vault on Kubernetes with KMS auto-unseal and cert-manager for TLS, plus a written key management policy for validator keys that maps back to NIST guidance.",
    evidence: [
      "vault-architecture-on-kubernetes",
      "vault-secret-management-for-hoodi-validator",
      "cert-manager-and-vault-roles-scope-and-collaboration",
      "identity-management-in-this-project",
      "validator-key-types-and-key-management-policy-for-a-hoodi-validator",
    ],
    flightRules: [
      {
        label: "NIST SP 800-57",
        slug: "nist-sp-800-57-and-sp-800-131a-in-the-web3-key-management-policy",
      },
      { label: "OSCAL", slug: "converting-the-web3-key-management-policy-to-oscal" },
    ],
  },

  // Ship
  {
    id: "pipeline-controls",
    stage: "ship",
    title: "Pipeline security controls",
    summary:
      "Controls from token permissions to release signing, each paired with the threat it answers and how it's implemented.",
    evidence: [
      "ci-cd-security-controls-implemented-in-the-pipeline-design",
      "secure-build",
      "securing-workflows-in-ci-pipelines-secure-code-commits",
      "securing-workflows-in-cd-pipelines",
    ],
    flightRules: [
      { label: "NIST SP 800-218 (SSDF)", slug: "nist-sp-218-ssdf" },
      { label: "NIST SP 800-204D", slug: "relationship-between-nist-sp-800-218-and-sp-800-204-d" },
    ],
  },
  {
    id: "open-source",
    stage: "ship",
    title: "Open source contributions",
    summary:
      "28 Azure and GCP security checks added to Prowler, Policy as Code and registry guidance for the SEAL frameworks, a fuzzer bug in Trail of Bits' gosentry, and L402 metrics for Lightning Labs' Aperture.",
    evidence: [
      "reporting-a-libafl-corpus-id-bug-in-gosentry",
      "aperture-l402-metrics-before-and-after",
      "policy-as-code-seal-frameworks",
      "private-registries-and-mirrors-seal-frameworks",
      "adding-azure-aks-defender-check-to-prowler",
    ],
  },
  {
    id: "supply-chain",
    stage: "ship",
    title: "Supply chain and private registries",
    summary:
      "Private registries and package mirrors, plus a process for reviewing, approving, and reassessing third-party artifacts before internal use.",
    evidence: [
      "private-registries-and-mirrors-seal-frameworks",
      "security-review-process-for-private-repositories",
      "ai-supply-chain-attacks",
    ],
  },

  // Operate & Defend
  {
    id: "l402-observability",
    stage: "operate",
    title: "Observability for L402 authentication",
    summary:
      "Per-outcome Prometheus counters for Aperture's mint and verify paths, and a proposal for structured security events that never store raw credentials.",
    evidence: [
      "aperture-l402-metrics-before-and-after",
      "aperture-l402-security-events-monitoring-proposal",
    ],
  },
  {
    id: "audit-logging",
    stage: "operate",
    title: "Audit and logging architecture",
    summary:
      "CloudTrail, AWS Config, Fluent Bit, and Vault audit feeding an immutable, KMS-protected archive with cross-region recovery.",
    evidence: ["audit-and-logging-architecture-for-hoodi-node-validator"],
  },
  {
    id: "detection-response",
    stage: "operate",
    title: "Detection and response",
    summary:
      "Detection engineering with Palantir's ADS framework, and incident and vulnerability response playbooks in CACAO and CISA formats.",
    evidence: [
      "palantir-ads",
      "cacao-playbook",
      "cisa-incident-vulnerability-response-playbooks",
    ],
    flightRules: [{ label: "MITRE ATT&CK", slug: "palantir-ads" }],
  },
  {
    id: "prioritization",
    stage: "operate",
    title: "Risk-based prioritization",
    summary:
      "Lessons on deployment speed, infrastructure cost, and operational burden: a control that is too expensive or too hard to run is not a good control.",
    evidence: ["prioritizing-security-controls-hoodi-validator-lessons"],
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
    priority: ["private-eks", "l402-observability", "open-source", "secrets-and-keys", "pipeline-controls"],
  },
];
