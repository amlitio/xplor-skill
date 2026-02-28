#!/usr/bin/env python3
"""
validate_links.py — Check all [[wikilinks]] in a skill graph directory.

Usage:
    python scripts/validate_links.py <directory>
    python scripts/validate_links.py <directory> --format json

Outputs a report of all broken wikilinks with source file and sentence context.
"""

import re
import json
import argparse
from pathlib import Path

FRONTMATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
WIKILINK_RE = re.compile(r'\[\[([^\]]+)\]\]')
SENTENCE_RE = re.compile(r'[^.!?\n]*\[\[[^\]]+\]\][^.!?\n]*[.!?\n]?')


def get_node_names(directory: Path) -> set:
    names = set()
    for f in directory.rglob('*.md'):
        names.add(f.stem.lower())
        match = FRONTMATTER_RE.match(f.read_text(encoding='utf-8', errors='replace'))
        if match:
            try:
                import yaml
                fm = yaml.safe_load(match.group(1)) or {}
                if fm.get('name'):
                    names.add(fm['name'].lower())
                for alias in fm.get('aliases', []):
                    names.add(alias.lower())
            except Exception:
                pass
    return names


def validate_links(directory: str) -> dict:
    path = Path(directory)
    node_names = get_node_names(path)
    
    broken = []
    valid_count = 0
    
    for md_file in path.rglob('*.md'):
        text = md_file.read_text(encoding='utf-8', errors='replace')
        match = FRONTMATTER_RE.match(text)
        body = text[match.end():] if match else text
        
        for sentence_match in SENTENCE_RE.finditer(body):
            sentence = sentence_match.group(0).strip()
            for link_match in WIKILINK_RE.finditer(sentence):
                target = link_match.group(1)
                target_key = target.lower().replace(' ', '-')
                
                if target_key in node_names or target.lower() in node_names:
                    valid_count += 1
                else:
                    broken.append({
                        'source_file': str(md_file),
                        'source_name': md_file.stem,
                        'target': target,
                        'context': sentence[:200]
                    })
    
    return {
        'valid_links': valid_count,
        'broken_links': len(broken),
        'broken': broken,
        'status': 'PASS' if not broken else 'FAIL'
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Validate wikilinks in a skill graph')
    parser.add_argument('directory', help='Path to skill graph directory')
    parser.add_argument('--format', choices=['table', 'json'], default='table')
    args = parser.parse_args()
    
    result = validate_links(args.directory)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2))
    else:
        status_icon = '✅' if result['status'] == 'PASS' else '❌'
        print(f"\n{status_icon} Link Validation: {result['status']}")
        print(f"   Valid: {result['valid_links']}  |  Broken: {result['broken_links']}")
        
        if result['broken']:
            print(f"\nBroken Links:")
            for item in result['broken']:
                print(f"  {item['source_name']}.md → [[{item['target']}]]")
                print(f"    Context: {item['context'][:100]}...")
                print()
    
    raise SystemExit(0 if result['status'] == 'PASS' else 1)