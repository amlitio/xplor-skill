# Xplor Skill — AI-Powered Knowledge Graph Engine for Claude

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Skill](https://img.shields.io/badge/Claude-Skill-5ee7df)](https://claude.ai)
[![JavaScript](https://img.shields.io/badge/JavaScript-81%25-F7DF1E)](https://github.com/amlitio/xplor-skill)
[![Python](https://img.shields.io/badge/Python-19%25-3776AB)](https://github.com/amlitio/xplor-skill)

**Xplor** transforms documents, codebases, and markdown knowledge systems into interactive, AI-queryable knowledge graphs — inside Claude.ai. Instead of flat summaries, it builds structured graphs of entities, relationships, obligations, and dependencies with a fully interactive React UI that auto-deploys on activation.

> **What makes Xplor different:** Most AI tools summarize content. Xplor reasons over it structurally — tracing obligation chains, mapping blast radius, detecting contradictions across multi-document sets, and answering natural-language questions grounded in the extracted graph.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Repository Structure](#repository-structure)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Analysis Modes](#analysis-modes)
- [Graph Schema](#graph-schema)
- [Skill Graph Format](#skill-graph-format)
- [Quality Scoring](#quality-scoring)
- [Privacy & Security](#privacy--security)
- [Integration](#integration)
- [Contributing](#contributing)

---

## What It Does

Xplor is a **Claude skill** — a bundled capability module that Claude loads and executes. When activated, it immediately renders a production-grade interactive Explorer UI and processes your content through a structured extraction pipeline.

| Input | What Xplor Builds | Best For |
|---|---|---|
| PDFs, contracts, reports | Entity-relationship graph with obligation chains | Legal review, compliance, M&A due diligence |
| Multi-document sets | Unified cross-document graph with contradiction detection | Research synthesis, policy analysis |
| GitHub repos / codebases | Call graphs, dependency maps, blast radius | Architecture review, refactoring planning |
| Markdown knowledge bases | Wikilink graph with quality scoring | Documentation audits, knowledge management |

---

## Key Features

### Interactive Explorer UI
A 1,000+ line React component that auto-deploys on skill activation — no setup required. Includes force-directed graph visualization, pan/zoom/drag, node filtering by type and source file, and a full detail panel.

### Ask the Graph (AI Query Panel)
Natural-language queries answered by reasoning over the extracted graph structure. Ask "Who are the key parties?", "What obligations does Party A have?", or "What breaks if I change this function?" — and get answers grounded in actual node names and edge types, not hallucinated prose.

### Three Analysis Modes
Document Mode, Code Mode, and Skill Graph Mode — all writing to the same canonical graph schema so outputs are consistent and interoperable.

### Cross-Document Fusion
Upload multiple files simultaneously. Each is extracted independently, then fused into a unified graph. Shared entities across files are linked with `CROSS_FILE` edges, making it easy to spot connections and contradictions across a document set.

### Progressive Disclosure
A five-level retrieval system (2 to 500 tokens per node) that keeps costs low while enabling deep dives. Claude navigates at the right resolution for each query rather than dumping entire documents into context.

### Full Provenance Tracking
Every extracted entity records its source file, section, and line range. Every relationship records the sentence that contains it. Nothing is invented.

---

## How It Works

```
User uploads content
       ↓
Xplor identifies input mode (Document / Code / Skill Graph)
       ↓
Extraction pipeline builds nodes + edges using canonical schema
       ↓
Cross-file deduplication + CROSS_FILE edge linking (multi-doc)
       ↓
Force-directed graph rendered in interactive React UI
       ↓
User explores graph visually OR queries it with natural language
       ↓
AI Query Panel reasons over graph structure → grounded answer
```

The Explorer UI shell loads instantly from the bundled JSX asset — no code generation per session. Runtime API calls only happen for extraction and queries against your actual content.

---

## Repository Structure

```
xplor-skill/
│
├── README.md                          ← You are here
├── pyproject.toml
│
└── xplor/
    ├── SKILL.md                       ← Skill definition, privacy rules, execution guide
    │
    ├── assets/
    │   └── xplor-explorer.jsx         ← Pre-built React Explorer UI (1,051 lines)
    │
    ├── references/
    │   ├── graph-core.md              ← Canonical graph schema and entity types
    │   ├── document-mode.md           ← PDF/contract extraction pipeline
    │   ├── code-mode.md               ← Call graph and dependency analysis rules
    │   ├── skill-graph-spec.md        ← Wikilink format and YAML frontmatter spec
    │   ├── skill-graph-quality.md     ← Quality scoring rubric (penalties + bonuses)
    │   ├── progressive-disclosure.md  ← Token budget allocation per level
    │   ├── agent-intelligence.md      ← Multi-domain fusion and attention scoring
    │   ├── mcp-server-spec.md         ← MCP protocol adapter for agent-to-agent use
    │   └── cli-spec.md                ← Standalone CLI interface
    │
    └── scripts/
        ├── score_graph.py             ← Quality scoring tool for skill graph dirs
        └── validate_links.py          ← Wikilink validator with broken-link reporting
```

---

## Installation & Setup

### As a Claude Skill (Recommended)

Download and install the skill into your Claude environment:

```bash
git clone https://github.com/amlitio/xplor-skill.git
```

Then install via Claude.ai → Settings → Skills → Install from file.

### Standalone Script Usage

```bash
git clone https://github.com/amlitio/xplor-skill.git
cd xplor-skill
pip install -e .
```

Validate a skill graph directory:

```bash
python xplor/scripts/validate_links.py /path/to/skill-graph/
python xplor/scripts/score_graph.py /path/to/skill-graph/ --threshold 75
```

---

## Usage

### In Claude.ai

Once installed, Xplor activates automatically when you:
- Upload a PDF, contract, report, or document set for analysis
- Ask about entities, relationships, or structure in a document
- Share a codebase or GitHub repo link for architecture mapping
- Ask "what are the key entities/relationships in this?"

The Explorer UI deploys instantly. You can:

1. **Upload Files** — drag-and-drop multiple PDFs, text files, markdown, or code
2. **Paste Text** — contracts, reports, notes, or raw code snippets
3. **Fetch from URL** — any public web page or article
4. **Build Graph** — extracts and visualizes in seconds
5. **Ask the Graph** — natural-language queries answered by graph reasoning

### CLI: Validate a Skill Graph

```bash
# Check for broken wikilinks
python xplor/scripts/validate_links.py ./my-knowledge-base/

# Score quality (exits 1 if score below threshold)
python xplor/scripts/score_graph.py ./my-knowledge-base/ --format table --threshold 80
```

---

## Analysis Modes

### Document Mode

Designed for: contracts, legal agreements, compliance filings, research papers, analyst reports, invoices, M&A data rooms.

Extracts: `person`, `organization`, `location`, `concept`, `event`, `document`, `obligation`, `condition`, `date`, `amount`

Specialized reasoning: obligation chain tracing, deadline mapping, contradiction detection across counterparty positions.

### Code Mode

Designed for: GitHub repos, local codebases, API surface mapping, refactoring planning.

Extracts: `function`, `class`, `variable`, `import`, `module`, `file`

Specialized reasoning: blast radius analysis (what breaks if X changes), circular dependency detection, entry-point mapping.

### Skill Graph Mode

Designed for: markdown knowledge bases with `[[wikilinks]]` and YAML frontmatter, Maps of Content, personal knowledge management systems.

Extracts: `skill`, `moc`, `claim`, `technique`, `framework`, `exploration`

Specialized reasoning: link density scoring, orphan node detection, broken link reporting, MOC coverage analysis.

---

## Graph Schema

All three modes write to the same canonical schema:

```
GraphNode
  id:           Namespaced — "skill:cognitive-reframing" | "func:validateToken"
  kind:         document | code | skill
  type:         Entity type (see Analysis Modes above)
  name:         Display name
  description:  One-sentence summary (required for quality score)
  domain:       Subject area: legal | finance | auth | medical | engineering | ...
  tags:         string[]
  source:       { filePath, lineRange, document }
  metadata:     { wordCount, aliases, inDegree, outDegree }

GraphEdge
  source / target:  Node IDs
  type:         REFERENCES | CLUSTERS | EXTENDS | CONTRADICTS |
                CALLS | IMPORTS | DEFINES | RELATED_TO | CROSS_DOMAIN |
                OBLIGATED_TO | INDEMNIFIES | TRIGGERS | CONFLICTS_WITH | CROSS_FILE
  label:        Human-readable relationship (extracted from source text)
  strength:     1–5 (relationship confidence)
  context:      Sentence or call-site containing the relationship
```

---

## Skill Graph Format

Skill graphs use YAML frontmatter plus markdown with `[[wikilink]]` syntax:

```yaml
---
name: cognitive-reframing
description: >
  CBT technique for identifying and challenging distorted thought patterns.
type: technique
domain: therapy
tags: [cbt, cognition, distortions]
extends: [thought-records]
---

## Definition

This technique helps individuals [[identify-distortions]] and challenge them
systematically. Related to [[ABC-model]] and [[behavioral-activation]].
```

---

## Quality Scoring

Skill graphs are scored out of 100:

| Issue | Penalty |
|---|---|
| Broken wikilink | −10 per link |
| Missing `description` | −5 per file |
| Orphan node (never referenced) | −3 per node |
| Missing `type` field | −2 per file |
| Missing `domain` field | −1 per file |

| Bonus Condition | Bonus |
|---|---|
| MOC coverage | +0 to +10 |
| Link density | +0 to +10 |

```bash
python xplor/scripts/score_graph.py ./your-graph/ --format json
```

---

## Privacy & Security

Xplor is designed for enterprise use with strict data isolation:

- **No memory between sessions** — every session starts completely fresh
- **Source-only analysis** — only content explicitly provided in the session is analyzed
- **No background inference** — zero assumptions about user industry, role, or organization
- **Empty UI by default** — the Explorer never pre-populates with example or prior-session data
- **Enforced at the API level** — privacy rules are injected into every extraction call, not just the UI layer

---

## Integration

- **Claude.ai Skills** — primary deployment target
- **MCP servers** — expose graph queries to other agents via the MCP protocol adapter (`references/mcp-server-spec.md`)
- **CLI** — standalone validation and scoring without Claude (`scripts/`)
- **REST APIs** — query extracted graphs programmatically
- **External data sources** — Xero, QuickBooks, Supabase, PostgreSQL (via agent intelligence layer)

---

## Contributing

1. Open an issue describing your use case, bug, or proposed improvement
2. Look for issues tagged `good-first-issue` or `skill-enhancement`
3. Fork the repo and create a feature branch
4. Submit a PR including:
   - Updated reference docs if modifying extraction logic
   - Test cases (sample skill graphs, documents, or code snippets)
   - Updated `SKILL.md` if changing the analysis workflow

---

## License

MIT — see [LICENSE](LICENSE) for full terms.

---

## Related

- **[xplor Framework](https://xplor.digital)** — The production agent runtime this skill plugs into
- **Explorer UI** — Interactive graph visualization bundled in `xplor/assets/xplor-explorer.jsx`
- **MCP Adapter** — Expose extracted graphs to other AI agents via `references/mcp-server-spec.md`

---

*Use Xplor when you need to reason over interconnected information — not just read it.*
