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
| Stage 1 separation | sky | Deploy: CI/CD security, supply chain, fuzzing, OSS, vulnerability reports | CI/CD posts, Gosentry, Aperture, Prowler |
| Stage 2 separation | space | Operate: observability, audit logging, SOC, detection, response | Aperture metrics/events, audit and logging, SOC posts |
| Orbit | screen brightens | Summary, career, certifications, AI assistant | resume |

Compliance (NIST, OSCAL) appears as "flight rule" badges on cards, not as its own stage.

Each stage opens with a first-person governing message (what I do, tied to one strength) and one supporting line with concrete evidence; the entries below are the evidence:

| Stage | Governing message |
|---|---|
| Build | I build platforms that are secure before the first workload ships. |
| Deploy | I make pipelines prove their own integrity, and I fix what I find upstream. |
| Operate | I make running systems observable, and cheap enough to keep defending. |

Inside each stage, entries sit in one log panel, grouped by zone in this order (empty zones are hidden). Each entry is a two-line row (title + meta, one-line summary) that expands in place to show its links:

| Zone | Name | Content |
|---|---|---|
| Career | (none on the stages) | career work appears only in the Career dialog |
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
- Lists are spaced or chipped, not joined with middle dots.
- One accent: orange marks only the current state (meter, active chip) and primary buttons. Red and green appear only in the in-flight caution callout and alarm. Zones use icons, not colours. One hairline style; no dashed borders or dashed underlines.
- Launch pad: line-art lattice tower with a crane, two umbilical arms that swing away at ignition, a pad platform with a `PAD 01` label, and ignition smoke.
- Space: Earth's limb with an atmosphere glow rises from the bottom after stage 2 separation.
- Rocket labels tell the DevSecOps story: stage 1 `PLATFORM`, stage 2 `PIPELINE`, fairing `PRODUCT` (`?for=` swaps in the company name). Each booster falls away once its job is done; only the product reaches orbit.
- Orbit arrival: the fairing splits clamshell-style, a folded satellite emerges and deploys its solar panels, then parks top-right with a blinking beacon. The satellite is the product: the AI assistant about me (v2). The sun rises over the limb and its light spreads until the screen is bright, and the HUD locks to `ORBIT ACHIEVED · 400 km`.
- Summary: the claim scrolls normally; the stat cards and three "How I work" lines (from `traits` in portfolio.ts) fade up 24px once as they enter, staggered 0.1s. Reduced motion or no JS: shown as is.
- HUD: one line top-left (clock, altitude, stage). No readouts row.
- In-flight anomalies: a transit gap before each stage plays a fault (No tests or scans: PLATFORM overheats; Insecure CI/CD: flame sputters and the rocket sags; Anomaly detected: wobble; No visibility: fairing alarm). While a fault is active the failing stage glows red, sparks fly from it, the shake is stronger, the screen edges pulse red, and a blinking red `MASTER CAUTION` callout sits above the rocket nose, clear of the text. Arriving at the stage clears it with a green recovery pulse; the callout turns green and steps through the stage's resolution lines (Build: IaC scanning, SAST, secret scanning; Deploy: Git as single source of truth, policy as code, risk assessment; Operate: incident response, then logs, metrics, traces) until the bottom of the stage's cards passes mid-screen. The lines split evenly from the title reaching the nose to just before the next red alert (Operate stops before the Sun Tzu screen). Orbit's line (Full visibility) hides after 1.8s. Design has no fault; its green `DESIGN REVIEW` callout steps through security requirements, service characteristics, compliance requirements, framework-driven. Reduced motion keeps only the callout text. A fault stays active until the next stage title rises to the rocket nose; stages switch on that same line, so separations happen after the fix.
- Upper-stage nozzles stay hidden inside the stage below and slide out after separation.
- All brightness changes follow scroll position. Reduced motion drops smoke, bloom, and arm/satellite transitions; states still change.

## Summary page

