# CLI Specification — Xplor Commands

## Installation

```bash
npm install -g xplor-cli
# or
pip install xplor
```

---

## Commands

### `xplor index`
Build or update a graph index from a source directory.

```bash
xplor index <path> [options]

Options:
  --mode <document|code|skill>  Force a specific analysis mode (default: auto-detect)
  --output <path>               Output directory for graph files (default: .xplor/)
  --watch                       Watch for file changes and re-index incrementally
  --include <glob>              File patterns to include (default: *.md, *.py, *.js, etc.)
  --exclude <glob>              File patterns to exclude
  --format <json|sqlite>        Storage format (default: json)

Examples:
  xplor index ./docs --mode skill
  xplor index ./src --mode code --watch
  xplor index ./data-room --mode document --output ./analysis/
```

### `xplor query`
Query an indexed graph from the command line.

```bash
xplor query "<question>" [options]

Options:
  --graph <path>        Path to graph index (default: .xplor/)
  --level <0-4>         Disclosure level for returned nodes (default: 2)
  --max-nodes <n>       Maximum nodes to return (default: 20)
  --format <table|json> Output format (default: table)
  --follow <edge-types> Traverse specific edge types (e.g., CALLS,IMPORTS)
  --depth <n>           Traversal depth (default: 3)

Examples:
  xplor query "What are the indemnification obligations?"
  xplor query "What breaks if validateToken changes?" --follow CALLS --depth 4
  xplor query "Show all MOC nodes" --format json
```

### `xplor score`
Score a skill graph's quality.

```bash
xplor score <path> [options]

Options:
  --fix         Auto-fix minor issues (missing types/domains, not broken links)
  --format <table|json|md>  Output format (default: table)
  --threshold <n>           Exit with error if score below threshold (default: 0)

Examples:
  xplor score ./knowledge-base
  xplor score ./runbooks --threshold 70
  xplor score ./docs --fix --format md > quality-report.md
```

### `xplor mcp`
Start an MCP server exposing the graph via MCP tools.

```bash
xplor mcp [options]

Options:
  --graph <path>   Graph index to serve (default: .xplor/)
  --port <n>       HTTP port (default: 3333)
  --transport <sse|stdio>  MCP transport (default: sse)
  --auth <token>   Bearer token for authentication

Examples:
  xplor mcp                              # Start local MCP server
  xplor mcp --port 8080 --auth mytoken  # Production MCP server
  xplor mcp --transport stdio            # For Claude Code integration
```

### `xplor fuse`
Merge multiple graphs into a single unified graph.

```bash
xplor fuse <graph1> <graph2> [...] [options]

Options:
  --output <path>        Output path for fused graph (default: ./fused.xplor/)
  --dedup <strategy>     Deduplication strategy: name|alias|both (default: both)
  --conflict <strategy>  Conflict resolution: highest-confidence|newest|flag-all

Examples:
  xplor fuse ./legal-graph ./org-graph --output ./merged/
  xplor fuse ./q1-docs ./q2-docs ./q3-docs --conflict flag-all
```

### `xplor skill`
Scaffold a new skill graph node or MOC.

```bash
xplor skill create <name> [options]

Options:
  --type <type>     Node type: skill|moc|technique|claim|framework|exploration
  --domain <domain> Domain: therapy|trading|legal|engineering|...
  --tags <tags>     Comma-separated tags

Examples:
  xplor skill create "cognitive-reframing" --type technique --domain therapy
  xplor skill create "therapy-index" --type moc --domain therapy
```

---

## Configuration File

Create `.xplor.json` in project root:

```json
{
  "mode": "auto",
  "include": ["**/*.md", "**/*.py", "**/*.ts"],
  "exclude": ["node_modules/**", ".git/**"],
  "output": ".xplor/",
  "format": "json",
  "mcp": {
    "port": 3333,
    "transport": "sse"
  },
  "scoring": {
    "minScore": 70,
    "warnOnOrphans": true,
    "warnOnBrokenLinks": true
  }
}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Score knowledge base
  run: |
    npx xplor score ./docs --threshold 70 --format json > quality.json
    cat quality.json
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
xplor score ./knowledge-base --threshold 65
if [ $? -ne 0 ]; then
  echo "Knowledge graph quality score below threshold. Fix issues before committing."
  exit 1
fi
```