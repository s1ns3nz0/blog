/**
 * /sre: the incident lifecycle (detect → triage → respond → hand off → learn),
 * each stage with the on-call problems it carries and how AI SRE Ops solves
 * them. Set on one real day in the Lineth L2 lab (2026-10-13, UTC); the sky
 * follows my local time (KST). Stats come from the lab's postmortems.
 */
import type { ImageMetadata } from "astro";
import detectRules from "@/assets/images/sre/stage-detect-rules.png";
import detectMap from "@/assets/images/sre/stage-detect-map.png";
import triage from "@/assets/images/sre/stage-triage.png";
import triageIncident from "@/assets/images/sre/stage-triage-incident.png";
import respond from "@/assets/images/sre/stage-respond.png";
import handoff from "@/assets/images/sre/stage-handoff.png";
import learn from "@/assets/images/sre/stage-learn.png";

/** Live console (Caddy on the OCI host, Let's Encrypt certificate). */
export const SRE_OPS_LIVE = "https://ops.miata.cloud/sre";
export const SRE_OPS_REPO = "https://github.com/s1ns3nz0/ai-sre-ops-public";

export const sreIdentity = {
  title: "Site Reliability Engineer",
  openTo: "Open to remote and overseas roles",
  claim: "I make incident response work the same no matter who is on call.",
  /** Under the claim: what on-call is for, in one line. */
  lede: "What gets me paged becomes something nobody gets paged for: runbooks, tuned alerts, and SLOs with error budgets, all written down.",
  /** Where the problems below came from. */
  facts: [
    { value: "5 yrs", org: "Army", label: "Officer in charge of network support for military operations and a 24-hour surveillance network, in a country under armistice" },
    { value: "24/7/365", org: "IBM", label: "Supported a global SOC run around the clock by teams across time zones" },
  ],
  lifecycleTitle: "One incident, five stages",
  lifecycleNote: "Set on one real day in my L2 lab: three shifts, one operator. Times in UTC; screenshots use the console's sample data.",
};

/** What I kept running into on call (army, IBM), what I built for each, and how it works. */
export const findings = [
  {
    problem: "Follow-the-sun teams need two clocks in sync: the service's, and every office's.",
    built: "Everything in UTC, with each team's local time and offset on top.",
    details: [
      "Every timestamp is stored and shown in UTC.",
      "The top strip turns it into each region's local time and offset, marks the viewer's region, and counts down the current shift.",
      "Shifts are defined in one file (APAC 00–08, EU 08–16, US 16–24 UTC).",
    ],
    stage: "handoff",
  },
  {
    problem: "Custom detection rules and metrics go stale, lose their history, and nobody knows which are still used.",
    built: "A Git repository as the single source of truth: edits open a PR from the console, and every metric shows where it is used.",
    details: [
      "Alert rules, SLO rules and runbooks live in a Git repository. Edits in the console open a pull request, and apply after review, merge and the GitOps sync.",
      "CI checks that every alert has a runbook (53 of 53).",
      "The metric inventory reads metric names from every rule and dashboard, and marks each metric as in use, unused, or broken (referenced but not collected).",
    ],
    stage: "detect",
  },
  {
    problem: "When the on-call person changes, so does the quality of the response.",
    built: "Runbooks for every alert, and a Kagent-based AI agent that briefs the situation and the next steps.",
    details: [
      "When an incident is declared, the agent reads the incident, its runbooks and live metrics.",
      "It writes a briefing: situation, impact, likely cause with confidence, a severity suggestion, and next steps tied to runbook steps, each with a query to run in place.",
      "Changes run only after the incident commander approves; the agent can't change the cluster itself. Kagent in the lab, the same tools built in for the public demo.",
    ],
    stage: "respond",
  },
  {
    problem: "Handoff quality varies, and the next shift ends up calling the last one.",
    built: "A fixed handoff format that the incoming shift acknowledges.",
    details: [
      "The outgoing shift in one view: each incident's states on a timeline, plus alerts, deploys and changes.",
      "What got worse and by how much, and a card per open incident with its next step and a note.",
      "Written → handed over → acknowledged by the incoming shift.",
    ],
    stage: "handoff",
  },
  {
    problem: "It's hard to see a service's state at a glance.",
    built: "Each service with its resources and current state, colour-coded.",
    details: [
      "One topology file defines every component and link.",
      "The map colours each one by state. Selecting one shows why, and what breaks downstream.",
      "A banner shows whether alerts are arriving at all.",
    ],
    stage: "detect",
  },
  {
    problem: "Incidents and alerts arrive at the same time.",
    built: "A priority score that suggests what to handle first, and correlated alerts merged into one incident.",
    details: [
      "Each alert is mapped to a component. It joins an open incident that has an alert firing on the same or a directly linked component; otherwise it starts a new candidate.",
      "Probable cause: the member the others depend on.",
      "Score = SLO budget at risk + downstream impact + age + trend, with the breakdown one click away. The incident commander can merge candidates by hand.",
    ],
    stage: "triage",
  },
];

