# Graph Core — Canonical Schema Reference

## Node Schema

```typescript
interface GraphNode {
  id: string;           // Namespaced: "skill:node-name" | "func:funcName" | "org:name"
  kind: "document" | "code" | "skill";
  type: NodeType;       // See entity types below
  name: string;         // Display name
  description: string;  // One-sentence summary — REQUIRED for quality score
  domain: string;       // Subject area: legal | finance | auth | therapy | ...
  tags: string[];
  content: {
    full: string;       // Level 4 — complete text
    sections: {         // Level 3 — section headers + previews
      heading: string;
      preview: string;  // First 200 chars
    }[];
    preview: string;    // Level 1 — first 100 chars
  };
  source: {
    filePath: string;
    lineRange?: [number, number];
    document?: string;  // Source document name (multi-doc mode)
  };
  metadata: {
    wordCount: number;
    aliases: string[];  // Alternative names for deduplication
    inDegree: number;   // Number of nodes pointing TO this node
    outDegree: number;  // Number of nodes this node points TO
  };
}
```

## Edge Schema

```typescript
interface GraphEdge {
  id: string;           // "source-id→target-id"
  source: string;       // Source node id
  target: string;       // Target node id
  type: EdgeType;
  label: string;        // Human-readable: "must provide 30-day notice"
  strength: 1 | 2 | 3 | 4 | 5;  // 1=weak, 5=definitive
  context?: string;     // Sentence/call-site containing the relationship
  sourceRef?: string;   // Document + clause/line reference
}
```

## Entity Types

### Document Mode
| Type | Description |
|---|---|
| `person` | Named individual with role |
| `organization` | Company, agency, or entity |
| `obligation` | Duty, covenant, or requirement |
| `condition` | If/then trigger or precondition |
| `event` | Action, deadline, or milestone |
| `concept` | Defined term or legal concept |
| `document` | Referenced exhibit or agreement |
| `date` | Deadline, effective date, notice period |
| `amount` | Dollar amount, percentage, threshold |
| `location` | Geographic place |

### Code Mode
| Type | Description |
|---|---|
| `function` | Named function or method |
| `class` | Class or interface definition |
| `module` | Top-level module or package |
| `file` | Source file as a unit |
| `import` | External dependency |
| `variable` | Global variable or constant |

### Skill Graph Mode
| Type | Description |
|---|---|
| `skill` | Actionable procedure |
| `moc` | Map of Content — navigation hub |
| `technique` | Specific method within a skill |
| `claim` | Verifiable assertion |
| `framework` | Structured methodology |
| `exploration` | Open question or hypothesis |

## Edge Types

### Universal
| Type | Usage |
|---|---|
| `REFERENCES` | General link to related content |
| `RELATED_TO` | Loose association |
| `CROSS_DOMAIN` | Link spanning domain boundaries |
| `CONTRADICTS` | Conflicting content |

### Document-Specific
| Type | Usage |
|---|---|
| `OBLIGATED_TO` | Entity has a duty |
| `INDEMNIFIES` | Entity bears liability |
| `TRIGGERS` | Condition activates an obligation |
| `CONFLICTS_WITH` | Contradictory terms |
| `PARTY_TO` | Entity is party to an agreement |
| `CONDITIONALLY_REQUIRES` | A is required if B |

### Code-Specific
| Type | Usage |
|---|---|
| `CALLS` | Function invokes another |
| `IMPORTS` | Module depends on another |
| `DEFINES` | File defines a class/function |
| `EXTENDS` | Class inherits from another |
| `INSTANTIATES` | Code creates an instance |

### Skill Graph-Specific
| Type | Usage |
|---|---|
| `CLUSTERS` | MOC groups related nodes |
| `EXTENDS` | Builds on / specializes another |

## ID Namespacing Convention

```
skill:node-name          → skill graph nodes
func:functionName        → code functions
class:ClassName          → code classes
module:module-name       → code modules
org:organization-name    → document organizations
person:person-name       → document persons
concept:concept-name     → document concepts
obligation:obligation-id → document obligations
```

## Multi-Document Provenance

When processing multiple documents, extend node with:
```typescript
interface MultiDocNode extends GraphNode {
  sources: {
    document: string;
    excerpt: string;
    confidence: number;  // 0.0–1.0
  }[];
  corroborationScore: number;  // sources.length / totalDocuments
}
```

Nodes with `corroborationScore < 0.3` are flagged as low-confidence single-source claims.