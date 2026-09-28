# Portfolio spec: "Launch your product securely"

Agreed 2026-09-28. Source of truth for the portfolio build.

## Audience and message

- Readers: recruiters and hiring managers for Platform, DevSecOps, and Security engineer roles.
- Budget: about 90 seconds. The takeaway is "this person has built, shipped, and operated products securely, end to end."
- One fixed narrative. `?for=<company>` only swaps the hero subline, card order, and (later) the suggested AI questions. Unknown values fall back to the default.
- First target link: `miata.cloud/?for=lightning-labs` (after v4).

## Location

- Same repo and Vercel project as the blog.
- Built at `/launch` (noindex, excluded from sitemap), promoted to `/` in v4. Blog home moves to `/posts`; `home-intro` folds into the summary or `/about`.
- Existing post URLs never change.

## Narrative

| Stage | Visual | Theme | Evidence |
|---|---|---|---|
| Pad | ground, dawn | Build: IaC, private EKS, Vault/KMS, network design | Hoodi infra posts, key management posts |
| Stage 1 separation | sky | Ship: CI/CD security, supply chain, fuzzing, OSS, vulnerability reports | CI/CD posts, gosentry, Aperture, Prowler |
| Stage 2 separation | space | Operate & Defend: observability, audit logging, SOC, detection, response | Aperture metrics/events, audit and logging, SOC posts |
| Orbit | screen brightens | Summary, career, certifications, AI assistant | resume |

Compliance (NIST, OSCAL) appears as "flight rule" badges on cards, not as its own stage.

Each stage opens with a first-person governing message (what I do, tied to one strength) and one supporting line with concrete evidence; the entries below are the evidence:

| Stage | Governing message |
|---|---|
| Build | I build platforms that are secure before the first workload ships. |
| Ship | I make pipelines prove their own integrity, and I fix what I find upstream. |
| Operate & Defend | I make running systems observable, and cheap enough to keep defending. |

Inside each stage, entries sit in one log panel, grouped by zone in this order (empty zones are hidden). Each entry is a two-line row (title + meta, one-line summary) that expands in place to show its links:

| Zone | Name | Content |
|---|---|---|
| Career | ◆ Field Missions | "delivered on the job" (external links allowed) |
| Personal projects | ▲ Test Flights | "personal projects, built and run end to end" (GitHub + posts) |
| Open source | ● Proactive Minds | "open-source work, contributed or reported upstream", one entry per project |

Study and research write-ups (for example Palantir ADS, CACAO, CISA playbooks) are stage-level flight-rule badges rather than cards.

## Interaction

- Scroll-driven, never autoplay. Five to six screens in total.
- Always-visible "Skip to summary" button and an altitude meter that doubles as jump navigation.
- Mobile: small fixed rocket on the side, cards flow past it.
- `prefers-reduced-motion`: no animation, readable static stack.

## Visual

- SVG line-art rocket, CSS gradient background (ground to sky to space to bright orbit).
- Mission-control telemetry UI (T+ clock, altitude, stage log), monospace type.
- Ignores the blog light/dark toggle; the flight itself is the theme.
- Type (launch page only): Orbitron for the hero, stage names, and big numbers; Space Grotesk for titles and body; Space Mono for labels, meta, and the HUD.
- One accent: orange marks only the current state (meter, active chip) and primary buttons. Red and green appear only in the HUD caution panel. Zones use icons, not colours. One hairline style; no dashed borders or dashed underlines.
- Launch pad: line-art lattice tower with a crane, two umbilical arms that swing away at ignition, a pad platform with a `PAD 01` label, and ignition smoke.
- Space: Earth's limb with an atmosphere glow rises from the bottom after stage 2 separation.
- Rocket labels tell the DevSecOps story: stage 1 `PLATFORM`, stage 2 `PIPELINE`, fairing `PRODUCT` (`?for=` swaps in the company name). Each booster falls away once its job is done; only the product reaches orbit.
- Orbit arrival: the fairing splits clamshell-style, a folded satellite emerges and deploys its solar panels, then parks top-right with a blinking beacon. The satellite is the product: the AI assistant about me (v2). The sun rises over the limb and its light spreads until the screen is bright, and the HUD locks to `ORBIT ACHIEVED · 400 km`.
- HUD systems line: per-stage readouts taken from posts (Build: public API 0, namespaces 4, Vault+KMS; Ship: 24 pipeline controls, 12 threat areas, SHA-pinned actions; Operate: L402 outcomes 6+10, 4 audit sources, immutable archive). Each links to its source post.
- In-flight anomalies: a transit gap before each stage plays a fault (Cost overrun: PLATFORM overheats; Insecure CI/CD: flame sputters and the rocket sags; Anomaly detected: wobble; AI over-reliance: fairing alarm). Arriving at the stage clears it with a green recovery pulse, and the HUD log keeps a linked "Resolved" entry. Stages switch on their heading, so separations happen after the fix.
- Upper-stage nozzles stay hidden inside the stage below and slide out after separation.
- All brightness changes follow scroll position. Reduced motion drops smoke, bloom, and arm/satellite transitions; states still change.