1. One claim, the biggest thing on the screen: "I turn security frameworks and compliance into platform code." Name and roles sit above it, small.
2. Three stat cards under it, each opening its dialog: 5+ Years in security, N Open-source contributions (computed, disclosures included), N+ Credentials (computed from the list; "+" because not every credential is listed). "Resume (PDF) ↗" renders only when `public/resume/Jinsoo_Yang_Resume.pdf` exists (publish a copy without the phone number).
3. Each card opens a detail dialog, content as tidy bullet lists (light; centered on desktop, bottom sheet on phones; Esc, backdrop, and ✕ close):
   - Career: full timeline, newest first, period / logo + organization / role with three keywords / detail.
   - Open source: a "Security disclosures" block on top (embargoed reports only, orange left rule), a divider, then "Contributions": one full-width row per project: name with domain badges (Cloud, Security, Blockchain, Compliance), line 1 what the project is, line 2 what I contributed (copy reviewed with avoid-ai-writing), then status badges with counts. Rows expand to a Repo chip and per-contribution bullets whose links are uniform chips: code first (PR #n, Issue #n, or "28 PRs"), then "Write-up" for blog posts (post title as tooltip). Earlier layout: collapsed cards (keyword headline, tags, status summary) that expand to per-contribution statuses checked against GitHub (Merged / Open PR / Proposed / Reported / Fixed upstream / Under embargo). Open items stay open, never rounded up. Unpublished vulnerability reports appear only as a vendor-level "Coordinated disclosure" card: no product, date, severity, or link until fixes ship and disclosure is agreed.
   - Credentials: certifications, education, highlights.
4. The AI assistant opens only from the parked satellite. In orbit the altitude meter fades out (and leave the tab order); the HUD dims.
5. Contact marks: official GitHub, Gmail, and LinkedIn glyphs (Simple Icons, CC0) plus a blog link. No phone number or address. Organization logos: IBM (Simple Icons, CC0); Deloitte, KITRI, and the ROK Army emblem from Wikimedia Commons, marked public domain.

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
| v1.10 | Smaller logos; collapsible timeline rows; open-source cards with keyword headlines, tags, and status summaries; vendor-level coordinated-disclosure card |
| v1.11 | Summary rebuilt as three teaser tiles with detail dialogs (Career / Open source / Credentials) |
| v1.12 | Summary rebuilt around one claim, one proof line, and quiet detail links; instruments fold away in orbit |
| v1.13 | Stat cards (5+ / 40 / 12+), full-width open-source rows with domain and status badges, 4 Korean certifications, no middle dots |
| v1.14 | Stages renamed Build / Deploy / Operate |
| v1.15 | Security disclosures block on top of open source, uniform link chips, Detection rule optimizer highlight removed |
| v1.16 | One-line HUD; readouts and anomaly log removed; caution callout, red glow, sparks, vignette, stronger shake |
| v1.17 | Summary: "How I work" (Self-starter, Fast learner, Problem solver) under the stat cards; cards and lines rise in once on scroll; SEAL maintainer role |
| v1.18 | Open source: links as underlined text in the flow, repo path atop each expanded row, kind as plain mono text (status is the only box) |
| v1.19 | Caution callout above the rocket, kept inside the rocket column; fins drawn under the stage-1 body; stage rows split into Code, Write-ups, Rules |
| v1.20 | Design stage before Build (rocket unchanged: it flies in its Build state); IBM OT design, security-requirements plugin (moved from Deploy), and ECS/EKS/serverless design-review series linked to their tag pages; faults hold until the stage title reaches the rocket nose |
| v1.21 | New caution/resolution wording; green callout holds and steps through lines until the stage's cards pass; Design review callout |
| v1.22 | Orbit fault: No visibility / Full visibility; Sun Tzu lead-in under the summary roles; flames wait for their nozzle; Gosentry capitalised |
| v1.23 | Green lines change every 20% of the screen on every stage (last one holds); meter shows Design / Build / Deploy / Operate / Orbit; Sun Tzu moves to a full screen after Operate |
| v1.24 | Build rewritten: SSDF/SP 800-204 support line; IBM EU CRA and Army SIEM training field missions; one Hoodi-on-private-EKS card (Vault/key posts dropped) and an OSCAL policy card; OSCAL Compass and SEAL registries move to Build; Deloitte PKI moves to Operate |
| v1.25 | Operate field missions: IBM ISMS-P (Prowler tool), Deloitte ISO 27001 and digital signature audits, Army CERT counterintelligence audit; Operate test flights: Compliance Ops only; Build lists the 2 Lightning Labs reports; every green callout splits evenly from the title to the next red alert (Operate stops before Sun Tzu) |
| v1.26 | Compliance-to-code spine: hero subline is the claim (echoed in the summary); each stage opens with a real clause-to-artifact strip (800-53 AC-3/AC-6 to REQ-TENANT-DDB-01, policy 17.1.1 to OSCAL km-17.1.1, pinned inputs to CICD-02, SSDF to a Compliance Ops dashboard screenshot labeled example data; no demo URL or token on the page) |
| v1.27 | Strips rebuilt as one NIST SSDF thread from Compliance Ops: Design PW.1, Build PW.9, Deploy PS.2, Operate RV.2, each linking the node-operator evidence files at commit 8f4121f, with SSDF 10/19 implemented; screenshot dropped |
| v1.28 | Cyan Compliance Ops card closing each stage (SSDF practice, evidence count, status); links GitHub until COMPLIANCE_OPS_LIVE is set, then deep-links each requirement |
| v1.29 | The SSDF strip and the closing card merge into one cyan Compliance Ops card at the top of each stage, deep-linking the read-only live requirement page (PW.1, PW.9, PS.2, RV.2) |
| v1.30 | Compliance Ops card moves to the end of each stage (two lines: SSDF practice, 'See the code behind it, tracked live'); dashboard screenshot with 'Every control, its owner, and its evidence on one screen.' right before Sun Tzu, labeled example data |
| v1.31 | Violet Compliance Ops cards; the three design-review cards merge into 'AWS SaaS Security Design Review'; the OSCAL catalog card and the Operate Compliance Ops card are removed |
| v1.32 | Lightning version (?for=lightning-labs): Platform Engineering labels, platform-first hero, proof strip (LND, Aperture, security reports, EKS), stateful-workload card title, principle screen instead of Sun Tzu. Both: Languages row, '2 security reports' wording, assistant grounding note |
| v1.33 | Field Missions removed from every stage (and the zone itself); career work lives only in the Career dialog; Design's support line drops the IBM reference |
| v4 | Portfolio promoted to / (indexed, in the sitemap); the old blog home moves to /blog/ and the blog header, breadcrumbs and back links point there; /launch redirects to / on Vercel with the query kept (?for=lightning-labs still works) |
| v4.1 | Second review: hero shows one title (DevSecOps / Platform Engineer), the claim, 'Open to remote and overseas ... roles' + Available now, GitHub/Email/LinkedIn (and resume when present) buttons, the stat cards (moved from the summary), IBM and Deloitte logos, and the tech stack behind a toggle; zone labels read plain first (Personal projects / Open source) with the metaphor small; og:image + Twitter card |
| v4.2 | Review pass: dark hero cards and buttons; phone alert becomes a one-line bar under the HUD; Operate support line matches its cards; career details from the removed field missions folded into Career; unused CSS removed |
| v4.3 | Hero stat cards span the headline width in frosted glass, 'Available now' is a glass pill with a green dot; summary closes on 'Security controls you can read, run, and prove.' instead of repeating the hero claim; RULES lines removed from stage headings and cards |
| v4.4 | Hero: 'View details' pill on the three stat cards, three reach cards (33M+ users, 8 industries, 7 countries) in the same row as the stat cards, above the horizon; pre-dawn stars over the pad; Sun Tzu byline; 'Field notes' (AI-era essay, Open Source Contribution) above How I work. Blog: four new posts (LND on local Kubernetes; three under Study) |
| v2 | Satellite becomes a button that opens the assistant panel (drawer on desktop, sheet on mobile) with reviewed chip answers, a disabled input, privacy note, and "How this assistant is secured"; the summary gets an "Ask the satellite" button |
| v3 | Live free-form questions (OpenRouter, rate limits, serverless route) |
| v4 | Promote to `/`, move blog home to `/posts` |

Apply after v4.
