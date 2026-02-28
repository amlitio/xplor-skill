# 📊 Xplor Skill — Structured Knowledge Graph Extraction

**Xplor** is a production-grade skill for the xplor framework that transforms documents, codebases, and markdown knowledge systems into AI-queryable knowledge graphs.

</>

<img width="1427" height="803" alt="xplor-shot" src="https://github.com/user-attachments/assets/c43ac10a-1ec2-4f37-8fb1-e059bcf83c0f" />
</>

> **This is a skill module** for the [xplor Production Agent Framework](https://xplor.digital . It plugs into the agent runtime as a deterministic, auditable, low-token capability.

---

## 🎯 What This Skill Does

Xplor extracts structured knowledge from three input types:

| Input Type | Output | Use Case |
|---|---|---|
| **Documents** | Entity relationships, obligations, contradictions | Legal contracts, reports, multi-doc analysis |
| **Codebases** | Call graphs, dependencies, blast radius | Architecture mapping, refactoring impact |
| **Skill Graphs** | Wikilink validation, quality scoring, link density | Knowledge management, Maps of Content |

Instead of flat summaries, it builds **interactive knowledge graphs** with:
- Force-directed visualization with pan/zoom/drag
- Natural-language "Ask the Graph" queries
- Node filtering by type and source
- Full provenance tracking

---

## ✅ Core Features

### 1. Multi-Mode Analysis
- **Document Mode**: Extract entities (person, org, location, obligation, condition)
- **Code Mode**: Map functions, classes, imports, call chains
- **Skill Graph Mode**: Parse wikilinks, validate frontmatter, compute quality scores

### 2. Canonical Graph Schema
All modes write to the same data model:
```
GraphNode
  id:           Namespaced (e.g., "skill:cognitive-reframing")
  type:         Entity type (person, function, skill, etc.)
  name:         Display name
  description:  One-sentence summary
  domain:       Subject area (legal, finance, engineering, etc.)
  source:       Provenance (file, line range, document)

GraphEdge
  type:         REFERENCES, CALLS, EXTENDS, CONTRADICTS, OBLIGATED_TO, etc.
  label:        Human-readable relationship
  strength:     1–5 (relationship confidence)
  context:      Sentence containing the relationship
```

### 3. Low-Token Architecture
- **Progressive Disclosure**: Navigate at 5 resolution levels (Index → Full content)
- **Intelligent Retrieval**: ~2 to 500 tokens per node depending on depth
- **Graph-First Output**: Structured reasoning instead of prose

### 4. Full Auditability
- Every extraction records: inputs, outputs, decisions, provenance
- Execution history with timestamps
- Quality scoring for skill graphs (penalties for broken links, missing metadata, bonuses for MOC coverage)

---

## 🏗 Repository Structure

```
xplor-skill/
│
├── README.md                          ← You are here
├── pyproject.toml
│
└── xplor/
    ├── SKILL.md                       ← Skill definition & execution guide
    │
    ├── assets/
    │   └── xplor-explorer.jsx         ← React UI component (auto-deployed)
    │
    ├── references/
    │   ├── graph-core.md              ← Graph data model specification
    │   ├── document-mode.md           ← Document extraction rules
    │   ├── code-mode.md               ← Code analysis rules
    │   ├── skill-graph-spec.md        ← Wikilink & YAML format
    │   ├── skill-graph-quality.md     ← Quality scoring rubric
    │   ├── progressive-disclosure.md  ← Token budget rules
    │   ├── agent-intelligence.md      ← Multi-domain fusion
    │   ├── mcp-server-spec.md         ← MCP protocol adapter
    │   └── cli-spec.md                ← CLI interface
    │
    └── scripts/
        ├── score_graph.py             ← Quality scoring tool
        └── validate_links.py          ← Wikilink validator

```

---

## 🚀 Quick Start

### Install

```bash
git clone https://github.com/amlitio/xplor-skill.git
cd xplor-skill
pip install -r requirements.txt
```

### Use as a Skill Module

This skill is designed to be loaded by the xplor framework:

```python
# In xplor agent runtime
from xplor.skills import load_skill
skill = load_skill("amlitio/xplor-skill")
result = skill.execute(
    input_type="document",
    content=my_pdf,
    mode="document_analysis"
)
```

### Or Use Standalone (Text-Based)

```python
from xplor.core import GraphBuilder

builder = GraphBuilder()
nodes, edges = builder.analyze_document(
    doc_path="contract.pdf",
    mode="document"
)
```

### Validate a Skill Graph

```bash
python xplor/scripts/validate_links.py /path/to/skill/graph
python xplor/scripts/score_graph.py /path/to/skill/graph
```

---

## 🧠 Analysis Workflow

### Step 1: Identify Input Mode
Determine which reference file applies:

| Input | Mode | Reference |
|---|---|---|
| PDF / contract / report | Document Mode | `xplor/references/document-mode.md` |
| GitHub repo / codebase | Code Mode | `xplor/references/code-mode.md` |
| Markdown + wikilinks | Skill Graph Mode | `xplor/references/skill-graph-spec.md` |
| Mixed inputs | Multi-Domain Fusion | `xplor/references/agent-intelligence.md` |

### Step 2: Extract & Normalize
Parse input into canonical graph schema (see SKILL.md).

### Step 3: Apply Progressive Disclosure
Retrieve knowledge at the right token budget:

| Level | Content | Tokens/Node |
|---|---|---|
| 0 | IDs + types | 2 |
| 1 | + name + description | 15 |
| 2 | + connection list | 30 |
| 3 | + section headings + previews | 80 |
| 4 | Complete content | 200–500 |

### Step 4: Reason Over Graph
- Trace obligation chains
- Compute blast radius (impact surface)
- Detect contradictions
- Flag gap nodes (referenced but undefined)

### Step 5: Deliver Graph-First Results
Output: node list, edge list, key findings, domain-specific insights, conflict flags.

---

## 📂 Key Files

### Skill Definition
- **`xplor/SKILL.md`** — The canonical skill definition. Includes privacy rules, Explorer UI deployment, analysis workflows, and reference file index.

### Reference Documentation
- `xplor/references/graph-core.md` — Graph schema and entity types
- `xplor/references/document-mode.md` — Entity extraction for PDFs, contracts, documents
- `xplor/references/code-mode.md` — Call graph and dependency analysis
- `xplor/references/skill-graph-spec.md` — Wikilink format and frontmatter spec
- `xplor/references/skill-graph-quality.md` — Quality scoring penalties and bonuses
- `xplor/references/progressive-disclosure.md` — Token budget allocation rules

### Tools & UI
- `xplor/assets/xplor-explorer.jsx` — Interactive React Explorer UI (auto-deployed)
- `xplor/scripts/score_graph.py` — Run quality scoring on skill graph directories
- `xplor/scripts/validate_links.py` — Check for broken wikilinks and report issues

---

## 🔄 Skill Graph Format

Skill graphs use YAML frontmatter + markdown with wikilinks:

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
systematically. Related to [[ABC-model]].
```

Quality scoring applies penalties and bonuses:

| Issue | Penalty | Bonus |
|---|---|---|
| Broken wikilink | −10/link | — |
| Missing `description` | −5/file | — |
| Orphan node (unused) | −3/node | — |
| Missing `type` | −2/file | — |
| Missing `domain` | −1/file | — |
| MOC coverage | — | +0–10 |
| Link density | — | +0–10 |

---

## 🔌 Integration

This skill integrates with:
- **xplor framework runtime** — Agent skill loading & execution
- **MCP servers** — Expose graph queries to other agents
- **REST APIs** — Query the extracted graph
- **External systems** — Xero, QuickBooks, Supabase, PostgreSQL
- **CLI tools** — Standalone validation and scoring

---

## 🔬 Privacy & Context Rules

Every Xplor analysis follows these rules:

1. **No memory, no assumptions** — Each session is fresh and isolated
2. **Only analyze what's provided** — Files uploaded, URLs shared, text pasted in this conversation
3. **Zero inferences** — Don't assume user's industry, role, or company
4. **Empty Explorer UI** — Never pre-populate with demo data
5. **Source-only reasoning** — All claims traced back to input

---

## 📈 Why Xplor (The Skill)

Most knowledge extraction tools produce flat summaries. Xplor produces:
- **Structured reasoning** — Graph relationships, not keyword highlighting
- **Audit trails** — Full provenance on every extracted entity
- **Low cost** — Progressive disclosure keeps token usage minimal
- **Production-ready** — Handles real documents, codebases, and edge cases

---

## 🤝 Contributing

1. Open an issue describing your use case or improvement
2. Pick a `good-first-issue` or `skill-enhancement` label
3. Submit a PR with:
   - Updated reference docs (if modifying extraction logic)
   - Test cases (YAML skill graphs, sample documents, or code snippets)
   - Updated SKILL.md (if changing analysis workflow)

---

## ⭐ Support

If this skill helps:
- ⭐ Star the repository
- 🔗 Link to it from your xplor implementations
- 📝 Share your use cases in Discussions

---

## 📜 License

MIT License — Part of the xplor production agent framework.

---

## 🔗 Related Projects

- **[xplor Framework](https://github.com/amlitio/xplor)** — The production agent runtime
- **Explorer UI** — Interactive graph visualization (in `assets/`)
- **MCP Adapter** — Expose this skill's graphs to other agents

---

## 🧭 Vision

Knowledge extraction should produce **actionable structure**, not summaries.

Xplor transforms documents, codebases, and knowledge systems into **AI-queryable graphs** that enable:
- Obligation chain tracing
- Contradiction detection
- Impact surface analysis
- Quality scoring

**Use Xplor when you need to reason over interconnected information.**