## Summary page

1. Identity line and target roles.
2. Two halves: a vertical career timeline (newest first, dates from the resume; organization name emphasized with its logo in a fixed 72x24 box) with education below it, and on the right highlights and certifications.
3. Open source contributions, full width: one entry per project, each contribution with a status checked against GitHub (Merged / Open PR / Proposed / Reported / Fixed upstream) and links to PRs, issues, and posts. Open items are listed as open, never rounded up. `?for=` can move entries first (Lightning Labs: lnd, Aperture).
4. (removed) The stage summary cards and number strip; the flight above already carries them.
5. The AI assistant opens only from the parked satellite (no separate button).
5b. Organization logos: IBM (Simple Icons, CC0); Deloitte, KITRI, and the ROK Army emblem from Wikimedia Commons, marked public domain.
6. Contact marks: official GitHub, Gmail, and LinkedIn glyphs (Simple Icons, CC0) plus a blog link. No phone number or address.

English only.

## AI assistant (v2, v3)

- Suggested-question chips: answers are drafted, reviewed, and committed in `src/data/assistant.ts` with cited post slugs (validated at build). v2 drafts them by hand; v3 adds a generation script. Zero runtime calls.
- Free-form questions only: OpenRouter free models with a fallback chain, small context (resume summary, stage cards, 3-5 posts picked by a build-time keyword index), answers must cite posts.
- Limits: per-IP daily cap and a global daily cap below the account quota, both configurable. On exhaustion, fall back to chip answers and contact links.
- Privacy notice (free providers may log prompts), input length cap, off-topic refusal, API key only in the serverless function.
- A short "How this assistant is secured" section on the page.
- Rate-limit counters in a free-tier store (for example Upstash Redis).

## Data

- Single typed module, `src/data/portfolio.ts`, read by the launch page, summary, and later the AI context and chip generator.
- Evidence is a post slug (the build fails if it is missing, draft, or unlisted) or an external `{ label, url }` link, which opens in a new tab.

## Delivery

| Version | Scope |
|---|---|
| v1 | `/launch` rocket page and summary, data module, `?for=`, skip button, altitude meter, reduced-motion fallback |
| v1.1 | Launch pad, Earth limb, orbital sunrise, satellite, HUD orbit lock |
| v1.2 | Rocket labels (PLATFORM / PIPELINE / YOUR PRODUCT), clamshell fairing, satellite emerges from inside |
| v1.3 | HUD systems readouts, in-flight anomaly log with rocket fault/recovery motion, nozzle fix |
| v1.4 | Zone lanes (Field Missions / Test Flights / Proactive Minds) inside each stage, external evidence links, per-project OSS cards |
| v1.5 | Governing message per stage; mission-log rows replace cards; single-accent design rules |
| v1.6 | First-person governing messages tied to strengths; zone meaning shown on each zone rail |
| v1.7 | Summary: timeline + highlights/certs/open source halves, brand contact marks, subline on one line, Ask button removed; card facts corrected against the resume |
| v1.8 | Summary: stage cards and number strip removed, org logos on the timeline, full-width open source section with per-project detail |
| v1.9 | Open source statuses verified on GitHub per contribution; added lnd #11211, Aperture #285/#291, SEAL #647, compliance-to-policy #51 |
| v2 | Satellite becomes a button that opens the assistant panel (drawer on desktop, sheet on mobile) with reviewed chip answers, a disabled input, privacy note, and "How this assistant is secured"; the summary gets an "Ask the satellite" button |
| v3 | Live free-form questions (OpenRouter, rate limits, serverless route) |
| v4 | Promote to `/`, move blog home to `/posts` |

Apply after v4.
