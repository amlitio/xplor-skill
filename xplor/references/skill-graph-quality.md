# Skill Graph Quality Scoring — Full Rubric

## Scoring Algorithm

```python
def score_skill_graph(nodes, edges):
    score = 100
    issues = []
    
    # === PENALTIES ===
    
    # Broken wikilinks: -10 per broken link
    broken_links = [e for e in edges if e.get("broken")]
    for link in broken_links:
        score -= 10
        issues.append(f"BROKEN_LINK: {link['source']} → [[{link['target']}]] (-10)")
    
    # Missing description: -5 per file
    no_description = [n for n in nodes if not n.get("description")]
    for node in no_description:
        score -= 5
        issues.append(f"MISSING_DESC: {node['name']} (-5)")
    
    # Orphan nodes (no edges in or out): -3 per node
    orphans = [n for n in nodes if n["inDegree"] == 0 and n["outDegree"] == 0]
    for node in orphans:
        score -= 3
        issues.append(f"ORPHAN: {node['name']} (-3)")
    
    # Missing type: -2 per file
    no_type = [n for n in nodes if not n.get("type")]
    for node in no_type:
        score -= 2
        issues.append(f"MISSING_TYPE: {node['name']} (-2)")
    
    # Missing domain: -1 per file
    no_domain = [n for n in nodes if not n.get("domain")]
    for node in no_domain:
        score -= 1
        issues.append(f"MISSING_DOMAIN: {node['name']} (-1)")
    
    # Circular-only pair (A→B AND B→A, no other connections): -2 per pair
    circular_pairs = find_isolated_bidirectional_pairs(nodes, edges)
    for pair in circular_pairs:
        score -= 2
        issues.append(f"CIRCULAR_PAIR: {pair[0]} ↔ {pair[1]} (-2)")
    
    # === BONUSES (max +20) ===
    
    moc_bonus = calculate_moc_coverage(nodes, edges)  # 0-10
    density_bonus = calculate_link_density(nodes, edges)  # 0-10
    
    score += moc_bonus + density_bonus
    score = max(0, min(100, score))
    
    return {
        "score": score,
        "issues": issues,
        "moc_bonus": moc_bonus,
        "density_bonus": density_bonus,
        "summary": grade(score)
    }
```

## MOC Coverage Bonus (0-10)

```python
def calculate_moc_coverage(nodes, edges):
    total_leaf_nodes = len([n for n in nodes if n["type"] != "moc"])
    if total_leaf_nodes == 0:
        return 0
    
    moc_nodes = [n for n in nodes if n["type"] == "moc"]
    covered_nodes = set()
    
    for moc in moc_nodes:
        # Nodes within 2 hops of a MOC are "covered"
        covered_nodes.update(get_neighbors(moc, edges, depth=2))
    
    coverage_ratio = len(covered_nodes) / total_leaf_nodes
    
    # Bonus: 0-10 based on coverage ratio
    return round(coverage_ratio * 10)
```

## Link Density Bonus (0-10)

```python
def calculate_link_density(nodes, edges):
    if len(nodes) == 0:
        return 0
    
    avg_degree = len(edges) / len(nodes)
    
    # Healthy range: 2.0-4.0 average connections per node
    if avg_degree < 1.0:
        return 0   # Too sparse — graph is barely connected
    elif avg_degree < 2.0:
        return 3   # Below healthy density
    elif avg_degree <= 4.0:
        return 10  # Healthy density range
    elif avg_degree <= 6.0:
        return 7   # Slightly over-linked but OK
    else:
        return 4   # Too dense — likely poorly scoped nodes
```

## Grade Thresholds

| Score | Grade | Meaning |
|---|---|---|
| 90-100 | ✅ Excellent | Production-ready, well-connected, no broken links |
| 75-89 | ✓ Good | Solid structure with minor gaps |
| 50-74 | ⚠ Fair | Usable but needs work — orphans and broken links present |
| 25-49 | ✗ Poor | Significant structural problems — major gaps in connectivity |
| 0-24 | ✗✗ Critical | Severely broken — most links dead, no MOC structure |

## Actionable Fix Priority

Rank fixes by ROI (points gained per fix):

1. **Fix broken wikilinks** (+10/each) — highest ROI
2. **Add descriptions to undescribed files** (+5/each)
3. **Connect orphan nodes** (+3/each) — link to relevant MOC or peer
4. **Add `type` to untyped files** (+2/each)
5. **Build MOC nodes** (bonus up to +10) — create if coverage < 60%
6. **Add `domain` to undomained files** (+1/each) — lowest ROI

## Minimum Viable Skill Graph

For a knowledge base to be useful for AI agent traversal:
- Score ≥ 70
- No broken wikilinks
- ≥ 80% of nodes have descriptions
- At least 1 MOC node per 8 leaf nodes
- Mean hop distance from root MOC to any leaf ≤ 3.5