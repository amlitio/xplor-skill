# Progressive Disclosure — Token Budgets and Traversal Rules

## The Five Levels

| Level | Name | What's Loaded | Tokens/Node | Use Case |
|---|---|---|---|---|
| 0 | Index | id + type only | ~2 | "What exists in this graph?" |
| 1 | Descriptions | + name + one-line description | ~15 | "What is each node about?" |
| 2 | Links | + incoming/outgoing edge list | ~30 | "What connects to what?" |
| 3 | Sections | + section headings + 200-char previews | ~80 | "What do relevant nodes contain?" |
| 4 | Full | Complete content | ~200–500 | "Deep read 3–8 critical nodes" |

## Context Window Capacity

| Context Window | Max Nodes at L0 | Max Nodes at L4 |
|---|---|---|
| 8K tokens | ~4,000 | ~16–40 |
| 32K tokens | ~16,000 | ~64–160 |
| 200K tokens | ~100,000 | ~400–1,000 |

**Rule:** Never load more nodes at Level 4 than your budget allows. Default: 3–8 nodes.

## Standard Traversal Algorithm

```
function traverseGraph(query, graph, tokenBudget):
  
  # Phase 1 — Index (Level 0)
  candidates = graph.allNodes(level=0)
  
  # Phase 2 — Filter by relevance (Level 1)
  scored = candidates.filter(node => 
    queryMatches(node.name, node.type, query)
  ).loadDescriptions(level=1)
  
  # Phase 3 — Expand by connections (Level 2)
  expanded = scored.top(20).loadLinks(level=2)
  neighbors = expanded.getNeighbors().loadDescriptions(level=1)
  
  # Phase 4 — Confirm depth (Level 3)
  confirmed = (expanded + neighbors)
    .rankByRelevance(query)
    .top(15)
    .loadSections(level=3)
  
  # Phase 5 — Deep read (Level 4)
  deepRead = confirmed
    .rankByScore()
    .top(min(8, tokenBudget / 400))
    .loadFull(level=4)
  
  return assembleAnswer(deepRead, confirmed, tokenBudget)
```

## Budget Allocation Rules

Allocate tokens across graph components:

```
Total budget: B tokens

Index overhead:        B * 0.05   (Level 0 — always)
Description layer:     B * 0.15   (Level 1 for candidates)
Link layer:            B * 0.10   (Level 2 for top candidates)
Section layer:         B * 0.20   (Level 3 for confirmed nodes)
Full content:          B * 0.40   (Level 4 for critical nodes)
Answer synthesis:      B * 0.10   (output generation)
```

## When to Stop Expanding

Stop traversal when:
- Token budget is 70% consumed
- Newly discovered nodes have relevance score < 0.3
- Traversal depth exceeds 4 hops from query-matching seed nodes
- Found 3+ converging paths to same answer

## Attention Scoring

Rank nodes for Level 4 inclusion using:

```
attentionScore = (
  semanticSimilarity(node.description, query) * 0.5 +
  degreeCentrality(node.inDegree + node.outDegree) * 0.2 +
  mocMembership(node.isMOC || node.inMOC) * 0.2 +
  pathDistance(node, querySeeds) * 0.1  // closer = higher score
)
```

## Multi-Document Fusion

When fusing graphs from multiple documents:

1. Load Level 0 index for all document graphs
2. Identify shared entities by name + alias matching
3. Merge: union of edges, intersection of descriptions (prefer higher-confidence source)
4. Flag contradictions: same entity, conflicting attributes → `CONTRADICTS` edge
5. Apply progressive disclosure on the merged graph