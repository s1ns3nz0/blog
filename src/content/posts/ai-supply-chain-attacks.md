---
title: The AI Software Supply Chain Is Under Attack
description: A field guide to AI-era supply chain attacks - the objects at risk, how to screen them, and why AI coding raises the stakes.
pubDatetime: 2026-08-05T10:00:00+09:00
tags:
  - AI
  - AI Supply Chain
  - Supply Chain Security
  - MCP
  - Slopsquatting
  - Malware
featured: true
---

Software supply chain attacks are not new. What *is* new is that the developer's toolchain has grown a set of AI-shaped attack surfaces that did not exist two years ago: MCP servers, AI coding-agent extensions, editor "rules" files, and packages that were never written by a human but *hallucinated* into existence by a model.

## Table of contents

## Why this matters now

The trigger for this post was a report on the North Korean "Contagious Interview" / "Pollin Rider" campaign: 108 malicious packages across 162 versions, seeded into npm, Packagist, and Go modules, with payloads hidden inside `postcss.config.mjs`, disguised as `.woff2` font files, and auto-executed through VS Code's `runOn: "folderOpen"` task setting. That campaign is a good anchor because it hits almost every object category we care about at once: package registries, GitHub repos, VS Code, and the developer's own credentials.

But it is one of many. Over 2025 a distinct pattern emerged: attackers now target the AI layer of the development environment specifically, because that layer runs with elevated permissions, executes code on the developer's behalf, and is trusted implicitly. This post maps that space.

---

## 1. What objects should you actually be screening?

Not everything is a package on npm. The modern AI-assisted dev environment pulls in trust from many directions. Here is the object taxonomy, ordered roughly by how under-defended each one is.

### 1.1 Open-source packages (npm, PyPI, Packagist, Go, crates)
The classic surface, still the most abused. Install-time scripts (`preinstall`/`postinstall`), transitive dependencies, and typosquats all live here. The 2025 Shai-Hulud worm and the Nx "s1ngularity" compromise both rode this channel.

### 1.2 AI-hallucinated packages ("slopsquatting")
A new object. An LLM suggests `import fastjson-parser`, the package does not exist, an attacker registers it, and the next developer who trusts the suggestion installs malware. The package is real; the *demand* for it was manufactured by a hallucination. (Details in §3.)

### 1.3 MCP servers
Model Context Protocol servers are executables (or npm packages) that your AI agent connects to and *trusts to describe its own tools*. A malicious MCP server can (a) do something harmful directly, or (b) poison the agent through its tool descriptions, which the model reads but the human usually does not. The first real-world malicious MCP server, `postmark-mcp`, shipped in September 2025.

### 1.4 IDE / AI-agent extensions (VS Code Marketplace, OpenVSX, Cursor)
Extensions run with the developer's full privileges. The Amazon Q VS Code extension (964,000+ installs) was shipped with an injected data-wiping prompt in July 2025. The GlassWorm worm turned OpenVSX extensions into a self-propagating credential stealer using invisible Unicode.

### 1.5 Editor "rules" and agent-config files
`.cursor/rules`, `.github/copilot-instructions.md`, `CLAUDE.md`, `.vscode/tasks.json`, agent "skill" files. These are instructions to the AI, and they are code in every way that matters: they can carry hidden Unicode payloads that a human reviewer reads right past. This is the "Rules File Backdoor" class.

### 1.6 Model artifacts and datasets
Pickled model weights (`.pkl`, `.pt`) can execute arbitrary code on load. Poisoned fine-tuning datasets and model cards on public hubs round out the surface. Less common in day-to-day dev, but rising.

### 1.7 The developer's own credentials as a payload target
Worth calling out separately: the *goal* of most of these attacks is now the developer's cloud tokens, GitHub PATs, npm tokens, crypto wallets, and the auth tokens for AI CLIs (Claude, Gemini, Amazon Q), because those are keys to even more infrastructure.

---

## 2. How do you screen these tools? A practical checklist

Screening is layered: registry hygiene, code-level inspection, runtime isolation, and AI-layer-specific checks. No single control catches everything.

