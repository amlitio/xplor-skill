#!/usr/bin/env python3
"""
score_graph.py — Xplor Skill Graph Quality Scorer

Usage:
    python scripts/score_graph.py <directory>
    python scripts/score_graph.py <directory> --fix
    python scripts/score_graph.py <directory> --format json

Scores a directory of markdown files as a skill graph:
- Parses YAML frontmatter for required fields
- Extracts and resolves [[wikilinks]]
- Detects orphan nodes, broken links, missing metadata
- Outputs score 0-100 with specific, actionable issues
"""

import os
import re
import json
import argparse
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Run: pip install pyyaml")
    raise SystemExit(1)


FRONTMATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
WIKILINK_RE = re.compile(r'\[\[([^\]]+)\]\]')


def parse_file(filepath: Path) -> dict:
    """Parse a markdown file and return node data."""
    text = filepath.read_text(encoding='utf-8', errors='replace')
    
    node = {
        'file': str(filepath),
        'name': filepath.stem,
        'description': None,
        'type': None,
        'domain': None,
        'tags': [],
        'aliases': [],
        'extends': [],
        'contradicts': [],
        'wikilinks': [],
    }
    
    # Parse frontmatter
    match = FRONTMATTER_RE.match(text)
    if match:
        try:
            fm = yaml.safe_load(match.group(1)) or {}
            node['name'] = fm.get('name', filepath.stem)
            node['description'] = fm.get('description', '').strip() or None
            node['type'] = fm.get('type')
            node['domain'] = fm.get('domain')
            node['tags'] = fm.get('tags', [])
            node['aliases'] = fm.get('aliases', [])
            node['extends'] = fm.get('extends', [])
            node['contradicts'] = fm.get('contradicts', [])
        except yaml.YAMLError:
            pass
    
    # Extract wikilinks from body
    body = text[match.end():] if match else text
    node['wikilinks'] = list(set(WIKILINK_RE.findall(body)))
    
    return node


def score_graph(directory: str) -> dict:
    """Score a skill graph directory."""
    path = Path(directory)
    md_files = list(path.rglob('*.md'))
    
    if not md_files:
        return {'score': 0, 'error': 'No markdown files found', 'issues': []}
    
    # Parse all files
    nodes = [parse_file(f) for f in md_files]
    
    # Build name → node index (include aliases)
    name_index = {}
    for node in nodes:
        name_index[node['name'].lower()] = node
        name_index[Path(node['file']).stem.lower()] = node
        for alias in node.get('aliases', []):
            name_index[alias.lower()] = node
    
    # Build edges and detect broken links
    edges = []
    broken_links = []
    
    for node in nodes:
        for target_name in node['wikilinks']:
            target_key = target_name.lower().replace(' ', '-')
            if target_key in name_index:
                edges.append({
                    'source': node['name'],
                    'target': name_index[target_key]['name'],
                    'type': 'CLUSTERS' if node.get('type') == 'moc' else 'REFERENCES',
                    'broken': False
                })
            else:
                broken_links.append({
                    'source': node['name'],
                    'source_file': node['file'],
                    'target': target_name
                })
                edges.append({
                    'source': node['name'],
                    'target': target_name,
                    'type': 'REFERENCES',
                    'broken': True
                })
        
        for target_name in node.get('extends', []):
            target_key = target_name.lower()
            if target_key in name_index:
                edges.append({
                    'source': node['name'],
                    'target': name_index[target_key]['name'],
                    'type': 'EXTENDS',
                    'broken': False
                })
    
    # Compute degree for each node
    degree = {n['name']: {'in': 0, 'out': 0} for n in nodes}
    for edge in edges:
        if not edge.get('broken'):
            if edge['source'] in degree:
                degree[edge['source']]['out'] += 1
            if edge['target'] in degree:
                degree[edge['target']]['in'] += 1
    
    # Detect orphans
    orphans = [n for n in nodes 
                if degree[n['name']]['in'] == 0 and degree[n['name']]['out'] == 0]
    
    # Detect missing metadata
    no_description = [n for n in nodes if not n.get('description')]
    no_type = [n for n in nodes if not n.get('type')]
    no_domain = [n for n in nodes if not n.get('domain')]
    
    # Score calculation
    score = 100
    issues = []
    
    for link in broken_links:
        score -= 10
        issues.append({
            'severity': 'error',
            'type': 'BROKEN_LINK',
            'message': f"[[{link['target']}]] not found",
            'file': link['source_file'],
            'penalty': -10
        })
    
    for node in no_description:
        score -= 5
        issues.append({
            'severity': 'warning',
            'type': 'MISSING_DESCRIPTION',
            'message': 'Missing description in frontmatter',
            'file': node['file'],
            'penalty': -5
        })
    
    for node in orphans:
        score -= 3
        issues.append({
            'severity': 'warning',
            'type': 'ORPHAN_NODE',
            'message': 'Node has no connections (inDegree=0, outDegree=0)',
            'file': node['file'],
            'penalty': -3
        })
    
    for node in no_type:
        score -= 2
        issues.append({
            'severity': 'info',
            'type': 'MISSING_TYPE',
            'message': 'Missing type in frontmatter',
            'file': node['file'],
            'penalty': -2
        })
    
    for node in no_domain:
        score -= 1
        issues.append({
            'severity': 'info',
            'type': 'MISSING_DOMAIN',
            'message': 'Missing domain in frontmatter',
            'file': node['file'],
            'penalty': -1
        })
    
    # MOC bonus (0-10)
    moc_nodes = [n for n in nodes if n.get('type') == 'moc']
    non_moc = [n for n in nodes if n.get('type') != 'moc']
    moc_bonus = 0
    if non_moc:
        covered = set()
        for moc in moc_nodes:
            for edge in edges:
                if edge['source'] == moc['name'] and not edge.get('broken'):
                    covered.add(edge['target'])
        coverage = len(covered) / len(non_moc)
        moc_bonus = round(min(10, coverage * 10))
    
    # Link density bonus (0-10)
    valid_edges = [e for e in edges if not e.get('broken')]
    avg_degree = len(valid_edges) / max(len(nodes), 1)
    if avg_degree < 1.0:
        density_bonus = 0
    elif avg_degree < 2.0:
        density_bonus = 3
    elif avg_degree <= 4.0:
        density_bonus = 10
    elif avg_degree <= 6.0:
        density_bonus = 7
    else:
        density_bonus = 4
    
    score += moc_bonus + density_bonus
    score = max(0, min(100, score))
    
    grade = (
        'Excellent' if score >= 90 else
        'Good' if score >= 75 else
        'Fair' if score >= 50 else
        'Poor' if score >= 25 else
        'Critical'
    )
    
    return {
        'score': score,
        'grade': grade,
        'summary': {
            'total_nodes': len(nodes),
            'total_edges': len(valid_edges),
            'broken_links': len(broken_links),
            'orphan_nodes': len(orphans),
            'moc_nodes': len(moc_nodes),
            'avg_degree': round(avg_degree, 2),
        },
        'bonuses': {
            'moc_coverage': moc_bonus,
            'link_density': density_bonus
        },
        'issues': issues,
        'recommendations': generate_recommendations(issues, score)
    }