/** Under the problem table: what the console was built against. */
export const builtOn = {
  title: "Built on real infrastructure",
  text: "Built against a live L1 and L2 rollup I run on Kubernetes: their alerts, metrics and postmortems are what the console reads.",
  layers: [
    { name: "L1", parts: ["Besu", "Teku"] },
    { name: "L2", parts: ["sequencer", "coordinator", "prover", "bridge", "RPC"] },
  ],
};

/** 03: the main node card (Lineth L2). `posts` are featured slugs; a post with any of `tags` counts, and the first tag lists them. */
export const nodes = [
  {
    id: "l2",
    kind: "L2 rollup",
    name: "Lineth L2",
    facts: [
      { k: "Network", v: "Local L1 (Besu, Teku) and an L2 rollup" },
      { k: "Runs on", v: "One Kubernetes node (kind), GitOps" },
      { k: "Operate", v: "Sequencer, coordinator, prover, bridge, RPC; SLOs, alerts and postmortems" },
    ],
    posts: [],
    /** Grouped list instead of `posts`: a heading per group. */
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
    tags: ["Layer 2", "SRE Postmortem", "Lineth L2 Lifecycle"],
  },
];

/**
 * 03, under the main card: the other nodes, behind one "Also running" toggle.
 * `proofs` are things I verified on the node; leave an entry out until it's true.
 * `tag` adds a posts link with its count.
 */
export const alsoRunning: {
  id: string;
  name: string;
  status: "Running" | "Earlier build";
  env: string;
  where: string;
  stack: string[];
  proofs: { text: string; url?: string }[];
  tag?: string;
  links: { label: string; url: string }[];
}[] = [
  {
    id: "hoodi-local",
    name: "Hoodi validator",
    status: "Running",
    env: "Local",
    where: "Kubernetes on WSL",
    stack: ["Besu", "Teku", "Web3Signer", "Grafana"],
    proofs: [
      { text: "Validator 1645272 active on Hoodi", url: "https://hoodi.beaconcha.in/validator/1645272" },
      { text: "Besu and Teku, signing through Web3Signer, watched in Grafana" },
      // more to come: uptime, attestation effectiveness, drills
    ],
    links: [],
  },
  {
    id: "hoodi-eks",
    name: "Hoodi validator",
    status: "Earlier build",
    env: "AWS",
    where: "Private EKS",
    stack: ["Nethermind", "Prysm", "Web3Signer", "Vault", "Kyverno"],
    proofs: [
      { text: "Validator 1559065 went active; attestations included on chain" },
      { text: "Revoking the signer's Vault role stopped signing at once" },
      { text: "Admission blocked a sidecar image pinned by tag, not digest" },
    ],
    tag: "Hoodi",
    links: [{ label: "Code", url: "https://github.com/s1ns3nz0/node-operator-public" }],
  },
  {
    id: "lnd",
    name: "LND",
    status: "Running",
    env: "Local",
    where: "Bitcoin testnet4 · systemd and Kubernetes",
    stack: ["bitcoind", "LND", "lndmon", "Prometheus"],
    proofs: [
      { text: "Same identity, channels, and backups after Pod replacement and Helm upgrade" },
      { text: "Relayed a test payment through the node" },
    ],
    tag: "lnd",
    links: [],
  },
];