### 2.1 Before you install anything

- **Verify the package is the one you think it is.** Check the exact name against the official docs, not against what an AI told you (see slopsquatting). Watch for lookalikes, homoglyphs, and scope confusion (`@org/pkg` vs `pkg`).
- **Check maturity signals, but don't trust them blindly.** Download counts, age, maintainer history, repo link. The Nx and CrowdStrike-package compromises show that popular, legitimate packages get hijacked, so "it's popular" is necessary, not sufficient.
- **Read the install scripts.** `npm install --ignore-scripts` by default, then review `preinstall`/`postinstall`/`prepare` before allowing them. Most package malware fires at install time.
- **Pin and lock.** Exact versions, committed lockfiles, integrity hashes. Do not float on `^` / `~` for anything sensitive.

### 2.2 Code-level inspection (with AI-era additions)

- **Scan for obfuscation.** Long hex/base64 blobs, `eval`, dynamically constructed `require`, payloads hidden in config files (`postcss.config.mjs`, `eslint.config.mjs`) or masquerading as assets (`.woff2` that is actually JavaScript).
- **Hunt invisible Unicode.** This is the new mandatory check. Zero-width joiners, bidirectional markers, and Unicode variation selectors can hide entire instruction payloads in extension code, MCP tool descriptions, and rules files. Grep for non-ASCII in files that should be plain code, and render tool descriptions through a normalizer before trusting them.
- **Diff across versions.** The Contagious Interview campaign forged git commit histories to make recent malicious changes look old. Compare the published artifact to the tagged source, not just the repo's story about itself.

### 2.3 MCP-server–specific screening

- **Treat tool descriptions as untrusted input to the model.** Pin the exact server version; a description that was benign at approval time can be swapped later (the "rug pull" / CVE-2025-54136 pattern).
- **Prefer allow-listed, signed, or gateway-mediated MCP servers.** Route agent–server traffic through a proxy that logs and can strip hidden instructions.
- **Constrain the blast radius.** An MCP server that reads files and one that sends email should not be chainable without a human in the loop.

### 2.4 Extension screening

- **Prefer official publishers; verify signatures.** OpenVSX and the VS Code Marketplace have weaker vetting than most assume; GlassWorm proved OpenVSX is exploitable at scale.
- **Watch for behavior drift after install.** The initial version passes review; a later auto-update carries the payload. Pin extension versions in managed environments where you can.

### 2.5 Runtime and organizational controls

- **Isolate untrusted projects.** Test external repos in a container, VM, or devcontainer; never open an unknown project folder directly in an IDE with auto-run tasks enabled. Disable `runOn: "folderOpen"` auto-execution.
- **Least privilege for AI agents.** The agent should not have standing access to your production cloud, your SSH keys, and your wallet at the same time. Scope tokens tightly and short-lived.
- **Continuous secret scanning + fast rotation.** Assume exfiltration will eventually happen; make stolen credentials worthless quickly. Egress monitoring catches the exfil call even when detection of the payload fails.
- **SBOM + dependency monitoring.** Know what you ship so you can answer "are we affected?" in minutes, not days, because pulling a package from a registry does not remove it from running environments.

---

## 3. Why AI coding makes all of this worse

AI-assisted development doesn't just add new objects to screen; it changes the *dynamics* of the attack in three specific ways.

### 3.1 Hallucinated demand → slopsquatting
Developers now estimate that 40%+ of committed code is AI-assisted. When a model invents a plausible-but-nonexistent package name, and it does so *consistently* for the same prompt, an attacker only has to register that name once to catch a stream of victims. The USENIX Security 2025 study is the number to cite: across ~576,000 generated samples referencing 2.23 million packages, 19.7% of package references were hallucinated, and open-source models hallucinated at ~21.7% vs ~5.2% for commercial ones. The repetition is the danger: a hallucination that recurs is a targetable, reliable attack channel.

