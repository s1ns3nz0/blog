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

## Interaction

- Scroll-driven, never autoplay. Five to six screens in total.
- Always-visible "Skip to summary" button and an altitude meter that doubles as jump navigation.
- Mobile: small fixed rocket on the side, cards flow past it.
- `prefers-reduced-motion`: no animation, readable static stack.

## Visual

- SVG line-art rocket, CSS gradient background (ground to sky to space to bright orbit).
- Mission-control telemetry UI (T+ clock, altitude, stage log), monospace type.
- Ignores the blog light/dark toggle; the flight itself is the theme.
- Launch pad: line-art lattice tower with a crane, two umbilical arms that swing away at ignition, a pad platform with a `PAD 01` label, and ignition smoke.
- Space: Earth's limb with an atmosphere glow rises from the bottom after stage 2 separation.
- Orbit arrival: the payload stays and deploys solar panels (a satellite parked top-right over the summary), the sun rises over the limb and its light spreads until the screen is bright, and the HUD locks to `ORBIT ACHIEVED · 400 km`.
- All brightness changes follow scroll position. Reduced motion drops smoke, bloom, and arm/satellite transitions; states still change.

## Summary page

1. Identity line and target roles.
2. Build / Ship / Operate cards with evidence links and flight-rule badges.
3. Number strip (computed at build where possible).
4. Career timeline.
5. AI assistant box (v2+).
6. CTA: web resume (no phone or address), GitHub, LinkedIn, mail, blog.

English only.

## AI assistant (v2, v3)

- Suggested-question chips: answers generated at build time, zero runtime calls.
- Free-form questions only: OpenRouter free models with a fallback chain, small context (resume summary, stage cards, 3-5 posts picked by a build-time keyword index), answers must cite posts.
- Limits: per-IP daily cap and a global daily cap below the account quota, both configurable. On exhaustion, fall back to chip answers and contact links.
- Privacy notice (free providers may log prompts), input length cap, off-topic refusal, API key only in the serverless function.
- A short "How this assistant is secured" section on the page.
- Rate-limit counters in a free-tier store (for example Upstash Redis).

## Data

- Single typed module, `src/data/portfolio.ts`, read by the launch page, summary, and later the AI context and chip generator.
- Evidence references posts by slug. The build fails if a slug is missing, draft, or unlisted.

## Delivery

| Version | Scope |
|---|---|
| v1 | `/launch` rocket page and summary, data module, `?for=`, skip button, altitude meter, reduced-motion fallback |
| v1.1 | Launch pad, Earth limb, orbital sunrise, satellite, HUD orbit lock |
| v2 | Build-time chip answers |
| v3 | Live free-form questions (OpenRouter, rate limits, serverless route) |
| v4 | Promote to `/`, move blog home to `/posts` |

Apply after v4.