/** Certifications by issuer, all of them; `chips` are the exams inside one title. */
export const certGroups = [
  {
    issuer: "Kubernetes",
    items: [{ name: "Kubestronaut", chips: ["CKA", "CKAD", "CKS", "KCNA", "KCSA"] }],
  },
  {
    issuer: "AWS",
    items: [
      { name: "Security – Specialty" },
      { name: "Solutions Architect – Professional" },
      { name: "CloudOps Engineer – Associate" },
    ],
  },
  {
    issuer: "Korea (national)",
    items: [
      { name: "Engineer Information Security", ko: "정보보안기사" },
      { name: "Engineer Information Processing", ko: "정보처리기사" },
      { name: "Engineer Information & Communication", ko: "정보통신기사" },
      { name: "CPPG", ko: "개인정보관리사" },
    ],
  },
] as { issuer: string; items: { name: string; chips?: string[]; ko?: string }[] }[];

/** 04: a short profile for readers who arrive from an SRE application. */
export const profile = {
  name: "Jinsoo Yang",
  more: "See how I secure the platform before it ships",
  bio: "Site reliability and security engineer. I run blockchain nodes on Kubernetes and the cloud, put them behind alerts and SLOs, and write down what breaks.",
};

/** UTC shift bands, as in the console's shifts.yaml. */
export const shifts = [
  { id: "apac", name: "APAC", start: 0, end: 8 },
  { id: "eu", name: "EU", start: 8, end: 16 },
  { id: "us", name: "US", start: 16, end: 24 },
];

/** Clocks under the band, like the console's top strip. */
export const zones = [
  { label: "UTC", tz: "UTC" },
  { label: "KST", tz: "Asia/Seoul" },
  { label: "CET", tz: "Europe/Berlin" },
  { label: "ET", tz: "America/New_York" },
];

/** The sky follows this zone: my region in the console. */
export const SKY_TZ = "Asia/Seoul";

export type Problem = { problem: string; stat: string; solution: string };
export type Box = { x: number; y: number; w: number; h: number };
/**
 * A full console screen (16:10). `path` is the page in the live console.
 * `focus` boxes are % of the screen; with several problems, box i belongs to problem i.
 */
export type Shot = { src: ImageMetadata; alt: string; page: string; path: string; focus: Box[] };
/** One or more problems, then the screen that solves them. */
export type Block = { items: Problem[]; shot: Shot };

export type Stage = {
  id: string;
  name: string;
  /** UTC time on 2026-10-13. */
  utc: string;
  blocks: Block[];
};