### 3.2 The agent is a confused deputy with root
An AI coding agent reads files, runs shell commands, and calls tools on your behalf, with your privileges. That makes prompt injection a code-execution primitive. Poison the input the agent reads (a tool description, a rules file, a README, a dependency's docstring) and you can steer its actions. Amazon Q's injected "system cleaner" prompt is the canonical example: a merged pull request turned an AI assistant into a wiper for ~964,000 installs, and only a syntax error stopped it from executing.

### 3.3 AI credentials are now the prize, and AI tools are the weapon
The Nx s1ngularity attack was the inflection point: the payload specifically weaponized the locally installed `claude`, `gemini`, and `q` CLIs, invoking them with a malicious prompt to inventory and exfiltrate secrets, and hunted for *their* config and auth files. 2,349 secrets from 1,079 machines landed in public GitHub repos. The attacker used the developer's own AI agent as the search-and-exfiltrate engine. This is the defining move of the era: the AI tool is both a target and a weapon.

Put together: AI coding widens the attack surface (new objects), lowers the exploitation bar (prompt injection = RCE), and raises the payoff (AI/cloud tokens with broad reach).

---

## 4. Other real incidents worth studying

A quick reference table of the 2025 incidents that define this threat class. Each one teaches a different lesson.

| Incident | Object exploited | Technique | Lesson |
|---|---|---|---|
| **Contagious Interview / Pollin Rider** (DPRK) | npm/Packagist/Go, VS Code, GitHub | Payloads in config files & fake `.woff2`; `folderOpen` auto-run; forged commit history; social-engineered "job interview" repos | Auto-execution and forged provenance; the human is the initial vector |
| **Nx "s1ngularity"** (Aug 2025) | npm package + local AI CLIs | Malicious versions weaponized `claude`/`gemini`/`q` to inventory & exfil secrets to public repos | AI agents used as the exfiltration engine; AI configs targeted |
| **Shai-Hulud worm** (Sep + Nov 2025) | npm | Self-propagating: harvests CI/CD secrets, republishes malicious versions using stolen npm tokens; `preinstall` payloads | First true self-propagating npm worm; 700+ packages in wave 2 |
| **Amazon Q VS Code extension** (Jul 2025) | IDE extension (964k installs) | Untrusted PR merged via over-scoped token; injected data-wiping *prompt* shipped to marketplace | AI-agent extensions ship prompts as executable payloads; CI token scope matters |
| **postmark-mcp** (Sep 2025) | MCP server (npm) | v1.0.16 added a silent BCC on every email to an attacker address; ~15k emails/day exfiltrated | First malicious MCP server in the wild; one line, week-long leak |
| **GlassWorm** (Oct 2025) | OpenVSX / VS Code extensions | Invisible-Unicode payloads, blockchain C2, steals npm/GitHub/wallet creds, self-propagates | Invisible code + un-takedownable C2; marketplace vetting is weak |
| **MCP Tool Poisoning** (2025, research + PoCs) | MCP tool descriptions | Hidden directives in descriptions the model reads but the user doesn't; MCPTox up to 72.8% success on some agents | The model's trust boundary ≠ the user's; descriptions are attack surface |

---

## 5. Recommendations: a security engineer's priority list

If you own the security of a team that ships software with AI assistance, here is what to actually do, in priority order.

**Tier 1: do these first (highest leverage).**

1. **Isolate untrusted code by default.** Devcontainers/VMs for any external project. Disable IDE auto-run (`folderOpen` tasks) org-wide. This single control neutralizes the most common auto-execution vector.
2. **Kill install-time execution as a default.** `--ignore-scripts` in CI and dev baselines; allow-list the packages that genuinely need scripts.
3. **Scope AI-agent and CI tokens to the minimum, short-lived.** No standing prod access. Assume the agent can be prompt-injected and design for it; the agent's permissions *are* the attacker's permissions.
4. **Egress monitoring + fast secret rotation.** You will miss a payload eventually; make sure you see the exfil call and can rotate before it's useful.

**Tier 2: build these into the pipeline.**

5. **SBOM + continuous dependency and secret scanning**, with a rehearsed "are we affected?" playbook. Remember: yanking a package from a registry does *not* clean running environments; you must hunt and remove.
6. **Pin everything:** package versions, lockfiles with integrity hashes, MCP server versions, extension versions. Behavior drift after approval is the whole game for rug-pull and worm attacks.
7. **Add invisible-Unicode detection** to code review and CI for anything that feeds an AI: rules files, MCP tool descriptions, skill files, and extension code. Normalize before trust.

**Tier 3: AI-layer governance.**

8. **Curate an allow-list of MCP servers and extensions**, ideally behind a logging gateway that can strip hidden instructions and log tool calls.
9. **Never trust an AI-suggested package name at face value.** Verify against official sources before install; treat slopsquatting as a real acquisition path, not a curiosity.
10. **Treat prompt injection as a code-execution vulnerability class** in your threat model, because for an agent with tool access, that is exactly what it is.

---

## Closing thought

The through-line across every 2025 incident is the same: trust that used to sit between a human and their code now sits between a human, an AI, and their code, and attackers have moved into that gap. The package registry, the extension marketplace, the MCP server, and the rules file are all just channels for getting instructions or code in front of something that will execute them with your privileges. Screen the objects, isolate the execution, and scope the tokens. Assume the AI in your pipeline can be turned against you, because in every case above, it was.

---

### Sources

- Contagious Interview / Pollin Rider: [DailySecu](https://www.dailysecu.com/news/articleView.html?idxno=207447)
- Nx s1ngularity: [GitGuardian](https://blog.gitguardian.com/the-nx-s1ngularity-attack-inside-the-credential-leak/) · [Snyk](https://snyk.io/blog/weaponizing-ai-coding-agents-for-malware-in-the-nx-malicious-package/) · [Wiz](https://www.wiz.io/blog/s1ngularity-supply-chain-attack)
- Shai-Hulud worm: [Unit 42](https://unit42.paloaltonetworks.com/npm-supply-chain-attack/) · [Wiz](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) · [CISA](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem) · [Microsoft (v2)](https://www.microsoft.com/en-us/security/blog/2025/12/09/shai-hulud-2-0-guidance-for-detecting-investigating-and-defending-against-the-supply-chain-attack/)
- Amazon Q extension: [AWS advisory](https://github.com/aws/aws-toolkit-vscode/security/advisories/GHSA-7g7f-ff96-5gcw) · [SC Media](https://www.scworld.com/news/amazon-q-extension-for-vs-code-reportedly-injected-with-wiper-prompt) · [embracethered](https://embracethered.com/blog/posts/2025/amazon-q-developer-remote-code-execution/)
- postmark-mcp: [The Hacker News](https://thehackernews.com/2025/09/first-malicious-mcp-server-found.html) · [Koi](https://www.koi.ai/blog/postmark-mcp-npm-malicious-backdoor-email-theft) · [Snyk](https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails/)
- GlassWorm: [Koi](https://www.koi.ai/blog/glassworm-first-self-propagating-worm-using-invisible-code-hits-openvsx-marketplace) · [Truesec](https://www.truesec.com/hub/blog/glassworm-self-propagating-vscode-extension) · [BleepingComputer](https://www.bleepingcomputer.com/news/security/glassworm-malware-returns-in-third-wave-of-malicious-vs-code-packages/)
- Slopsquatting / package hallucination: [USENIX 2025 via VentureBeat](https://venturebeat.com/security/forget-typosquatting-slopsquatting-is-the-software-supply-chain-threat-created-by-ai-coding-tools) · [Snyk](https://snyk.io/articles/package-hallucinations/) · [CSA](https://labs.cloudsecurityalliance.org/research/csa-research-note-slopsquatting-ai-supply-chain-20260419-csa/)
- MCP tool poisoning / rules-file backdoor: [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) · [CVE-2025-54136 / TrueFoundry](https://www.truefoundry.com/blog/blog-mcp-tool-poisoning-gateway-defense) · [OWASP](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning) · [CSA Unicode injection](https://labs.cloudsecurityalliance.org/research/csa-research-note-unicode-instruction-injection-ai-skills-20/)
