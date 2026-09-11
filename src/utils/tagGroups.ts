export type TagGroupConfig = {
  name: string;
  tags: string[];
};

/**
 * Static topic groups shown in the left sidebar. Every entry retains the
 * original post-frontmatter label; grouping affects navigation only.
 */
export const TAG_GROUPS: TagGroupConfig[] = [
  {
    name: "Blockchain",
    tags: [
      "Hoodi", "Validator", "Ethereum", "Nethermind", "Prysm", "Vault",
      "Secrets Management", "PKI", "PostgreSQL", "Architecture",
    ],
  },
  {
    name: "Kubernetes & AWS Platform",
    tags: [
      "AWS", "AWS IAM", "AWS KMS", "EKS", "ECS", "Kubernetes", "Cloud",
      "CNCF", "SaaS", "ECR", "Private Repository",
    ],
  },
  {
    name: "DevSecOps",
    tags: [
      "DevSecOps", "CI/CD", "CI/CD Security", "GitHub Action", "GitHub Actions",
      "Code Commits", "Pull-Push", "Build", "CD", "Policy as Code", "SSDF",
      "Supply Chain Security", "NIST SP 800-204", "NIST SP 800-218", "NIST SP 800-204D",
      "Microservices", "Malware",
    ],
  },
  {
    name: "Cloud Security & Resilience",
    tags: [
      "Prowler", "CSPM", "CloudSecurity", "Azure", "GCP", "GoogleCloud", "AKS",
      "AzureMonitor", "CosmosDB", "Databricks", "MySQL", "CloudFunction", "CloudSQL",
      "SecretManager", "MicrosoftDefender", "EntraID", "Identity", "Identity Management",
      "MFA", "CredentialManagement", "PostureManagement", "NetworkSecurity", "NSG", "DDoS",
      "PrivateEndpoint", "NoPublicIP", "Encryption", "TLS", "HA", "Backup", "Recovery",
      "DisasterRecovery", "AccessReview", "Rotation", "Prometheus",
    ],
  },
  {
    name: "Security Architecture & Compliance",
    tags: [
      "Security", "Security Design", "Security Requirements", "CIA", "Defense-In-Depth",
      "Compliance", "Risk", "NIST", "NIST SP 800-30", "NIST SP 800-37(RMF)",
      "NIST SP 800-39", "NIST SP 800-53", "FIPS 199&200", "OSCAL", "OSCAL Compass",
      "Contribution",
    ],
  },
  {
    name: "Threat Operations",
    tags: [
      "SOC", "Red Team", "F3EAD", "threat-modeling", "STRIDE", "Incident Response",
      "Vulnerability Response", "Playbook", "CACAO Playbook", "OASIS", "CISA", "Detection",
      "Detection as Code",
    ],
  },
  {
    name: "AI & Tools",
    tags: ["AI", "AI SOC", "Plugin", "AI Supply Chain", "MCP", "Slopsquatting"],
  },
  {
    name: "DoW",
    tags: ["DoD", "DoDD 3000.09", "Army FM 3-60", "meta", "dev"],
  },
];
