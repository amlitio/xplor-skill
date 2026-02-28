# Skill Graph Mode — Specification

## When to Use
Activate for: markdown knowledge bases, engineering runbooks, incident response
SOPs, legal practice area docs, medical protocol systems, CBT therapy frameworks,
trading knowledge systems, Obsidian vaults, or any linked note system using
`[[wikilinks]]` and YAML frontmatter.

**Signature:** files containing `[[wikilinks]]` and/or YAML frontmatter with
`type:`, `domain:`, `tags:` fields.

---

## Node Format

Every markdown file in the knowledge graph should have YAML frontmatter:

```yaml
---
name: cognitive-reframing
description: >
  CBT technique for identifying and challenging distorted thought patterns
  by examining evidence for and against automatic negative thoughts.
type: technique
domain: therapy
tags: [cbt, cognition, distortions, thought-work]
aliases: [reframing, cognitive restructuring]
extends: [thought-records]
contradicts: []
---

# Cognitive Reframing

Cognitive reframing involves examining the evidence for and against an
automatic negative thought (see [[thought-records]]).

## When to Apply
Use when the client presents with [[cognitive-distortions]] such as
catastrophizing or black-and-white thinking.

## Procedure
1. Identify the automatic thought
2. Rate belief strength (0–100%)
3. Examine evidence for and against
4. Generate balanced alternative thought
5. Re-rate belief strength
```

**Required frontmatter fields:** `name`, `description`
**Recommended:** `type`, `domain`, `tags`
**Graph-building:** `extends`, `contradicts`, `aliases`

---

## Node Types

| Type | Description | MOC Ratio |
|---|---|---|
| `skill` | Actionable procedure or technique | — |
| `moc` | Map of Content — navigation hub | 1 per 5–10 nodes |
| `technique` | Specific method within a skill | — |
| `claim` | Verifiable assertion or principle | — |
| `framework` | Structured methodology | — |
| `exploration` | Open question or hypothesis | — |

---

## Wikilink Parsing

Extract all `[[target-node]]` occurrences with sentence-level context:

```json
{
  "source": "cognitive-reframing",
  "target": "thought-records",
  "type": "REFERENCES",
  "context": "examining the evidence for and against an automatic negative thought (see [[thought-records]])",
  "strength": 3
}
```

**Edge type assignment:**
- Any wikilink → `REFERENCES` (default)
- Source node has `type: moc` → upgrade to `CLUSTERS`
- Source frontmatter has `extends: [target]` → `EXTENDS`
- Source frontmatter has `contradicts: [target]` → `CONTRADICTS`
- Edge crosses domain boundaries → add `CROSS_DOMAIN` tag

**Broken link detection:**
```
For each [[target]] reference:
  If target NOT in node index:
    → mark as BROKEN_LINK
    → record: { source: filename, targetName: "target", sentence: context }
    → apply quality penalty: -10 points
```

---

## Maps of Content (MOCs)

MOC nodes are navigation hubs. Identify by:
- `type: moc` in frontmatter (explicit)
- Name contains "index", "overview", "hub", "map" (inferred)
- `outDegree ≥ 10` with mostly CLUSTERS edges (structural detection)

### MOC Hierarchy Levels

```
Level 0: Domain MOC — all major topics in the domain
  └── Level 1: Topic MOCs — subtopics within each area
        └── Level 2: Leaf nodes — actual technique/claim/skill content
```

**Target:** any leaf node reachable in ≤ 3 hops from Level 0 MOC.
**If mean hop distance > 3.5:** recommend adding intermediate MOCs.

### Well-Structured MOC Example

```
therapy/
├── index.md (moc, Level 0) → links to all topic MOCs
├── mocs/
│   ├── cognitive-techniques.md (moc) → clusters 8 technique nodes
│   ├── behavioral-techniques.md (moc) → clusters 6 technique nodes
│   └── assessment-tools.md (moc) → clusters 5 tool nodes
├── techniques/
│   ├── cognitive-reframing.md
│   ├── thought-records.md
│   └── socratic-questioning.md
└── claims/
    └── validation-first.md
```

---

## Traversal Protocol

For any query against a skill graph:

```
1. Load Level 0 index (all node IDs + types)
2. Find top 5-10 candidate nodes by name/description match to query
3. Load Level 1 descriptions for candidates
4. Load Level 2 (link lists) for top 5 candidates
5. Follow relevant edges to adjacent nodes → add to candidate pool
6. Load Level 3 (sections) for confirmed relevant nodes
7. Load Level 4 (full content) for 3-8 highest-scoring nodes
8. Synthesize answer from loaded content within token budget
```

Never load full content of all nodes. A 60-file knowledge base at Level 4 would consume ~30K tokens for the graph alone.

---

## Quality Reporting Format

Always report quality score with specific, actionable findings:

```
Quality Score: 73/100

Penalties Applied:
  - 3 broken wikilinks (-30 pts):
    • cognitive-reframing.md → [[motivational-interviewing]] (not found)
    • exposure-hierarchy.md → [[fear-ladder]] (not found)  
    • case-formulation.md → [[formulation-template]] (not found)
  - 2 files missing description (-10 pts):
    • grounding-techniques.md
    • relaxation-response.md
  - 4 orphan nodes (-12 pts):
    • distress-tolerance.md
    • window-of-tolerance.md
    • attachment-styles.md
    • interpersonal-effectiveness.md

Bonuses Earned:
  - MOC coverage: +15 pts (3 MOC nodes covering 18 leaf nodes)
  - Link density: +10 pts (avg 2.8 connections/node)

Top Recommendations:
  1. Create the 3 missing target nodes or fix the wikilink targets
  2. Add descriptions to grounding-techniques.md and relaxation-response.md
  3. Link orphan nodes into at least one MOC or technique cluster
```