---
title: "Converting the Web3 Key Management Policy to OSCAL"
description: "How a Markdown key management policy becomes a machine-readable OSCAL Catalog: the mapping rules, the JSON shape, schema validation, and what's left unmapped."
pubDatetime: 2026-09-17T12:00:00+09:00
tags:
  - OSCAL
  - Policy as Code
  - Compliance
  - Key Management
  - NIST
---

The [Web3 Cryptographic Key Management Policy](https://github.com/s1ns3nz0/kms-policy) exists in two forms: a numbered Markdown document meant for people, and an OSCAL Catalog meant for tooling. This post covers the second form, how the conversion is defined, what the resulting JSON looks like, and how it's kept from silently drifting out of sync with the source text.

## The Markdown source is the conversion input, not a draft to discard

The repository keeps both forms deliberately. `drafts/02-key-management-policy-reindexed.md` is the canonical, per-clause-numbered version, and the OSCAL catalog's own metadata links back to it with `rel: derived-from`. The Markdown stays the human-readable draft; the JSON is "the file to update for controls-as-code workflows," per the OSCAL README. Editing the catalog directly without a corresponding Markdown change would break that traceability.

## The mapping rules

The `oscal/README.md` states five direct mapping rules from policy structure to OSCAL Catalog structure:

| Policy element | OSCAL element |
|---|---|
| Policy section | Group |
| Policy subsection | Nested group |
| Numbered clause | Control |
| List subclause | Nested control |
| Requirement text | `statement` part |
| Original clause number | `label` property |
| Clause-level NIST provenance | `source-classification` property |

OSCAL release `1.2.3`, Catalog model. This is a small, literal set of rules, and that's what makes the conversion checkable: a reviewer can look at Section 17.1 in the Markdown and Section 17.1 in the JSON and confirm they say the same thing, because the mapping doesn't leave room for the two to structurally diverge.

## What a control actually looks like

Here's clause 17.1.1 as it exists in the catalog, taken directly from `oscal/web3-cryptographic-key-management-catalog.json`:

```json
{
  "id": "km-17.1.1",
  "class": "policy-requirement",
  "title": "17.1 Authority Separation — Clause 17.1.1",
  "props": [
    { "name": "label", "value": "17.1.1" },
    { "name": "source-classification", "value": "web3-specific" }
  ],
  "parts": [
    {
      "id": "km-17.1.1_smt",
      "name": "statement",
      "prose": "Validator signing, withdrawal, treasury, transaction, contract deployment, contract upgrade, governance, and recovery authority shall be separately inventoried, classified, and governed according to distinct purpose and impact. ..."
    }
  ]
}
```

This control sits inside a `km-subsection-17-1` group, which sits inside the `km-section-17` group for "17. Web3-Specific Key Management Principles." The catalog currently has 18 top-level groups, one per policy section, matching the Markdown's table of contents exactly.

## `source-classification` is the field that carries NIST provenance

This is the property that answers "is this requirement from NIST, or is it ours." It currently has two values in use across the whole catalog:

```text
pending-control-mapping   168 controls
web3-specific               16 controls
```

`web3-specific` is reserved for Section 17 and is meant to stay that way; the OSCAL README states plainly that these controls "must not be represented as direct NIST requirements without a separate, cited mapping decision." `pending-control-mapping` is everything else, all 168 remaining clauses across Sections 1 through 16 and 18. The catalog's own `control-mapping-status` metadata field spells out what that placeholder means: `pending-clause-level-NIST-mapping`. The eventual target values, once that mapping work happens, are `nist-direct`, `nist-derived`, `organization-specific`, `protocol-mandated`, and `no-clear-basis`, per Section 18 of the policy text. None of the 168 pending controls have been assigned one of those yet.

## Stability rules that make the catalog usable as a reference

The OSCAL README adds a rule that matters more once other documents start citing this catalog: "Control IDs and `label` properties are stable identifiers and must not be renumbered without an approved policy revision and migration plan for downstream references." Once something like an audit narrative or a risk register points at `km-17.3.2`, that ID has to keep meaning the same requirement, or every downstream reference silently breaks.

## Schema validation as a merge gate

The catalog is validated against the pinned OSCAL 1.2.3 Catalog schema before any change merges:

```sh
curl -fsSL https://github.com/usnistgov/OSCAL/releases/download/v1.2.3/oscal_catalog_schema.json \
  -o /tmp/oscal_catalog_schema-1.2.3.json

npx --yes --package=ajv-cli@5.0.0 --package=ajv-formats@3.0.1 ajv validate \
  --spec=draft7 \
  --strict=false \
  -c ajv-formats \
  -s /tmp/oscal_catalog_schema-1.2.3.json \
  -d oscal/web3-cryptographic-key-management-catalog.json
```

Pinning the schema version and pinning `ajv-cli`/`ajv-formats` versions both matter for the same reason: OSCAL itself has moved through major releases, and an unpinned schema check would validate against whatever the latest release happens to require on a given day, not against the 1.2.3 the catalog declares in its own `oscal-version` field.

## Why this is worth doing instead of just keeping a good Markdown file

A well-organized Markdown policy is still something a person has to read to answer "which controls are Critical-key related" or "which controls still need a NIST citation." The OSCAL form makes both of those a query: filter controls by `source-classification`, or by which group they sit under, and the answer comes back structurally instead of by re-reading 18 sections. That's the same idea behind the [compliance-as-code dashboard](https://github.com/s1ns3nz0/compliance-ops) I described in my Offchain application post, applied here to one specific policy instead of a whole organization's control set.

The catalog is version `0.1.0` right now, and its own `control-mapping-status` says the clause-level NIST work isn't done. That's a more honest starting point than a catalog that claims completeness it doesn't have.

## References

- [kms-policy repository](https://github.com/s1ns3nz0/kms-policy)
- [OSCAL Catalog model, release 1.2.3](https://github.com/usnistgov/OSCAL/releases/tag/v1.2.3)
- [Hello, Offchain!!](/posts/hello-offchain/)