def generate_recommendations(issues: list, score: int) -> list:
    recs = []
    broken = [i for i in issues if i['type'] == 'BROKEN_LINK']
    orphans = [i for i in issues if i['type'] == 'ORPHAN_NODE']
    no_desc = [i for i in issues if i['type'] == 'MISSING_DESCRIPTION']
    
    if broken:
        recs.append(f"Fix {len(broken)} broken wikilinks — highest ROI (+{len(broken)*10} pts)")
    if no_desc:
        recs.append(f"Add descriptions to {len(no_desc)} files (+{len(no_desc)*5} pts)")
    if orphans:
        recs.append(f"Connect {len(orphans)} orphan nodes to a MOC or peer (+{len(orphans)*3} pts)")
    if score < 70:
        recs.append("Consider adding MOC nodes if coverage < 60% of leaf nodes")
    
    return recs


def print_table(result: dict):
    print(f"\n{'='*60}")
    print(f"  Xplor Skill Graph Quality Score")
    print(f"{'='*60}")
    print(f"  Score: {result['score']}/100  ({result['grade']})")
    print(f"  Nodes: {result['summary']['total_nodes']}  |  "
          f"Edges: {result['summary']['total_edges']}  |  "
          f"Avg Degree: {result['summary']['avg_degree']}")
    print(f"  MOC nodes: {result['summary']['moc_nodes']}  |  "
          f"Orphans: {result['summary']['orphan_nodes']}  |  "
          f"Broken links: {result['summary']['broken_links']}")
    print(f"\n  Bonuses: MOC coverage +{result['bonuses']['moc_coverage']}  |  "
          f"Link density +{result['bonuses']['link_density']}")
    
    if result['issues']:
        print(f"\n  Issues ({len(result['issues'])}):")
        for issue in result['issues']:
            penalty = issue.get('penalty', '')
            file_short = Path(issue['file']).name
            print(f"    [{issue['severity'].upper():7}] {issue['type']:22} {penalty:4}  {file_short}")
    
    if result['recommendations']:
        print(f"\n  Recommendations:")
        for rec in result['recommendations']:
            print(f"    → {rec}")
    
    print(f"{'='*60}\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Score a skill graph directory')
    parser.add_argument('directory', help='Path to skill graph directory')
    parser.add_argument('--format', choices=['table', 'json'], default='table')
    parser.add_argument('--threshold', type=int, default=0,
                        help='Exit with code 1 if score below threshold')
    args = parser.parse_args()
    
    result = score_graph(args.directory)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        print_table(result)
    
    if result['score'] < args.threshold:
        raise SystemExit(1)