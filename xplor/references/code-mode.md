# Code Mode — Architecture and Dependency Mapping

## When to Use
Activate for: architectural reviews, codebase onboarding, refactoring analysis,
blast radius assessment, security audits, dependency mapping, call chain tracing,
incident root-cause tracing, or CI/CD integration analysis.

---

## Two Pipeline Variants

### v1 — GitHub API (Web / No Local Access)

```
1. Fetch repository tree via GitHub API (GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1)
2. Identify language(s) from file extensions
3. Find entry points: main.py | index.js | app.go | server.ts | etc.
4. Fetch top-level files and key module files
5. Claude analyses architecture via AI (no AST — structural inference)
6. Build module-level graph
```

**Limitation:** v1 cannot trace function-level call chains. Use for architecture overview.

### v2 — AST Parsing (Local / Claude Code)

```
1. Run Tree-sitter on each source file
2. Extract: functions, classes, imports, call expressions
3. Resolve call targets to their definitions
4. Build full call-chain graph with function/class/import nodes
5. Compute inDegree and outDegree for every node
6. Detect circular dependencies
```

**Use v2 when:** running in Claude Code with filesystem access.

---

## Extraction Pipeline (v2)

### Node Extraction Per File

```json
{
  "id": "func:validate-token",
  "name": "validateToken",
  "type": "function",
  "file": "src/auth/validator.py",
  "lineRange": [42, 67],
  "description": "Validates JWT tokens against the auth service",
  "metadata": {
    "inDegree": 12,
    "outDegree": 3
  }
}
```

### Edge Extraction

```json
{
  "source": "func:api-middleware",
  "target": "func:validate-token",
  "type": "CALLS",
  "label": "calls to validate incoming request token",
  "context": "validateToken(req.headers.authorization)",
  "sourceRef": "src/middleware/auth.py:23"
}
```

**Edge types:**
- `CALLS` — function invokes another function
- `IMPORTS` — module depends on another module
- `DEFINES` — file defines a class or function
- `EXTENDS` — class inherits from another
- `INSTANTIATES` — code creates an instance of a class

### Impact Ranking

Sort all nodes by `inDegree` (descending):
- High inDegree = many callers = high blast radius
- inDegree = 0 = potential dead code (flag for review)
- Bidirectional edge pairs = circular dependency (flag as architectural risk)

---

## Domain-Specific Queries

### Blast Radius Analysis
**"What breaks if I change X?"**

```
1. Find node for X
2. Traverse all CALLS/IMPORTS edges pointing TO X (direct callers)
3. Recurse: find all callers of callers, to depth N
4. Report: depth-annotated list of affected nodes
5. Summarize: "Changing X affects N files across M modules at depths 1-K"
```

### Security Audit
**"Trace every path from user input to database write"**

```
1. Find all entry-point functions that accept user-controlled parameters
2. Trace CALLS graph forward from each entry point
3. Identify all nodes that perform DB write operations
4. Report every path: entry → ... → db_write (with depth and intermediate nodes)
5. Flag paths with no input validation step
```

### Codebase Onboarding Tour
**"Help me understand this codebase as a new engineer"**

```
1. Start from entry points (main, index, app)
2. Load Level 1 descriptions for all top-level modules
3. Explain each module in plain language
4. Identify 3 most important call chains (by edge count + centrality)
5. Recommend 5 files to read first (by inDegree rank)
6. Flag any modules that seem overly coupled (high bidirectional edge count)
```

### Refactoring / Extraction
**"What's the blast radius if I extract the billing subsystem?"**

```
1. Identify all nodes tagged to billing domain (by file path / module name)
2. Find all edges crossing billing ↔ non-billing boundary
3. Classify: CALLS from outside into billing (dependencies to break)
4. Report: N files need changes, ranked by depth of dependency
5. Suggest: interface seam points that minimize coupling
```

### Circular Dependency Detection

Flag any pair (A → B → ... → A):
```
For each node, DFS traversal tracking visited set
If current node == start node → CIRCULAR_DEPENDENCY found
Report: chain of nodes forming the cycle
Severity: length of cycle (shorter = more tightly coupled = higher risk)
```

---

## Output Format

### Required sections in every Code Mode response:

**1. Architecture Overview**
Module map with plain-language descriptions (module → responsibility)

**2. Critical Files / Functions** (top 10 by inDegree)
```
Node | InDegree | Role | Risk if Changed
```

**3. Key Call Chains** (top 3-5 by importance)
```
entryPoint → module → function → ... → leaf
```

**4. Risk Flags**
- Circular dependencies (chain listed)
- High-coupling clusters (>5 mutual edges)
- Dead code candidates (inDegree = 0)
- God modules (single file with outDegree > 20)

**5. Blast Radius** (if requested)
```
Changing [node] → directly affects N nodes → transitively affects M nodes
Depth 1: [list] | Depth 2: [list] | ...
```

**6. Recommendations**
Architectural improvements based on graph structure (specific, actionable)