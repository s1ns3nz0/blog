export type TagGroupConfig = {
  name: string;
  tags: string[];
};

/**
 * Static grouping of tags by theme, shown on the tags index page.
 * Matched against post tags by slug, so entries here can use their
 * original (non-slugified) label from post frontmatter.
 */
export const TAG_GROUPS: TagGroupConfig[] = [
  {
    name: "NIST",
    tags: [
      "NIST",
      "NIST SP 800-30",
      "NIST SP 800-37(RMF)",
      "NIST SP 800-39",
      "NIST SP 800-53",
    ],
  },
  {
    name: "Compliance",
    tags: [
      "Compliance",
      "FIPS 199&200",
      "OSCAL",
      "OSCAL Compass",
      "Risk",
      "Contribution",
    ],
  },
  {
    name: "Software Supply Chain",
    tags: [
      "SSDF",
      "NIST SP 800-218",
      "NIST SP 800-204D",
      "CI/CD Security",
      "Supply Chain Security",
      "Build",
      "Pull-Push",
      "Code Commits",
      "CD",
      "GitHub Action",
      "Malware",
    ],
  },
  {
    name: "DevSecOps",
    tags: ["DevSecOps", "CNCF", "NIST SP 800-204", "Microservices", "CI/CD"],
  },
  {
    name: "DoD",
    tags: ["DoD", "DoDD 3000.09"],
  },
  {
    name: "Military",
    tags: ["Army FM 3-60"],
  },
  {
    name: "AI",
    tags: [
      "AI",
      "AI SOC",
      "Plugin",
      "Security Design",
      "Security Requirements",
      "AI Supply Chain",
      "MCP",
      "Slopsquatting",
    ],
  },
  {
    name: "Threat Ops",
    tags: [
      "SOC",
      "Red Team",
      "F3EAD",
      "threat-modeling",
      "STRIDE",
      "Incident Response",
      "Vulnerability Response",
      "Playbook",
      "CACAO Playbook",
      "OASIS",
      "CISA",
      "Detection",
      "Detection as Code",
    ],
  },
  {
    name: "Site",
    tags: ["meta", "dev"],
  },
];
