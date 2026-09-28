/**
 * Single source of truth for the /launch portfolio page (and later the AI
 * assistant context). Evidence is either a blog post slug (the build fails
 * if it is missing, draft, or unlisted) or an external link.
 * See docs/portfolio-spec.md.
 */

export type StageId = "design" | "build" | "ship" | "operate";

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
  /** Standards and methods behind the stage, shown under its heading. */
  flightRules?: FlightRule[];
  /** Green callout lines for a stage with no fault before it. */
  notes?: string[];
};

export type Audience = {
  id: string;
  label: string;
  subline: string;
  /** Open-source entry ids shown first in the summary. */
  ossPriority?: string[];
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
  /** Full-screen quote after Operate: the question the summary then answers. */
  quote: {
    text: "Know the enemy and know yourself, and you will not be imperiled in a hundred battles.",
    by: "Sun Tzu",
    question: "How well do you know your organization's security activities?",
  },
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
    id: "design",
    rocketStage: "build",
    event: "T-00:10  DESIGN REVIEW",
    name: "Design",
    governing: "I put security into the design before anything gets built.",
    support:
      "Threat models, blast-radius maps, and requirements for three AWS reference architectures, plus IDMZ and OT network design for industrial sites at IBM.",
    flightRules: [
      { label: "STRIDE", slug: "threat-modeling" },
      { label: "NIST SP 800-53" },
      { label: "OWASP ASVS" },
    ],
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
    governing: "I build platforms that are secure before the first workload ships.",
    support:
      "A private EKS validator with no public Kubernetes API and no static credentials, and a key management policy I wrote against NIST SP 800-57, a habit from auditing PKI systems at Deloitte.",
  },
  {
    id: "ship",
    event: "T+01:12  STAGE 1 SEP",
    name: "Deploy",
    governing: "I make pipelines prove their own integrity, and I fix what I find upstream.",
    support:
      "24 controls mapped to 12 threat areas in my own CI/CD, plus contributions to SEAL and OSCAL Compass, and a fuzzer bug in Trail of Bits' Gosentry fixed the same day.",
  },
  {
    id: "operate",
    event: "T+04:38  STAGE 2 SEP",
    name: "Operate",
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

export const cards: Card[] = [
  // ---------- Design ----------
  {
    id: "ibm-ot-design",
    stage: "design",
    zone: "field",
    title: "OT security design at IBM",
    summary:
      "Designed and built IDMZs between IT and OT networks, reworked network segmentation, and ran risk assessments for a global heavy-equipment maker, a nuclear power company, and a semiconductor manufacturer.",
    evidence: [],
  },
  {
    id: "security-requirements",
    stage: "design",
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
    id: "review-ecs-saas",
    stage: "design",
    zone: "test",
    title: "Security Design Review - ECS SaaS",
    summary:
      "STRIDE across nine trust boundaries, blast radius per tenant, and requirements gated in CI/CD.",
    evidence: [{ label: "ECS SaaS series", url: "/tags/ecs-saas/" }],
  },
  {
    id: "review-eks-saas",
    stage: "design",
    zone: "test",
    title: "Security Design Review - EKS SaaS",
    summary:
      "Namespace-per-tenant isolation, IRSA, and a shared control plane, worked through from threat model to CI/CD gates.",
    evidence: [{ label: "EKS SaaS series", url: "/tags/eks-saas/" }],
  },
  {
    id: "review-serverless",
    stage: "design",
    zone: "test",
    title: "Security Design Review - Serverless",
    summary: "A movie-voting sample taken from service profile to ISMS-P and GDPR overlays.",
    evidence: [{ label: "Serverless series", url: "/tags/serverless/" }],
  },

  // ---------- Build ----------
  {
    id: "deloitte-pki",
    stage: "build",
    zone: "field",
    title: "PKI digital signature audits",
    summary:
      "At Deloitte, assessed a digital signature and certificate service (cryptographic controls, access, key lifecycle) and drafted Appendices 2-3 of the Digital Signature Certification Service Evaluation Guide v1.4.0.",
    evidence: [
      {
        label: "Digital Signature Certification Service Evaluation Guide (Deloitte)",
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

  // ---------- Deploy ----------
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
    title: "Gosentry: a fuzzer that died silently",
    summary:
      "Reported a LibAFL corpus bug in Trail of Bits' Gosentry where fuzzing stopped but go test still passed; fixed the same day.",
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
      "Fixed a KeyError in compliance-trestle (merged) and opened a GitHub Actions DevSecOps pipeline plugin for compliance-to-policy.",
    evidence: [
      { label: "compliance-trestle PR #2222", url: "https://github.com/oscal-compass/compliance-trestle/pull/2222" },
      { label: "compliance-to-policy PR #51", url: "https://github.com/oscal-compass/compliance-to-policy/pull/51" },
      "nist-oscal-and-associated-projects",
    ],
  },
  {
    id: "lnd-short-reads",
    stage: "ship",
    zone: "oss",
    title: "LND: short reads in address decoders",
    summary: "Reported that LND's fixed-width node announcement address decoders accept short reads.",
    evidence: [{ label: "Issue #11211", url: "https://github.com/lightningnetwork/lnd/issues/11211" }],
  },

  // ---------- Operate ----------
  {
    id: "army-automation",
    stage: "operate",
    zone: "field",
    title: "Corps CERT, Republic of Korea Army",
    summary:
      "Tuned Splunk detection rules to cut false positives, ran first-line incident response, and built an interactive security awareness game (2nd place, Army education competition). Selected for the Elite 300 Cyber Warriors.",
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

/** Newest first; from the resume. Rendered as a vertical timeline. */
export const career = [
  {
    period: "Nov 2024 – Sep 2026",
    role: "Cybersecurity Consultant",
    keywords: ["EU CRA", "OT security", "ISMS-P"],
    org: "IBM Consulting Korea",
    logo: "ibm",
    bullets: [
      "Led a product security maturity assessment and roadmap aligned with the EU Cyber Resilience Act, presented to C-level leadership",
      "Designed and deployed iDMZ and OT security across heavy-equipment, nuclear, and semiconductor sites",
      "Built detection logic and monitoring use cases with IBM's global OT SOC",
      "Assessed AWS environments against ISMS-P",
    ],
  },
  {
    period: "Mar 2024 – Nov 2024",
    role: "Sr. Security Consultant",
    keywords: ["ISO 27001", "PKI", "Evaluation guide"],
    org: "Deloitte Consulting Korea",
    logo: "deloitte",
    bullets: [
      "Ran an ISO 27001 certification audit: gap analysis, control effectiveness, remediation validation",
      "Assessed a digital signature and certificate service: cryptographic controls, access, key lifecycle",
      "Drafted Appendices 2–3 of the Digital Signature Certification Service Evaluation Guide v1.4.0",
      "Reviewed AWS architecture and controls against compliance frameworks",
    ],
  },
  {
    period: "Jun 2023 – Feb 2024",
    role: "Vulnerability Analysis Track",
    keywords: ["Vulnerability analysis", "CIEM", "Multi-cloud IAM"],
    org: "KITRI Best of the Best (BoB) 12th",
    logo: "kitri",
    bullets: [
      "Selected for a national program with a ~3% acceptance rate",
      "Led a multi-cloud CIEM platform with an IAM policy normalization engine for AWS, Azure, and GCP",
      "Published research on the IAM translation engine; the project became a startup",
    ],
  },
  {
    period: "Dec 2021 – Mar 2023",
    role: "Signal Officer (Captain), Corps CERT",
    keywords: ["Corps CERT", "Splunk", "Incident response"],
    org: "Republic of Korea Army",
    logo: "rok-army",
    bullets: [
      "Selected for the Army's Elite 300 Cyber Warriors",
      "Tuned Splunk dashboards and detection rules, cutting false positives",
      "Ran first-line incident response: evidence, interviews, timelines, reports",
      "2nd place in a cybersecurity education competition with a web-based awareness game",
    ],
  },
  {
    period: "Mar 2018 – Dec 2021",
    role: "Signal Officer (Lieutenant), Network Platoon Leader",
    keywords: ["Network ops", "25-member platoon", "#1 of 24"],
    org: "Republic of Korea Army",
    logo: "rok-army",
    bullets: [
      "Led a 25-member signal platoon responsible for military network availability and security",
      "Ranked #1 of 24 signal sites in a corps-level readiness evaluation",
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

export const tiles: { id: TileId; title: string; stat: string; label: string }[] = [
  { id: "career", title: "Career", stat: "5+", label: "Years in security" },
  // oss and credentials stats are computed in the page
  { id: "oss", title: "Open source", stat: "", label: "Open-source contributions" },
  { id: "credentials", title: "Credentials", stat: "", label: "Credentials" },
];

/** Hero tech stack, one row per area. */
export const stack = [
  { area: "Cloud", items: ["AWS", "Azure", "GCP"] },
  { area: "Container", items: ["Kubernetes (EKS)", "Helm", "Docker"] },
  { area: "CI/CD", items: ["GitHub Actions", "ArgoCD", "FluxCD"] },
  { area: "IaC", items: ["Terraform"] },
  { area: "Supply chain", items: ["Sigstore/Cosign", "SBOM", "Trivy"] },
  { area: "Policy", items: ["OPA", "Kyverno", "OSCAL"] },
  { area: "Secrets", items: ["Vault", "AWS KMS"] },
  { area: "Observability", items: ["Prometheus", "Grafana", "Loki", "OpenTelemetry", "Fluent Bit"] },
  { area: "GRC", items: ["PKI", "ISO 27001", "ISMS-P", "EU CRA", "NIST SSDF", "NIST SP 800-204"] },
];

/** "How I work" lines under the stat cards; "{oss}" is the computed open-source total. */
export const traits = [
  {
    name: "Self-starter",
    line: "I get to security problems before they ship.",
    proof:
      "Maintainer of the Supply Chain section of the SEAL Frameworks, with {oss} contributions and 2 vulnerability reports sent upstream.",
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
export type ContributionStatus = "merged" | "open" | "proposed" | "reported" | "fixed" | "embargo";

export const statusLabel: Record<ContributionStatus, string> = {
  merged: "Merged",
  open: "Open PR",
  proposed: "Proposed",
  reported: "Reported",
  fixed: "Fixed upstream",
  embargo: "Under embargo",
};

export type Contribution = {
  what: string;
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
  /** Broad domain badges shown on the row, e.g. Cloud, Security, Blockchain. */
  kind: string[];
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
    kind: ["Cloud", "Security"],
    tags: ["Azure", "GCP", "CSPM"],
    contributions: [
      {
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
    did: "Maintainer of the Supply Chain section. Wrote the Policy as Code and private registries sections, both merged. An endpoint compromise runbook is in review.",
    headline: "Policy as Code & supply-chain guidance",
    kind: ["Blockchain", "Security"],
    tags: ["Policy as Code", "Supply chain", "Incident response"],
    contributions: [
      {
        what: "Policy as Code enforced through the CI/CD pipeline.",
        status: "merged",
        links: [PR("security-alliance/frameworks", 592), "policy-as-code-seal-frameworks"],
      },
      {
        what: "Private registries and package mirrors, so builds pull only reviewed artifacts.",
        status: "merged",
        links: [PR("security-alliance/frameworks", 627), "private-registries-and-mirrors-seal-frameworks"],
      },
      {
        what: "An endpoint compromise runbook for incident management.",
        status: "open",
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
    kind: ["Compliance"],
    tags: ["OSCAL", "Compliance as Code", "CI/CD"],
    contributions: [
      {
        what: "Fixed an ssp-generate KeyError on a missing profile-param-value-origin in compliance-trestle.",
        status: "merged",
        links: [PR("oscal-compass/compliance-trestle", 2222)],
      },
      {
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
    did: "Reported that the fixed-width decoders for node announcement addresses accept short reads.",
    headline: "Short-read bug in address decoders",
    kind: ["Blockchain"],
    tags: ["Lightning", "Go", "Input validation"],
    contributions: [
      {
        what: "Found that the fixed-width node announcement address decoders accept short reads.",
        status: "reported",
        links: [ISSUE("lightningnetwork/lnd", 11211)],
      },
    ],
  },
  {
    id: "aperture",
    name: "Aperture",
    about: "Lightning Labs' reverse proxy that gates APIs behind L402 payments.",
    url: "https://github.com/lightninglabs/aperture",
    did: "Proposed per-outcome Prometheus metrics and a dedicated security event log. Opened a fix for a flaky test.",
    headline: "L402 metrics & security events",
    kind: ["Blockchain"],
    tags: ["Lightning", "L402", "Observability"],
    contributions: [
      {
        what: "Per-outcome Prometheus counters for the L402 mint and verify paths.",
        status: "proposed",
        links: [ISSUE("lightninglabs/aperture", 286), "aperture-l402-metrics-before-and-after"],
      },
      {
        what: "Dedicated security event logging that keeps raw macaroons and preimages out of logs.",
        status: "proposed",
        links: [ISSUE("lightninglabs/aperture", 291), "aperture-l402-security-events-monitoring-proposal"],
      },
      {
        what: "A fix for a rare (1 in 256) flake in TestTamperedL402.",
        status: "open",
        links: [PR("lightninglabs/aperture", 285)],
      },
    ],
  },
  {
    // Undisclosed reports: vendor only. No product, date, severity, or link
    // until fixes ship and disclosure is agreed.
    id: "disclosure",
    name: "Coordinated disclosure",
    about: "Private reports to Lightning Labs, held until fixes ship.",
    did: "Product names and details stay private until fixes ship.",
    headline: "2 vulnerabilities reported to Lightning Labs",
    kind: ["Blockchain", "Security"],
    tags: ["Responsible disclosure", "Lightning"],
    contributions: [
      {
        what: "Details will be added once fixes ship and disclosure is agreed.",
        count: 2,
        status: "embargo",
        links: [],
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
    kind: ["Security"],
    tags: ["Fuzzing", "Go", "LibAFL"],
    contributions: [
      {
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
    subline:
      "Kubernetes in production, observability that operators can act on, and hands-on work with Aperture and the Lightning stack.",
    priority: ["private-eks", "aperture-metrics", "aperture-events", "lnd-short-reads", "pipeline-controls", "secrets-and-keys", "gosentry"],
    ossPriority: ["lnd", "aperture", "disclosure"],
  },
];
