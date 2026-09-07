---
title: "Private Registries and Package Mirrors: What I Contributed to the SEAL Security Frameworks"
description: A new SEAL Security Frameworks page on internal package registries - what mirroring defends against, how routing blocks dependency confusion, and why the registry becomes a trust component in its own right.
pubDatetime: 2026-09-07T22:50:00+09:00
tags:
  - Contribution
  - Supply Chain Security
  - Dependency Confusion
  - Package Registry
  - Malware
featured: true
---

A second section of mine was merged into the [SEAL Security Frameworks](https://github.com/security-alliance/frameworks/pull/627): a page on private package registries and mirrors. Four existing pages in the framework already told teams to use a private registry without ever explaining what that means, what it defends against, or what it costs to run. This post walks through the page and adds the incidents that motivated each section.

## Table of contents

## Why this page exists

A private registry sits between developers and public package repositories, serving cached or approved copies instead of direct public lookups. That concentration is the entire value proposition: one place to inspect a package before it enters a build, one record of what actually entered.

It is also the entire cost. Every build now depends on one more service, and that service now decides what code every team pulls.

---

## Cache, curation, and vendoring

The page separates three deployment models that get talked about as if they were interchangeable.

**Pull-through cache.** The minimal setup. It passes through whatever upstream serves, with no gate. You get availability and a record of what was fetched, not approval.

**Curated repository.** A package is inaccessible until someone approves it. This is the model most teams picture when they say "private registry," and it is also the one that silently degrades the fastest, covered below.

**Vendoring.** The dependency source is committed directly into the repository. No network fetch happens at build time, and changes go through the same pull-request review as any other code. This does not scale to a full dependency tree, so it is reserved for the small number of packages where that is worth the repository growth. A Web3 team vendoring its ECDSA signing library rather than resolving it from npm at build time is a reasonable place to draw that line: the package that touches private key material is exactly the one you do not want silently updated by whatever the registry serves next.

---

## Dependency confusion

Package managers that search multiple sources create a resolution-order problem. If an internal package name also exists publicly at a higher version, some resolvers prefer the public one.

This is not theoretical. In February 2021, [Alex Birsan published research](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) showing he had gotten code to execute inside the networks of PayPal, Microsoft, Apple, Netflix, Uber, Tesla, and dozens of other companies, using exactly this mechanism: he found internal package names leaked in `package.json` files, `node_modules` listings, and internal tooling, then published public packages under those same names at a higher version number. npm, pip, and other resolvers picked the public, attacker-controlled package over the internal one. He collected over $130,000 in bug bounties from that single technique applied across dozens of targets.

The page names two controls at the registry level, and the code matters more than the prose here:

**Reserve namespaces publicly.** Register the organization's scope or package names on the public registry even if nothing is ever published there, so an attacker cannot claim them.

**Route by name with replacement, not extension.** For pip, `--index-url` replaces the default index entirely:

```text
pip install --index-url https://<internal.registry>/simple/ requests
```

`--extra-index-url` adds a source on top of PyPI instead of replacing it, which reopens the exact resolution-order gap Birsan exploited:

```text
# still checks public PyPI for the same name
pip install --extra-index-url https://<internal.registry>/simple/ requests
```

For npm, scoping the registry to the organization's namespace binds it exclusively, leaving the public registry as the default for everything else:

```text
@myorg:registry=https://<internal.registry>/npm/
registry=https://registry.npmjs.org/
```

An internal package under `@myorg/*` now only ever resolves from the internal registry. A public package with no scope still resolves from npm. The distinction between extension and replacement is the entire control.

---

## Applying this across artifact types

The three deployment models, the routing rule, and the four trust properties are not npm-specific. Every artifact type a pipeline pulls has its own version of the same registry, the same routing decision, and the same failure modes.

### Container images

The cache/curation/vendoring split maps directly. A Harbor or ECR pull-through cache gives you availability with no gate. A Harbor project with a promotion policy, where an image only reaches the `production` project after a vulnerability scan clears, is the curated model. Vendoring does not translate cleanly to images, since you cannot commit a base image into source control the way you commit a signing library; the closest equivalent is rebuilding from a pinned, internally reviewed Dockerfile rather than pulling a maintained upstream image at all.

Dependency confusion shows up as namespace squatting and typosquatting rather than version-number resolution order. [Research on Docker dependency confusion](https://www.errno.fr/DockerDependencyConfusion.html) documents registering a Docker Hub account under a name your organization uses internally and publishing a plausible image under it; the same writeup and [Red Hat's guidance on pulling images by short name](https://www.redhat.com/en/blog/be-careful-when-pulling-images-short-name) both land on the same fix, an unqualified `docker pull nginx` can silently resolve against a different registry than the one you meant, so the equivalent of `--index-url` replacement here is a fully qualified reference pinned to a digest rather than a tag:

```text
# a tag is a mutable pointer; whoever controls it controls what you get
docker pull python:3.11

# a digest is the artifact itself
docker pull python@sha256:2ee7...c3a1
```

The trust-component argument is stronger for images than for most package types, because an image is a full filesystem, not a function library. Registry write access, image signing with something like Cosign, and a promotion record that says which scan result an image was cleared against all map onto the same four properties from the section above: write access, promotion path, upstream credentials, rebuild capability.

### Helm charts

Helm has moved from ChartMuseum, a plain HTTP chart repository with no built-in access model beyond whoever can reach the upload API, to OCI-based registries, where a chart is pushed to the same kind of registry a container image lives in:

```text
helm push mychart-1.2.0.tgz oci://<internal.registry>/helm-charts
```

That shift matters for this page specifically, because an OCI Helm registry inherits the write-access, promotion, and signing controls already built for container images instead of needing its own. A chart pulled from a plain HTTP repo has none of that by default.

Dependency confusion for charts is a naming problem before it is a resolution-order problem. [Trend Micro's analysis of supply chain attacks against Argo CD, Helm, and Artifact Hub](https://www.trendmicro.com/vinfo/us/security/news/vulnerabilities-and-exploits/abusing-argo-cd-helm-and-artifact-hub-an-analysis-of-supply-chain-attacks-in-cloud-native-applications) documents the same typosquatting pattern as public package registries: a chart published under a name or publisher identity close enough to a well-known one that a developer copies the wrong `helm repo add` command. A `Chart.yaml` dependency block resolves by repository URL, so the equivalent of `--index-url` replacement is pointing that URL at the internal registry rather than trusting whichever public repo a README happened to link:

```yaml
apiVersion: v2
dependencies:
  - name: postgresql
    version: "12.1.9"
    repository: "oci://<internal.registry>/helm-charts"
```

`helm dependency update` re-resolves against whatever the repository currently serves and rewrites `Chart.lock`. That lockfile has the exact same weakness described earlier for npm and pip: it proves a hash matched at update time, not that the content was safe, so a compromised repository serving a bad chart at the moment of an update produces a lockfile that faithfully validates it afterward. `helm package --sign` and `helm verify` against a provenance file close part of that gap, the same role Cosign plays for images.

### Language libraries

The pip example earlier in this post used `--index-url` against a bare internal server. In practice teams run something like devpi or a JFrog Artifactory PyPI repository, and the configuration that matters is not the tool, it is whether pip only ever talks to one URL:

```ini
[global]
index-url = https://<internal.registry>/artifactory/api/pypi/pypi-virtual/simple
trusted-host = <internal.registry>
```

The "virtual" or "merged" index is the operational form of the routing rule from earlier in this post. Internal packages and a cached upstream mirror live behind one URL, so pip resolves everything through it and never has a second index to fall through to. The failure mode this avoids is organic: a curated registry starts strict, someone hits a package that has not been approved yet, adds a second `--extra-index-url` pointing straight at PyPI to unblock themselves, and the organization now has the exact resolution-order gap Birsan's research exploited, opened by a well-intentioned workaround instead of an attacker.

---

## Registry as trust component

Get the routing right, and the registry becomes the single component that every build in the organization trusts by construction. That makes it worth attacking directly rather than attacking any one dependency.

The [event-stream incident](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident) from 2018 is the case that shows why this matters specifically for a Web3 team. A new contributor volunteered to take over maintenance of the popular `event-stream` npm package, gained publish access, and added `flatmap-stream` as a new dependency. Version 3.3.6 shipped with roughly 8 million downloads over the following two months before anyone noticed. The payload inside `flatmap-stream` did nothing on most machines. It specifically checked for the Copay Bitcoin wallet's build environment, and on a match, harvested private keys and account credentials from wallets holding more than 100 BTC. The attack was not aimed at event-stream's users in general. It was aimed at whoever downstream happened to be building a cryptocurrency wallet.

That is what "registry as trust component" is protecting against: not a random broken package, but a targeted payload that rides in through a dependency nobody on the target team ever directly chose.

Lockfiles do not save you here. A lockfile records the hash of whatever the registry served at the moment the lock was created. If the registry served the compromised version during that window, the lockfile faithfully pins the malicious bytes and validates them on every subsequent install. Integrity checking matters most exactly when a dependency is being updated, which is the one moment a lockfile's guarantees are weakest.

The page calls out four registry properties that become security controls once routing is correct:

- **Write access.** Whoever can publish to an internal namespace reaches every downstream build without that code ever going through a source review.
- **Promotion path.** Moving a package from unreviewed to approved has to record who decided and why, the same way a deploy approval does.
- **Upstream credentials.** The token the registry uses to fetch from public sources is a high-value target in its own right and needs rotation, not a fetch-forever token.
- **Rebuild capability.** If the registry holds the only remaining copy of a since-removed artifact, that copy has become irreplaceable, which is its own kind of risk.

The framework's position is direct: registry access should be governed like pipeline access, not like a file share.

---

## Operational failure modes

Four ways a correctly designed registry degrades in practice, each with a concrete failure behind it.

**Stale cache.** A cached entry outlives the security fix that superseded it. `log4j-core` 2.14.1 sat in caches for weeks after CVE-2021-44228 became public; a mirror with no refresh policy kept serving the vulnerable artifact to every build that resolved it, silently, long after the fix existed. A cache needs an invalidation mechanism, not just a TTL that happens to expire eventually.

**Unmaintained curation.** An approval queue with no owner backs up. Developers route around it, usually by pointing at `--extra-index-url` or the public registry directly to unblock themselves, which quietly defeats the control described two sections up. A curation gate that nobody owns is worse than no gate, because it still looks like one.

**Invisible upstream deletions.** When npm pulled the three malicious `ua-parser-js` versions in October 2021 (published for a roughly four-hour window before removal, tracked as [GHSA-pjwm-rvh2-c87w](https://github.com/advisories/GHSA-pjwm-rvh2-c87w)), that removal only reached teams whose registries checked back against upstream. A mirror that had already cached one of those versions inside that four-hour window, and never reconciles against what upstream currently serves, keeps distributing malware that the source of truth has already disavowed.

**Availability concentration.** Every build now depends on one service. A registry outage stops every pipeline at once. Teams need an alternative build path and, more importantly, need to have actually run it recently, not just documented that it exists.

---

## Baseline checklist

The page closes with a compact set of MUST/SHOULD items, reproduced here:

- Internal scopes and names **must** reserve the corresponding public registry space
- Internal scopes **must** resolve exclusively from the internal registry, using replacement rather than extension
- Publish access **must** be restricted and reviewed on the same cadence as pipeline access
- Upstream credentials **must** be short-lived or rotated on a schedule
- Entry-point packages **should** be scanned once, with the results attached to the package record
- Promotion **must** record the decision and its basis
- Cached content **should** refresh on a documented invalidation policy
- The mirror **should** reconcile against upstream to catch withdrawals
- Logs **should** retain which builds pulled which versions
- Teams **should** maintain and periodically exercise an offline build path

## Links

- Merged PR: [security-alliance/frameworks#627](https://github.com/security-alliance/frameworks/pull/627)
- SEAL Security Frameworks: [frameworks.securityalliance.org](https://frameworks.securityalliance.org)
- Alex Birsan, ["Dependency Confusion: How I Hacked Into Apple, Microsoft and Dozens of Other Companies"](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
- npm, ["Details about the event-stream incident"](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident)
- GitHub Advisory, [GHSA-pjwm-rvh2-c87w: Embedded malware in ua-parser-js](https://github.com/advisories/GHSA-pjwm-rvh2-c87w)