export const stages: Stage[] = [
  {
    id: "detect",
    name: "Detect",
    utc: "04:20",
    blocks: [
      {
        items: [
          {
            problem: "Nobody knows which rules are still used.",
            stat: "3,378 of 3,478 metrics unused",
            solution: "Git as the single source of truth, changed by PR, usage tracked.",
          },
        ],
        shot: {
          src: detectRules,
          page: "Detection",
          path: "/detection?tab=metrics",
          focus: [{ x: 7, y: 31.8, w: 86, h: 4 }, { x: 8.4, y: 63.4, w: 83.3, h: 6.6 }],
          alt: "Detection management: rules in Git, and a metric inventory of 3,478 metrics, 100 in use, 3,378 unused.",
        },
      },
      {
        items: [
          {
            problem: "Running is not the same as working.",
            stat: "47 min before anyone saw it",
            solution: "Every service on one map, coloured by its real state. Select one for why, its runbook, and its pods.",
          },
        ],
        shot: {
          src: detectMap,
          page: "Infrastructure",
          path: "/infrastructure",
          focus: [{ x: 53, y: 57.6, w: 10.4, h: 6.6 }, { x: 72.2, y: 0.3, w: 27.5, h: 99.4 }],
          alt: "Infrastructure map with the traffic component selected: it is at risk, and the side panel shows why (a firing alert), its runbook, its pods with CPU and memory, and its connections.",
        },
      },
    ],
  },
  {
    id: "triage",
    name: "Triage",
    utc: "05:07",
    blocks: [
      {
        items: [
          {
            problem: "Alerts fire all at once. Which one first?",
            stat: "3 incidents · 2 hours · 1 on-call",
            solution: "One queue, ranked by a score you can read. Related alerts merge.",
          },
        ],
        shot: {
          src: triage,
          page: "Overview",
          path: "",
          focus: [{ x: 0.4, y: 24.5, w: 24.6, h: 52 }],
          alt: "Overview: the incident queue ranked by score next to error budgets per SLO.",
        },
      },
      {
        items: [
          {
            problem: "Mid-incident, nobody can tell where it stands.",
            stat: "49 min from the alert to a human looking",
            solution: "One page per incident: its lifecycle state, time open, checklist, next update due, paging, and an AI summary on top.",
          },
        ],
        shot: {
          src: triageIncident,
          page: "Incident",
          path: "/incidents/2",
          focus: [{ x: 21.6, y: 22, w: 76.8, h: 35 }, { x: 77, y: 58.2, w: 21, h: 30.2 }],
          alt: "Incident page: SEV2, mitigated, the lifecycle from detected to closed, time open, alerts, checklist, an overdue next update, paging acknowledged, an AI summary, the priority score and paging history.",
        },
      },
    ],
  },
  {
    id: "respond",
    name: "Respond",
    utc: "06:06",
    blocks: [
      {
        items: [
          {
            problem: "The fix depends on who is on shift.",
            stat: "1,125 crashes of the repair path",
            solution: "An AI briefing that follows the runbook.",
          },
        ],
        shot: {
          src: respond,
          page: "Incident",
          path: "/incidents/2?tab=response",
          focus: [{ x: 27.3, y: 24.3, w: 70.3, h: 60.6 }],
          alt: "Incident response: an AI briefing with situation, impact, cause and next steps tied to runbook steps.",
        },
      },
    ],
  },
  {
    id: "handoff",
    name: "Hand off",
    utc: "08:00",
    blocks: [
      {
        items: [
          {
            problem: "Every team reads the clock differently.",
            stat: "3 shifts · 4 time zones",
            solution: "UTC everywhere, local time on top.",
          },
          {
            problem: "Handoffs end in a phone call.",
            stat: "3 h 14 min outage across a shift change",
            solution: "A fixed handoff format, acknowledged by the next shift.",
          },
        ],
        shot: {
          src: handoff,
          page: "Handoff",
          path: "/handoff",
          focus: [{ x: 0.3, y: 0.3, w: 99.4, h: 5.8 }, { x: 1.9, y: 34, w: 96.3, h: 26.5 }],
          alt: "Shift handoff: the clock strip in UTC and local time, handoff steps, shift counts and a timeline of the shift.",
        },
      },
    ],
  },
  {
    id: "learn",
    name: "Learn",
    utc: "14:28",
    blocks: [
      {
        items: [
          {
            problem: "Root causes get lost across separate write-ups.",
            stat: "6 of 16 postmortems: alerts that reached no one",
            solution: "Every postmortem in one view for RCA: what keeps coming back, follow-ups done, how often, and each write-up's causes and action progress.",
          },
        ],
        shot: {
          src: learn,
          page: "Postmortems",
          path: "/postmortems",
          focus: [{ x: 25.75, y: 24.5, w: 68.5, h: 40.5 }, { x: 25.75, y: 71.4, w: 68.5, h: 22.8 }],
          alt: "Postmortems dashboard: contributing factors across 16 postmortems led by alerts not reaching a person (6), action items 56% done, postmortems per day by severity, and postmortem cards with their causes and action progress.",
        },
      },
    ],
  },
];
