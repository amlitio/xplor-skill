# MCP Server Specification — Xplor Graph as MCP Tool

## Overview

Expose Xplor's knowledge graph as an MCP server so any MCP-compatible AI agent
(Claude, Claude Code, third-party agents) can query it via standardized tool calls.

MCP spec: https://modelcontextprotocol.io

---

## MCP Tool Definitions

### `graph_query`
Query the knowledge graph with a natural language question.

```json
{
  "name": "graph_query",
  "description": "Query the Xplor knowledge graph using natural language. Returns relevant nodes and relationships.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language question to answer from the graph"
      },
      "mode": {
        "type": "string",
        "enum": ["document", "code", "skill", "auto"],
        "default": "auto",
        "description": "Analysis mode — auto detects based on graph contents"
      },
      "maxNodes": {
        "type": "integer",
        "default": 20,
        "description": "Maximum nodes to return in response"
      },
      "disclosureLevel": {
        "type": "integer",
        "enum": [0, 1, 2, 3, 4],
        "default": 2,
        "description": "Progressive disclosure level (0=index only, 4=full content)"
      }
    },
    "required": ["query"]
  }
}
```

### `graph_traverse`
Traverse the graph from a seed node following specific edge types.

```json
{
  "name": "graph_traverse",
  "description": "Traverse the knowledge graph from a seed node, following specific relationship types to a specified depth.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "seedNodeId": {
        "type": "string",
        "description": "Starting node ID (e.g., 'org:acme-corp', 'func:validateToken')"
      },
      "edgeTypes": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Edge types to follow (e.g., ['CALLS', 'IMPORTS', 'OBLIGATED_TO'])"
      },
      "direction": {
        "type": "string",
        "enum": ["outgoing", "incoming", "both"],
        "default": "outgoing"
      },
      "maxDepth": {
        "type": "integer",
        "default": 3,
        "description": "Maximum traversal depth"
      },
      "disclosureLevel": {
        "type": "integer",
        "enum": [0, 1, 2, 3, 4],
        "default": 1
      }
    },
    "required": ["seedNodeId"]
  }
}
```

### `graph_node`
Retrieve a specific node by ID at a specified disclosure level.

```json
{
  "name": "graph_node",
  "description": "Retrieve a specific knowledge graph node by its ID.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": {
        "type": "string",
        "description": "Node ID to retrieve"
      },
      "disclosureLevel": {
        "type": "integer",
        "enum": [0, 1, 2, 3, 4],
        "default": 3
      }
    },
    "required": ["nodeId"]
  }
}
```

### `graph_search`
Hybrid search across node names, descriptions, and content.

```json
{
  "name": "graph_search",
  "description": "Search knowledge graph nodes by keyword or semantic similarity.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "nodeTypes": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Filter by node type (e.g., ['obligation', 'function'])"
      },
      "domain": {
        "type": "string",
        "description": "Filter by domain"
      },
      "maxResults": {
        "type": "integer",
        "default": 10
      }
    },
    "required": ["query"]
  }
}
```

### `graph_score`
Score a skill graph's quality and return specific issues.

```json
{
  "name": "graph_score",
  "description": "Score a skill graph's quality (0-100) and return specific, actionable issues.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "graphId": {
        "type": "string",
        "description": "ID of the graph to score"
      }
    },
    "required": ["graphId"]
  }
}
```

---

## MCP Server Implementation Sketch

```python
# server.py — FastMCP implementation
from mcp.server.fastmcp import FastMCP
from xplor import XplorGraph

mcp = FastMCP("xplor-graph")
graph = XplorGraph()

@mcp.tool()
def graph_query(query: str, mode: str = "auto", max_nodes: int = 20, 
                disclosure_level: int = 2) -> dict:
    """Query the knowledge graph with a natural language question."""
    results = graph.query(query, mode=mode)
    nodes = results.top(max_nodes).at_level(disclosure_level)
    return {
        "nodes": [n.to_dict() for n in nodes],
        "edges": results.relevant_edges(nodes),
        "summary": results.plain_language_summary()
    }

@mcp.tool()
def graph_traverse(seed_node_id: str, edge_types: list = None,
                   direction: str = "outgoing", max_depth: int = 3,
                   disclosure_level: int = 1) -> dict:
    """Traverse from a seed node following specific edge types."""
    path = graph.traverse(seed_node_id, edge_types=edge_types,
                          direction=direction, max_depth=max_depth)
    return {
        "path": [n.at_level(disclosure_level).to_dict() for n in path],
        "depth": len(path),
        "edgesTraversed": path.edges
    }
```

---

## Deployment

### Claude Code (local)
```bash
# Register as local MCP server
claude mcp add xplor-graph -- python server.py
```

### Claude API (remote)
```json
{
  "mcp_servers": [{
    "type": "url",
    "url": "https://your-xplor-server.com/sse",
    "name": "xplor-graph"
  }]
}
```

### Agent SDK
```typescript
const agent = new Agent({
  mcpServers: [{
    name: "xplor-graph",
    url: "https://your-xplor-server.com/sse"
  }]
});
```