#!/usr/bin/env python3
"""
Export Reactive Resume JSON to clean Markdown.

Usage:
    python3 json2md.py <input.json> [-o output.md]
"""

import json
import re
import sys
from pathlib import Path


def html_to_md(html: str) -> str:
    text = html
    # Add newline after each li closing tag to separate list items
    text = re.sub(r'</li>', '\n', text)
    text = re.sub(r'<p>\s*', '', text)
    text = re.sub(r'\s*</p>', '\n\n', text)
    text = re.sub(r'<ul>', '', text)
    text = re.sub(r'</ul>', '', text)
    text = re.sub(r'<li>\s*', '- ', text)
    text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ')
    return text.strip()


def build_markdown(data: dict) -> str:
    basics = data.get('basics', {})
    summary = data.get('summary', {})
    sections = data.get('sections', {})
    custom = data.get('customSections', [])
    
    md = []
    
    # Header
    md.append(f"# {basics.get('name', '')}")
    if basics.get('headline'):
        md.append("")
        md.append(f"**{basics.get('headline')}**")
    
    # Contact
    parts = []
    if basics.get('location'): parts.append(f"📍 {basics['location']}")
    if basics.get('email'): parts.append(f"✉️ {basics['email']}")
    if basics.get('phone'): parts.append(f"📞 {basics['phone']}")
    w = basics.get('website', {})
    if w.get('url'): parts.append(f"🔗 {w['url']}")
    for f in basics.get('customFields', []):
        if f.get('text'): parts.append(f"🛡️ {f['text']}")
    if parts:
        md.append("")
        md.append(" | ".join(parts))
    md.append("")
    md.append("---")
    
    # Summary
    if summary.get('content'):
        md.append("")
        md.append("## Professional Profile")
        md.append("")
        md.append(html_to_md(summary['content']))
    
    # Career Outcomes
    projs = sections.get('projects', {})
    if not projs.get('hidden') and projs.get('items'):
        for p in projs['items']:
            if not p.get('hidden') and p.get('description'):
                md.append("")
                md.append(f"## {p.get('name', 'Key Achievements')}")
                md.append("")
                md.append(html_to_md(p['description']))
    
    # Experience
    exp = sections.get('experience', {})
    if not exp.get('hidden') and exp.get('items'):
        md.append("")
        md.append("## Professional Experience")
        for e in exp['items']:
            if e.get('hidden'): continue
            md.append("")
            c = e.get('company', '')
            p = e.get('position', '')
            per = e.get('period', '')
            loc = e.get('location', '')
            if p: md.append(f"### {p}")
            md.append(f"**{c}** — {loc} | {per}")
            if e.get('description'):
                md.append("")
                md.append(html_to_md(e['description']))
            for r in e.get('roles', []):
                if r.get('position'):
                    md.append("")
                    md.append(f"**{r['position']}** — {r.get('period', '')}")
                if r.get('description'):
                    md.append("")
                    md.append(html_to_md(r['description']))
    
    # Skills
    sk = sections.get('skills', {})
    if not sk.get('hidden') and sk.get('items'):
        md.append("")
        md.append("## Skills & Proficiencies")
        md.append("")
        for s in sk['items']:
            if s.get('hidden'): continue
            n = s.get('name', '')
            pr = s.get('proficiency', '')
            kw = s.get('keywords', [])
            line = f"- **{n}**"
            if pr: line += f" ({pr})"
            if kw: line += f": {', '.join(kw)}"
            md.append(line)
    
    # Certifications
    certs = sections.get('certifications', {})
    if not certs.get('hidden') and certs.get('items'):
        md.append("")
        md.append("## Certifications & Clearances")
        md.append("")
        for c in certs['items']:
            if c.get('hidden'): continue
            t = c.get('title', '')
            iss = c.get('issuer', '')
            line = f"- **{t}**"
            if iss: line += f" — {iss}"
            md.append(line)
    
    # Custom Sections
    for section in custom:
        if section.get('hidden'): continue
        md.append("")
        md.append(f"## {section.get('title', '')}")
        md.append("")
        for item in section.get('items', []):
            if item.get('hidden'): continue
            if item.get('content'):
                md.append(html_to_md(item['content']))
    
    return '\n'.join(md) + '\n'


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 json2md.py <input.json> [-o output.md]")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"❌ File not found: {input_path}")
        sys.exit(1)
    
    output_path = None
    if '-o' in sys.argv:
        idx = sys.argv.index('-o')
        if idx + 1 < len(sys.argv):
            output_path = Path(sys.argv[idx + 1])
    if not output_path:
        output_path = input_path.with_suffix('.md')
    
    with open(input_path) as f:
        data = json.load(f)
    if 'data' in data:
        data = data['data']
    
    md = build_markdown(data)
    
    with open(output_path, 'w') as f:
        f.write(md)
    
    print(f"✅ Markdown written to {output_path}")
    print(f"   {len(md)} chars, {len(md.splitlines())} lines")


if __name__ == '__main__':
    main()
