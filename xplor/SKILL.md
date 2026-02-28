---

name: xplor

description: >

&nbsp; Transforms documents, codebases, and markdown knowledge systems into AI-queryable

&nbsp; knowledge graphs — extracting entities, relationships, and structure for deep

&nbsp; reasoning, not flat summaries. Auto-renders an interactive Explorer UI with

&nbsp; graph visualization and a natural-language query panel. Three modes:

&nbsp; (1) Document Mode: PDFs, contracts, reports, multi-doc sets.

&nbsp; (2) Code Mode: GitHub repos, local codebases, call-chain graphs.

&nbsp; (3) Skill Graph Mode: markdown with wikilinks, YAML frontmatter, Maps of Content.

&nbsp; USE THIS SKILL for: document analysis, entity extraction, obligation chains,

&nbsp; codebase architecture, dependency mapping, knowledge graph construction,

&nbsp; multi-document contradiction detection, or any structural reasoning over

&nbsp; interconnected information. Trigger when users upload files for analysis, ask

&nbsp; about document structure, want to explore data relationships, or ask about

&nbsp; key entities/relationships — even if they don't say "graph".

---



\# Xplor — Structured Cognition Engine



---



\## 🔒 PRIVACY \& CONTEXT RULES — READ FIRST, APPLY ALWAYS



These rules are non-negotiable and override all other instructions:



1\. \*\*No memory, no assumptions.\*\* Never pull information from past conversations,

&nbsp;  user memory, stored profiles, or background context. Every Xplor session is

&nbsp;  completely fresh and isolated.



2\. \*\*Only analyze what is explicitly provided in this conversation.\*\* Accepted

&nbsp;  inputs: files uploaded in this chat, URLs shared in this chat, text pasted

&nbsp;  directly in this chat. Nothing else.



3\. \*\*Make zero assumptions about the user or their work.\*\* Do not infer their

&nbsp;  industry, role, company, past projects, or preferences unless they state it

&nbsp;  explicitly in this conversation.



4\. \*\*The Explorer UI starts empty every time.\*\* Never pre-populate the graph with

&nbsp;  example data, demo content, or content from prior sessions. The user must

&nbsp;  provide all input.



5\. \*\*These rules apply to the Explorer API calls too.\*\* The system prompt sent

&nbsp;  to Claude for extraction must enforce source-only analysis (see below).



---



\## ⚡ Explorer UI — Auto-Deploy on Activation



\*\*When this skill activates, immediately render the Xplor Explorer as a React

artifact.\*\* Do not wait for the user to ask. Do not generate the code from scratch

— read and render `assets/xplor-explorer.jsx` directly.



The Explorer is the primary interface for all Xplor sessions. It starts in an

empty awaiting-input state. The user provides content through the UI.



The Explorer includes:

\- File upload, text paste, and URL fetch inputs

\- Force-directed knowledge graph visualization with pan/zoom/drag

\- Node detail panel (click any node to inspect type, description, connections)

\- Type + file filters

\- \*\*"Ask the Graph" AI query panel\*\* — natural language queries answered by

&nbsp; reasoning over the extracted graph structure (toggle with the ✦ button)



Only fall back to text-based analysis (Steps 1–5 below) if:

\- The user explicitly asks for a text/structured response instead of the UI

\- The environment cannot render React artifacts

\- The user is working programmatically (API, CLI, Claude Code)



---



\## Step 1 — Identify the Mode



| Input | Mode | Reference File |

|---|---|---|

| PDF, contract, report, multi-doc set | \*\*Document Mode\*\* | `references/document-mode.md` |

| GitHub URL, repo path, source code | \*\*Code Mode\*\* | `references/code-mode.md` |

| Markdown folder with `\[\[wikilinks]]` | \*\*Skill Graph Mode\*\* | `references/skill-graph-spec.md` |

| Mixed inputs | \*\*Multi-Domain Fusion\*\* | `references/agent-intelligence.md` |



Read the relevant reference file before beginning analysis.



---



\## Step 2 — Extract Structure



All three modes write to the \*\*same canonical schema\*\*.



\### Graph Schema



```

GraphNode

&nbsp; id:          Namespaced — "skill:cognitive-reframing" | "func:validateToken"

&nbsp; kind:        document | code | skill

&nbsp; type:        (see entity types below)

&nbsp; name:        Display name

&nbsp; description: One-sentence summary (required for quality score)

&nbsp; domain:      Subject area: legal | finance | auth | medical | engineering | ...

&nbsp; tags:        \[]string

&nbsp; content:     { full, sections\[], preview }

&nbsp; source:      { filePath, lineRange, document }

&nbsp; metadata:    { wordCount, aliases, inDegree, outDegree }



GraphEdge

&nbsp; source / target:  Node ids

&nbsp; type:        REFERENCES | CLUSTERS | EXTENDS | CONTRADICTS |

&nbsp;              CALLS | IMPORTS | DEFINES | RELATED\_TO | CROSS\_DOMAIN |

&nbsp;              OBLIGATED\_TO | INDEMNIFIES | TRIGGERS | CONFLICTS\_WITH

&nbsp; label:       Human-readable relationship

&nbsp; strength:    1–5

&nbsp; context:     Sentence/call-site containing the relationship

```



\*\*Entity types by mode:\*\*

\- Document: `person · organization · location · concept · event · document · obligation · condition · date · amount`

\- Code: `function · class · variable · import · module · file`

\- Skill Graph: `skill · moc · claim · technique · framework · exploration`



Full schema: `references/graph-core.md`



---



\## Step 3 — Apply Progressive Disclosure



