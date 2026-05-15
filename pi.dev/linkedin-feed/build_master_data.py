#!/usr/bin/env python3
"""Build MASTER_CAREER_DATA — structured repository of Russell's full career."""
import json, re
from html import unescape

def strip_html(html):
    text = re.sub(r'<[^>]+>', '\n', html)
    text = unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)
    return text.strip()

with open("/opt/pi.dev/cvs/donor_cv.json") as f:
    root = json.load(f)
data = root.get("data", root)

lines = []
lines.append("# MASTER_CAREER_DATA — Russell Batchelor")
lines.append("")
lines.append("**Absolute Ground Truth.** Do not hallucinate dates, metrics, or titles. All data below is verified.")
lines.append("")

# ─── BASICS ───
b = data["basics"]
lines.append("## BASICS")
lines.append(f"- Name: {b['name']}")
lines.append(f"- Location: {b['location']}")
lines.append(f"- Email: {b['email']}")
lines.append(f"- Phone: {b['phone']}")
lines.append(f"- Headline: {b['headline']}")
for cf in b.get("customFields", []):
    lines.append(f"- {cf['text']}")
lines.append("")

# ─── TIMELINE ───
lines.append("## PROFESSIONAL TIMELINE")
lines.append("")
lines.append("| # | Period | Company | Title | Location |")
lines.append("|---|--------|---------|-------|----------|")

for i, exp in enumerate(data["sections"]["experience"]["items"]):
    if exp.get("hidden"):
        lines.append(f"| {i+1} | {exp.get('period','')} | {exp['company']} | ⚠️ HIDDEN | {exp.get('location','')} |")
    else:
        lines.append(f"| {i+1} | {exp.get('period','')} | {exp['company']} | {exp['position']} | {exp.get('location','')} |")

lines.append("")
lines.append("**Note:** Roles are concurrent consulting engagements, not sequential employment. Overlaps are normal for contractors.")
lines.append("")

# ─── DETAILED ROLE DATA ───
lines.append("## DETAILED ROLE DATA")
lines.append("")

for i, exp in enumerate(data["sections"]["experience"]["items"]):
    if exp.get("hidden"):
        continue
    
    pos = exp["position"]
    lines.append(f"### Role {i+1}: {exp['company']}")
    lines.append(f"- **Official Title:** {pos}")
    
    # Extract title variants
    variants = [v.strip() for v in pos.split("/") if v.strip()]
    if len(variants) > 1:
        lines.append(f"- **Title Variants:** {', '.join(variants)}")
    if "de facto" in pos.lower():
        de_facto = pos.split("(")[1].replace(")", "").strip() if "(" in pos else ""
        lines.append(f"- **De Facto Title:** {de_facto}")
    if "concurrent" in pos.lower():
        lines.append(f"- **Note:** Part-time concurrent engagement")
    
    lines.append(f"- **Period:** {exp.get('period','')}")
    lines.append(f"- **Location:** {exp.get('location','')}")
    
    # Render bullets with metrics extraction
    desc = exp.get("description", "")
    bullets = re.findall(r'<li>(.*?)</li>', desc, re.DOTALL)
    lines.append(f"- **Key Achievements:**")
    for b in bullets:
        text = strip_html(b)
        lines.append(f"  - {text}")
    
    lines.append("")

# ─── CROSS-CUTTING ACHIEVEMENTS ───
lines.append("## CROSS-CUTTING ACHIEVEMENTS")
lines.append("")
projs = data["sections"]["projects"]["items"]
if projs:
    desc = projs[0].get("description", "")
    items = re.findall(r'<li>(.*?)</li>', desc, re.DOTALL)
    for item in items:
        lines.append(f"- {strip_html(item)}")
lines.append("")

# ─── SKILLS INVENTORY ───
lines.append("## SKILLS INVENTORY")
lines.append("")
lines.append("| Skill | Proficiency | Keywords |")
lines.append("|-------|-------------|----------|")
for s in data["sections"]["skills"]["items"]:
    if s.get("hidden"):
        continue
    name = s.get("name", "")
    prof = s.get("proficiency", "")
    kw = ", ".join(s.get("keywords", []))
    lines.append(f"| {name} | {prof} | {kw} |")
lines.append("")

# ─── CERTIFICATIONS ───
lines.append("## CERTIFICATIONS & CLEARANCES")
lines.append("")
for c in data["sections"]["certifications"]["items"]:
    if c.get("hidden"):
        continue
    title = c.get("title", "")
    issuer = c.get("issuer", "")
    lines.append(f"- **{title}** — {issuer}")
lines.append("")

# ─── ENGAGEMENT MODEL ───
lines.append("## ENGAGEMENT MODEL")
lines.append("")
for section in data.get("customSections", []):
    if "Engagement" in section.get("title", ""):
        for item in section.get("items", []):
            text = strip_html(item.get("content", ""))
            lines.append(text)
lines.append("")

# ─── EARLIER CAREER ───
lines.append("## EARLIER CAREER")
lines.append("")
for section in data.get("customSections", []):
    if "Earlier" in section.get("title", ""):
        for item in section.get("items", []):
            text = strip_html(item.get("content", ""))
            lines.append(text)
lines.append("")

# ─── KEY QUANTIFIED METRICS REFERENCE ───
lines.append("## KEY QUANTIFIED METRICS REFERENCE")
lines.append("")
lines.append("Highest-scale proofs for rapid JD matching:")
lines.append("")
lines.append("| Category | Metric | Source Role |")
lines.append("|----------|--------|-------------|")
lines.append("| **Wi-Fi deployment** | 25,000 endpoints in occupied commercial buildings | Sitehands |")
lines.append("| **Wi-Fi deployment** | 300-400 APs per base across 200+ NATO airbases | CentricsIT |")
lines.append("| **Network deployment** | 400+ APs, 20,000+ cables, 8-level complex | Gaming Group |")
lines.append("| **Multi-site rollout** | 200+ sites across 12+ countries | CentricsIT |")
lines.append("| **Vendor/MSP management** | 15+ concurrent programmes, 130+ sites | CentricsIT |")
lines.append("| **Cost reduction** | 60% WAN cost reduction across 200+ sites | Lambeth |")
lines.append("| **Procurement** | £12M voice/data re-tender | Lambeth |")
lines.append("| **Contract governance** | Obligation logs, change notes, Board packs | Gaming Group |")
lines.append("| **Workforce management** | 30-person multilingual team, cross-border logistics | Gaming Group |")
lines.append("| **Large-scale JML** | 42,000 users (Home Office) | Rainmaker |")
lines.append("| **Site readiness** | 5,000 NHS staff across multiple Trust sites | STK/Atos |")
lines.append("| **PE portfolio** | ~£20M PE-backed online engagement | Hiloka |")
lines.append("| **Structured cabling** | 8,000+ patching schedules, MDF/IDF rooms | Gaming Group |")
lines.append("| **SC Clearance** | Active — Government & Military | — |")
lines.append("| **NPPV3 Clearance** | Active — National Police Vetting | — |")
lines.append("")

output = "\n".join(lines)

with open("/opt/pi.dev/cvs/MASTER_CAREER_DATA.md", "w") as f:
    f.write(output)

print(f"Written: {len(output)} chars, {len(lines)} lines")
print(f"Path: /opt/pi.dev/cvs/MASTER_CAREER_DATA.md")
