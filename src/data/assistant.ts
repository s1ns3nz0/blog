/**
 * The satellite assistant on /launch. v2 serves reviewed, pre-written
 * answers only: no model call, nothing typed leaves the browser. Sources
 * are blog post slugs, validated at build like the portfolio evidence.
 * Placeholder content until the full resume upload; see
 * docs/portfolio-spec.md.
 */

export type Chip = {
  id: string;
  question: string;
  answer: string;
  sources: string[];
  /** Audience ids from portfolio.ts; "default" when no ?for= matches. */
  audiences: string[];
};

export const chips: Chip[] = [
  // default
  {
    id: "built-end-to-end",
    audiences: ["default"],
    question: "What has he built end to end?",
    answer:
      "An Ethereum Hoodi testnet validator on AWS: a private EKS cluster with namespace isolation and workload identity, Vault with KMS auto-unseal for secrets, private image delivery through ECR, and an audit and logging pipeline that feeds an immutable archive.",
    sources: [
      "hoodi-node-validator-aws-architecture-overview",
      "eks-security-controls-implemented-in-the-cluster-design",
      "audit-and-logging-architecture-for-hoodi-node-validator",
    ],
  },
  {
    id: "secure-pipeline",
    audiences: ["default"],
    question: "How does he secure a CI/CD pipeline?",
    answer:
      "Control by control, each tied to the threat it answers: scoped token permissions, protected workflows, isolated builds, and signed releases. He maps the pipeline against NIST SP 800-218 (SSDF) and SP 800-204D.",
    sources: [
      "ci-cd-security-controls-implemented-in-the-pipeline-design",
      "relationship-between-nist-sp-800-218-and-sp-800-204-d",
    ],
  },
  {
    id: "open-source",
    audiences: ["default", "lightning-labs"],
    question: "What open source has he contributed to?",
    answer:
      "28 Azure and GCP checks for Prowler, Policy as Code and private-registry guidance for the SEAL frameworks, a fuzzer bug report in Trail of Bits' gosentry (fixed the same day), and per-outcome L402 metrics for Lightning Labs' Aperture.",
    sources: [
      "reporting-a-libafl-corpus-id-bug-in-gosentry",
      "aperture-l402-metrics-before-and-after",
      "policy-as-code-seal-frameworks",
    ],
  },
  {
    id: "secrets-keys",
    audiences: ["default"],
    question: "How does he handle secrets and keys?",
    answer:
      "Vault on Kubernetes delivers secrets to workloads, cert-manager handles TLS, and validator keys follow a written key management policy aligned with NIST SP 800-57, also published as an OSCAL catalog.",
    sources: [
      "vault-secret-management-for-hoodi-validator",
      "validator-key-types-and-key-management-policy-for-a-hoodi-validator",
      "converting-the-web3-key-management-policy-to-oscal",
    ],
  },

  // lightning-labs
  {
    id: "kubernetes",
    audiences: ["lightning-labs"],
    question: "How has he run Kubernetes?",
    answer:
      "He designed and operated a private EKS cluster for a validator: namespace boundaries per workload, workload identity instead of static credentials, and images pulled only from a private registry.",
    sources: [
      "securing-a-hoodi-ethereum-testnet-validator-on-aws-eks",
      "kubernetes-namespace-design-for-a-hoodi-validator",
      "private-ecr-delivery-architecture-for-private-eks",
    ],
  },
  {
    id: "aperture",
    audiences: ["lightning-labs"],
    question: "What has he done with Aperture and L402?",
    answer:
      "He added per-outcome Prometheus counters to Aperture's L402 mint and verify paths (issue #286), and proposed structured security events that keep raw macaroons and preimages out of logs.",
    sources: [
      "aperture-l402-metrics-before-and-after",
      "aperture-l402-security-events-monitoring-proposal",
    ],
  },
  {
    id: "observability",
    audiences: ["lightning-labs"],
    question: "How does he approach observability?",
    answer:
      "Count outcomes by cause so operators can act without grepping DEBUG logs, and keep audit evidence tamper-resistant: CloudTrail, AWS Config, Fluent Bit, and Vault audit feeding a KMS-protected archive.",
    sources: [
      "aperture-l402-metrics-before-and-after",
      "audit-and-logging-architecture-for-hoodi-node-validator",
    ],
  },
];

export const privacyNote =
  "Answers here are pre-written and reviewed. Free-form questions (coming soon) will go to a free third-party model that may log prompts, so please don't enter personal information.";

/** "How this assistant is secured": the product's own security design. */
export const securityDesign = [
  {
    title: "Now",
    items: [
      "No model call: every answer is written in advance, reviewed, and shipped with the page.",
      "Every answer cites blog posts, and the build fails if a cited post is missing or unpublished.",
      "Nothing you do in this panel is sent anywhere.",
    ],
  },
  {
    title: "Planned for free-form questions",
    items: [
      "One serverless function holds the API key; the browser never sees it.",
      "Per-IP and global daily limits kept below the provider quota, with a graceful fallback to these answers.",
      "Input length cap, off-topic refusal, and answers that must cite posts.",
      "Prompts are not stored beyond what abuse limiting needs.",
    ],
  },
];
