/**
 * The satellite assistant on the home page. Chips serve reviewed,
 * pre-written answers with no model call; typed questions go to api/ask.ts
 * (v3). Chip sources are blog post slugs, validated at build like the
 * portfolio evidence. See docs/portfolio-spec.md.
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
      "28 Azure and GCP checks for Prowler, Policy as Code and private-registry guidance for the SEAL frameworks, a fuzzer bug report in Trail of Bits' Gosentry (fixed the same day), and for Lightning Labs: per-outcome L402 metrics and a flaky-test fix in Aperture, plus a short-read report in LND's address decoders.",
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
  {
    id: "lightning-node",
    audiences: ["default"],
    question: "Has he run a Lightning node?",
    answer:
      "Yes, on testnet. He runs LND on K3s as a stateful workload, checked its routing readiness, found a channel direction still advertised as disabled after a peer reconnected, re-enabled it, and relayed a real payment for a 1.005-sat fee. On top of it he built an Aperture L402 payment gate for a paid scan service.",
    sources: [
      "running-an-lnd-lightning-node-on-local-kubernetes",
      "lnd-testnet-routing-practice",
      "adding-lightning-payments-to-opencti-with-aperture",
    ],
  },
  {
    id: "on-call",
    audiences: ["default"],
    question: "How does he handle on-call and incidents?",
    answer:
      "He built a read-only Kagent diagnosis agent for the L402 payment gate and reviewed the setup against Google SRE. SLO burn-rate alerts cut detection from 16 to 5 minutes, and blind drills grade the agent against the playbook, which is how he caught it skipping a required tool and inventing commands.",
    sources: [
      "diagnosing-opencti-with-kagent-google-sre-review",
      "diagnosing-opencti-with-kagent-drill-2",
      "rehearsing-incidents-with-an-llm-agent",
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
      "He proposed per-outcome Prometheus counters for Aperture's L402 mint and verify paths (issue #286). A maintainer reviewed the write-up and asked for a pull request, so the counters are now in PR #297 with the review's design changes. He also proposed structured security events that keep raw macaroons and preimages out of logs.",
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

export const privacyNote = "Typed questions go to Claude and aren't stored. No personal info, please.";

/** One line under the panel title. */
export const assistantKeywords = ["Portfolio only", "Cited posts", "Claude Haiku", "No history"];
