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
    name: "NIST & Compliance",
    tags: [
      "NIST",
      "NIST SP 800-30",
      "NIST SP 800-37(RMF)",
      "NIST SP 800-39",
      "NIST SP 800-53",
      "FIPS 199&200",
      "OSCAL",
      "OSCAL Compass",
      "Risk",
      "Contribution",
    ],
  },
  {
    name: "Software Supply Chain & DevSecOps",
    tags: [
      "DevSecOps",
      "CNCF",
      "SSDF",
      "NIST SP 800-218",
      "NIST SP 800-204",
      "NIST SP 800-204D",
      "Microservices",
      "CI/CD",
      "CI/CD Security",
    ],
  },
  {
    name: "DoD & Military",
    tags: ["DoD", "DoDD 3000.09", "Army FM 3-60"],
  },
  {
    name: "AI & Threat Ops",
    tags: [
      "AI",
      "AI SOC",
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
