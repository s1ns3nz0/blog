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
      "Blockchain", "Hoodi", "Validator", "Ethereum", "Vault",
      "Secrets Management", "PKI", "PostgreSQL", "Architecture",
      "Lightning Network", "lnd", "Aperture", "Lightning Labs", "L402",
    ],
  },
  {
    name: "AWS",
    tags: [
      "AWS", "AWS IAM", "AWS KMS", "EKS", "ECS", "ECR", "Private Repository",
      "CloudTrail", "CloudWatch", "SaaS",
    ],
  },
  {
    name: "Kubernetes",
    tags: ["Kubernetes", "CNCF"],
  },
  {
    name: "DevSecOps",
    tags: [
      "DevSecOps", "CI/CD", "CI/CD Security", "GitHub Action", "GitHub Actions",
      "Code Commits", "Pull-Push", "Build", "CD", "Policy as Code", "SSDF",
      "Supply Chain Security", "NIST SP 800-204", "NIST SP 800-218", "NIST SP 800-204D",
      "Microservices", "Malware", "Fuzzing", "Gosentry",
    ],
  },
  {
    name: "Cloud Security",
    tags: [
      "Prowler", "CSPM", "CloudSecurity", "Cloud", "Azure", "GCP", "GoogleCloud", "AKS",
      "AzureMonitor", "CosmosDB", "Databricks", "MySQL", "CloudFunction", "CloudSQL",
      "SecretManager", "MicrosoftDefender", "EntraID", "Identity", "Identity Management",
      "MFA", "CredentialManagement", "PostureManagement", "NetworkSecurity", "NSG", "DDoS",
      "PrivateEndpoint", "NoPublicIP", "Encryption", "TLS",
    ],
  },
  {
    name: "Resilience",
    tags: [
      "HA", "Backup", "Recovery", "DisasterRecovery", "AccessReview", "Rotation",
      "Prometheus", "Logging",
    ],
  },
  {
    name: "Security Architecture",
    tags: [
      "Security", "Security Design", "Security Architecture", "Security Requirements",
      "CIA", "Defense-In-Depth", "Key Management",
    ],
  },
  {
    name: "Compliance",
    tags: [
      "Compliance", "Audit", "Risk", "NIST", "NIST SP 800-30", "NIST SP 800-37(RMF)",
      "NIST SP 800-39", "NIST SP 800-53", "NIST SP 800-57", "NIST SP 800-131A",
      "FIPS 199&200", "OSCAL", "OSCAL Compass", "Contribution",
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
    name: "AI",
    tags: ["AI", "AI SOC", "AI Supply Chain", "Slopsquatting"],
  },
  {
    name: "Tools",
    tags: ["Plugin", "MCP"],
  },
  {
    name: "DoW",
    tags: ["DoD", "DoDD 3000.09", "Army FM 3-60", "meta"],
  },
];
