\# Agent Intelligence — Fusion, Attention Scoring, and Telemetry



\## Multi-Domain Graph Fusion



When inputs span multiple domains (e.g., code + documents, or multiple doc sets):



\### Fusion Pipeline



```

1\. Build individual graphs per input source

2\. Identify shared entities by name + alias matching (cross-graph)

3\. Merge nodes: union edges, prefer highest-confidence description

4\. Flag contradictions: same entity, conflicting attributes

5\. Add CROSS\_DOMAIN edges where applicable

6\. Apply unified progressive disclosure on merged graph

```



\### Cross-Domain Edge Detection



```

Trigger CROSS\_DOMAIN edge when:

\- A document entity (org/person) appears in a code file (e.g., a comment or config)

\- A skill graph concept maps to a document obligation

\- A code module is named after or references a business entity

```



\### Contradiction Resolution



When the same entity has conflicting attributes across sources:



```python

def resolve\_contradiction(nodeA, nodeB):

&nbsp;   if nodeA.source\_confidence > nodeB.source\_confidence:

&nbsp;       canonical = nodeA

&nbsp;       disputed = nodeB

&nbsp;   else:

&nbsp;       canonical = nodeB

&nbsp;       disputed = nodeA

&nbsp;   

&nbsp;   return {

&nbsp;       "canonical": canonical,

&nbsp;       "disputed": disputed,

&nbsp;       "edge": {

&nbsp;           "type": "CONTRADICTS",

&nbsp;           "label": f"conflicting: '{canonical.description}' vs '{disputed.description}'",

&nbsp;           "sources": \[canonical.source, disputed.source]

&nbsp;       }

&nbsp;   }

```



---



\## Attention Scoring



When traversing a large graph for a specific task, score every node to determine

traversal priority and Level 4 inclusion:



```python

def attention\_score(node, query, graph):

&nbsp;   return (

&nbsp;       semantic\_similarity(node.description, query) \* 0.50 +

&nbsp;       degree\_centrality(node.inDegree + node.outDegree, graph.maxDegree) \* 0.20 +

&nbsp;       moc\_adjacency(node, graph) \* 0.20 +

&nbsp;       path\_proximity(node, query\_seed\_nodes, graph) \* 0.10

&nbsp;   )

```



\*\*Component definitions:\*\*

\- `semantic\_similarity`: cosine similarity between node description embedding and query embedding (approximated via keyword overlap when embeddings unavailable)

\- `degree\_centrality`: `(node.inDegree + node.outDegree) / graph.maxDegree`

\- `moc\_adjacency`: 1.0 if node is a MOC, 0.7 if within 1 hop of a MOC, 0.0 otherwise

\- `path\_proximity`: `1 / (1 + shortest\_path\_distance)` from node to any query-matched seed node



---



\## Traversal Telemetry



Track traversal efficiency to improve over time:



```json

{

&nbsp; "queryId": "uuid",

&nbsp; "query": "What are the indemnification obligations of the contractor?",

&nbsp; "graphSize": { "nodes": 847, "edges": 1204 },

&nbsp; "traversal": {

&nbsp;   "level0Loaded": 847,

&nbsp;   "level1Loaded": 42,

&nbsp;   "level2Loaded": 18,

&nbsp;   "level3Loaded": 9,

&nbsp;   "level4Loaded": 5,

&nbsp;   "totalTokensConsumed": 4820,

&nbsp;   "hopsTraversed": 3

&nbsp; },

&nbsp; "answerQuality": {

&nbsp;   "nodesCited": 5,

&nbsp;   "confidenceScore": 0.87,

&nbsp;   "contradictionsFound": 1

&nbsp; }

}

```



Log telemetry to track:

\- Which traversal patterns work best per domain

\- Token efficiency (answer quality per token consumed)

\- Common query types → pre-warm specific Level 1/2 loads



---



\## Hybrid Search Strategy



When a node can't be found via graph traversal alone, fall back to hybrid search:



```

1\. BM25 keyword search across all node descriptions (lexical)

2\. Semantic similarity search on node embeddings (semantic)

3\. Combine: score = 0.5 \* bm25\_score + 0.5 \* semantic\_score

4\. Return top 10 candidates → continue graph traversal from there

```



Full search specification: `references/search.md`



---



\## Agent Orchestration Patterns



\### Pattern 1: Answer-First Traversal

For simple factual queries, find the answer node directly:

```

query → search → find node → load Level 4 → answer

```



\### Pattern 2: Chain Traversal

For obligation/dependency chains:

```

query → seed node → follow typed edges (OBLIGATED\_TO, TRIGGERS, CALLS) 

→ depth-first until chain terminates → report full path

```



\### Pattern 3: Contradiction Scan

For multi-document conflict detection:

```

query → merge graphs → find CONTRADICTS edges → load both conflicting nodes at L4

→ report discrepancy with provenance

```



\### Pattern 4: Gap Detection

For finding what's missing:

```

query → load Level 2 for all candidate nodes 

→ find broken links + orphan nodes → report gaps with context

```



\### Pattern 5: Cluster Exploration

For "what's in this domain?":

```

query → find domain MOC → load its CLUSTERS edges → load L1 for all clustered nodes

→ summarize cluster contents → offer to drill into specific subtopics

```

