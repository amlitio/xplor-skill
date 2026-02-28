# Document Mode — Entity Extraction Pipeline

## When to Use
Activate for: contracts, legal agreements, M&A data rooms, compliance filings,
research papers, analyst reports, insurance claims, regulatory documents, invoices,
field tickets, or any document set where entities and their relationships matter.

---

## Extraction Pipeline

### Phase 1 — Chunking
- Split text at logical boundaries (sections, clauses, paragraphs)
- Chunks: ≤800 tokens with 100-token overlap for context continuity
- Tag each chunk: `{ document, section, pageRange, chunkIndex }`

### Phase 2 — Entity Extraction

For each chunk, extract:

```json
{
  "id": "org:acme-corp",
  "name": "Acme Corporation",
  "type": "organization",
  "aliases": ["Acme", "the Company", "Contractor"],
  "description": "General contractor party to the AIA A201 agreement",
  "category": "party",
  "source": ["contract.pdf §1.1"]
}
```

**Extraction targets per type:**
- `obligation` — "shall", "must", "agrees to", "is required to"
- `condition` — "if", "upon", "in the event", "provided that"
- `date` — deadlines, notice periods, effective dates, milestones
- `amount` — dollar thresholds, percentages, cap amounts
- `person` — named individuals with title/role
- `organization` — entities, agencies, subsidiaries, JVs

### Phase 3 — Relationship Extraction

```json
{
  "source": "org:acme-corp",
  "target": "obligation:notice-30-days",
  "type": "OBLIGATED_TO",
  "label": "must provide 30-day written notice before termination",
  "strength": 4,
  "context": "Acme shall provide written notice no fewer than 30 days prior to termination",
  "sourceRef": "contract.pdf §14.2"
}
```

**Relationship extraction triggers:**
- `OBLIGATED_TO` — "shall", "must", "agrees to provide"
- `TRIGGERS` — "upon X, Y shall..." / "in the event of X, Y..."
- `INDEMNIFIES` — "shall indemnify", "holds harmless", "bears liability"
- `CONFLICTS_WITH` — same obligation described differently in two clauses
- `CONDITIONALLY_REQUIRES` — "provided that", "subject to", "only if"

### Phase 4 — Deduplication

Match entities across chunks:
- Exact name match → merge immediately
- Alias match (e.g., "Acme" = "Acme Corporation") → merge, add to aliases[]
- Merge: union of source[], highest-confidence description wins
- Flag: same entity appearing in conflicting roles → `CONFLICTS_WITH` edge

### Phase 5 — Graph Assembly

```
nodes: deduplicated entity list (sorted by inDegree desc)
edges: all relationships with provenance
computed: inDegree, outDegree per node
flagged: obligation chains, conflict clusters, orphan entities
```

---

## Domain-Specific Patterns

### Legal / Contracts

**Priority extraction targets:**
- Obligation chains: A owes B → B owes C → find the full cascade
- Indemnification triggers and caps
- Notice periods and deadlines (create `date` nodes)
- Change-of-control triggers
- IP ownership and assignment clauses
- Termination triggers and cure periods
- Dispute resolution pathway (model as a graph path)

**Auto-flag:**
- Cascade chains (obligation triggers obligation)
- Clauses with missing cure periods
- Conflicting definitions of the same term
- Obligations without specified notice requirements

### M&A / Due Diligence

**Cross-document fusion tasks:**
- Entity deduplication across 40+ documents (same company, different spellings)
- Ownership chain reconstruction
- Key person dependency mapping (who appears in most obligations?)
- Change-of-control clause identification and impact
- IP gap and overlap detection
- Corroboration scoring: `sources.length / totalDocuments`

**Output for data rooms:**
- Entity graph with provenance (which doc contains which claim)
- Contradiction map between documents
- Red flag list: entities in conflicting roles

### Construction / Field Operations

**Extraction targets:**
- Invoice line items as `obligation` nodes (work performed → payment owed)
- Lien waiver triggers and conditions
- Notice requirements for change orders
- Subcontractor obligation chains
- Compliance document requirements and their deadlines
- Field ticket authorization chains

### Research / Intelligence

**Multi-source fusion:**
- Contradictions between analyst claims on same entity
- Events mentioned in only a subset of sources (flag as low-corroboration)
- Timeline reconstruction from events across documents
- Citation network: which claims cite which sources

---

## Output Format

### Required sections in every Document Mode response:

**1. Entity List**
```
Node ID | Name | Type | Description | InDegree | Sources
```

**2. Relationship Graph**
```
Source → Target | Type | Label | Strength | Source Ref
```

**3. Key Findings** (plain language, top 3-5)

**4. Obligation Chains** (if legal/contract context)
```
Party A → [obligation] → Party B → [triggers] → [condition] → Party C
```

**5. Conflict Flags**
- Contradiction: [Entity A description] vs [Entity B description]
- Cascade risk: [Obligation X] failure propagates to [Y parties]
- Missing: [required element not found]

**6. Provenance Map**
```
Claim: [description] | Source: [doc + clause] | Confidence: [high/medium/low]
```

For 10+ documents: lead with the merged graph showing only nodes with inDegree ≥ 3, then offer to drill into specific clusters.