Never dump full content into context. Navigate at the right resolution:



| Level | Name | Content | ~Tokens/node |

|---|---|---|---|

| 0 | Index | IDs + types only | 2 |

| 1 | Descriptions | + name + one-line description | 15 |

| 2 | Links | + connection list | 30 |

| 3 | Sections | + section headings + previews | 80 |

| 4 | Full | Complete content | 200–500 |



Full rules + token budgets: `references/progressive-disclosure.md`



---



\## Step 4 — Reason Over the Graph



\- \*\*Obligation chains:\*\* trace duties from Party A down to subcontractors

\- \*\*Impact surface:\*\* what depends on this node, directly and transitively?

\- \*\*Contradiction detection:\*\* where do multiple sources disagree?

\- \*\*Blast radius:\*\* what breaks if this function changes?

\- \*\*Gap detection:\*\* what nodes are referenced but never defined?



---



\## Step 5 — Deliver Structural Answers



Output is always \*\*graph-first\*\* — never prose-with-entities-bolded.



Every output must include:

1\. Node list with IDs, types, descriptions, source provenance

2\. Edge list with relationship types, labels, strength (1–5)

3\. Key findings — top 3–5 structural insights

4\. Domain-specific findings (obligation chains / blast radius / quality score)

5\. Conflict flags — contradictions, cascade risks, broken links



---



\## Analysis Workflow Checklists



\### Document Analysis

```

\- \[ ] 1. Extract all entities (id, name, type, description) from provided source only

\- \[ ] 2. Identify relationships between entities (label + strength 1-5)

\- \[ ] 3. Deduplicate entities by name + aliases across chunks/documents

\- \[ ] 4. Track source\[] provenance per entity

\- \[ ] 5. Build graph: nodes + edges using canonical schema

\- \[ ] 6. Identify 5–10 highest-inDegree nodes (most critical)

\- \[ ] 7. Surface key findings: chains, conflicts, isolated nodes

```



\### Code Analysis

```

\- \[ ] 1. Map top-level modules and their responsibilities

\- \[ ] 2. Identify entry points (main files, exported functions, API routes)

\- \[ ] 3. Trace call chains: entry → intermediate → leaf functions

\- \[ ] 4. Rank nodes by inDegree (blast radius indicator)

\- \[ ] 5. Flag circular dependencies and high-coupling clusters

\- \[ ] 6. Report architecture: modules → functions → calls

```



\### Skill Graph Analysis

```

\- \[ ] 1. Parse frontmatter (name, description, type, domain, tags)

\- \[ ] 2. Extract all \[\[wikilinks]] with sentence-level context

\- \[ ] 3. Resolve links against node index (flag broken targets)

\- \[ ] 4. Assign edge types (REFERENCES / CLUSTERS / EXTENDS / CONTRADICTS)

\- \[ ] 5. Detect MOC nodes and their cluster memberships

\- \[ ] 6. Compute quality score (base 100, apply penalties, add bonuses)

\- \[ ] 7. Report: score + specific issues with filenames + fix recommendations

```



---



\## Entity Type Color Map



```javascript

const TYPE\_COLORS = {

&nbsp; person: "#FF6B6B", organization: "#4ECDC4", location: "#45B7D1",

&nbsp; concept: "#82E0AA", document: "#F0B27A", event: "#AED6F1",

&nbsp; obligation: "#C39BD3", condition: "#F9E79F",

&nbsp; function: "#61AFEF", class: "#C678DD", variable: "#E5C07B",

&nbsp; import: "#56B6C2", module: "#98C379", file: "#ABB2BF",

&nbsp; skill: "#FF9F43", moc: "#EE5A24", claim: "#A3CB38",

&nbsp; technique: "#FDA7DF", framework: "#9AECDB", exploration: "#7158e2",

&nbsp; default: "#636e72",

};

```



---



\## Skill Graph Format



```yaml

---

name: cognitive-reframing

description: >

&nbsp; CBT technique for identifying and challenging distorted thought patterns.

type: technique

domain: therapy

tags: \[cbt, cognition, distortions]

extends: \[thought-records]

---

```



Quality scoring penalties:



| Issue | Penalty | Bonus |

|---|---|---|

| Broken wikilink | −10/link | — |

| Missing `description` | −5/file | — |

| Orphan node | −3/node | — |

| Missing `type` | −2/file | — |

| Missing `domain` | −1/file | — |

| MOC coverage | — | +0–10 |

| Link density | — | +0–10 |



Full rubric: `references/skill-graph-quality.md`



---



\## Reference Files



\### Core

| File | Load when... |

|---|---|

| `references/graph-core.md` | Building or querying the graph data model |

| `references/progressive-disclosure.md` | Retrieving knowledge within token budgets |



\### By Mode

| File | Load when... |

|---|---|

| `references/document-mode.md` | Extracting entities from PDFs or documents |

| `references/code-mode.md` | Analyzing a codebase |

| `references/skill-graph-spec.md` | Building or parsing a skill graph |

| `references/skill-graph-quality.md` | Scoring or validating a skill graph |



\### Advanced

| File | Load when... |

|---|---|

| `references/agent-intelligence.md` | Multi-domain fusion, attention scoring |

| `references/mcp-server-spec.md` | Exposing graph to AI agents via MCP |

| `references/cli-spec.md` | CLI commands |



\### Scripts \& Assets

| File | Purpose |

|---|---|

| `scripts/score\_graph.py` | Run quality scoring against a skill graph directory |

| `scripts/validate\_links.py` | Check all wikilinks and report broken targets |

| `assets/xplor-explorer.jsx` | Pre-built React Explorer UI — render on activation |

