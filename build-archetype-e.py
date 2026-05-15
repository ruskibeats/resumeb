#!/usr/bin/env python3
"""Build Archetype E JSON for Reactive Resume import."""

import json
import uuid
import urllib.request

# Load base from Archetype A for structure
with open('/Users/russellbatchelor/projects/Russell Batchelor CV/archetype-A-cv.json') as f:
    base = json.load(f)

resume = base.get('data', base)

# ── BASICS ──
resume['basics']['headline'] = "Operational Transformation Manager \u2014 AI | Workflow Redesign & Process Automation | SC + NPPV3 Cleared"
resume['basics']['customFields'] = [
    {
        "id": str(uuid.uuid4()),
        "icon": "shield-check",
        "text": "SC (Active) | NPPV3 (Active) | Available within 2 weeks",
        "link": ""
    }
]

# ── SUMMARY ──
summary_html = """<p>Operations improvement leader who builds automation \u2014 not just recommends it. 20+ years of coding workflows, scripting processes, and reducing operational friction. AI is the newest tool in the toolkit.</p>
<p>Operational improvement manager and process automation builder with 20+ years of finding operational friction and eliminating it with code, workflows, and now AI.</p>
<p>I have hands-on delivered laptops, EUC, and infrastructure \u2014 and I fully automated those processes, reducing massive engineering teams down to small informal teams. I know the work because I've done it. The automation is grounded in real knowledge of what's being replaced.</p>
<p>I have always looked to build automation \u2014 more workflows than AI. AI has added the layer for further improvement. At Atos I built WhatsApp bots that automatically closed service calls, used vision technology to find kit from photoing asset numbers \u2014 simple stuff that delivered a great increase.</p>
<p>Proven at enterprise scale: 42,000-user government migration, 6,100+ circuit migrations, 60% WAN cost reduction, 15+ concurrent programmes in regulated environments including NATO-aligned operational estates with zero-tolerance for disruption.</p>
<p>SC + NPPV3 cleared \u2014 able to operate in classified and regulated environments without clearance delay.</p>"""

resume['summary'] = {
    "title": "Professional Summary",
    "columns": 1,
    "hidden": False,
    "content": summary_html
}

# ── EXPERIENCE ──
def make_exp_item(company, position, location, period, description, roles=None):
    return {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "company": company,
        "position": position,
        "location": location,
        "period": period,
        "website": {"url": "", "label": ""},
        "description": description,
        "roles": roles or []
    }

experience_items = [
    # Hiloka parent
    make_exp_item(
        "Hiloka Limited",
        "Founder & Managing Director",
        "Hemel Hempstead, UK",
        "Jan 2010 \u2013 Present",
        "<p>Own consultancy vehicle through which all operational improvement and automation engagements are delivered. Operating since 2010 as the senior operational lead for PE-backed, technology, and regulated-sector clients. The methodology is consistent: walk into messy operations, find the friction points, build automation to eliminate them, and leave the operation running more efficiently than when I arrived.</p><p>Hands-on delivered laptops, EUC, and infrastructure \u2014 then fully automated those delivery processes, reducing massive engineering teams down to small informal teams passing on the workloads. Brought technical knowledge of how to do the job combined with the automation skill to do it with fewer people.</p>"
    ),

    # Atos - KEY ROLE with WhatsApp bots
    make_exp_item(
        "Atos (via Hiloka Limited)",
        "Infrastructure Programme Manager",
        "UK / NHS Estates",
        "Sept 2025 \u2013 Present",
        "<p>Delivered NHS live-estate infrastructure modernisation while building automation tools to reduce operational overhead \u2014 proving that small, cheap automation can close real operational gaps even in a regulated healthcare environment.</p><ul><li>Built WhatsApp bots that automatically closed service desk calls \u2014 reducing manual triage workload without requiring additional engineering headcount. Simple, low-cost automation that eliminated a manual process.</li><li>Used vision technology (camera + OCR/asset ID) to identify network equipment from photographs of asset numbers \u2014 closed a real operational gap in asset tracking with minimal cost.</li><li>Governed phased cutover sequencing across a live NHS estate, managing dependency chains and patient-service continuity obligations in parallel \u2014 zero-disruption delivery in a regulated environment.</li><li>Produced programme governance artefacts \u2014 risk registers, dependency maps, and cutover runbooks \u2014 appropriate for a regulated NHS operating environment.</li></ul>"
    ),

    # PE & AI Automation
    make_exp_item(
        "Hiloka Limited \u2014 Private Equity & AI Automation",
        "Founder & Managing Director",
        "Hemel Hempstead, UK",
        "Mar 2020 \u2013 Present",
        "<p>Applied AI-driven process automation across a ~\u00a320M PE-backed online portfolio. Identified manual operational workflows where humans were doing work that code should handle, automated them to eliminate overhead, and measured the impact on throughput and cost.</p><ul><li>Built AI workflow automation to re-engineer core business processes: mapped the operational friction points, wrote the automation scripts, deployed them into production, and tracked adoption. Reduced manual task volume without headcount increases.</li><li>Applied GenAI use case mapping to identify the highest-ROI automation opportunities across portfolio business units \u2014 connecting AI capability to genuine operational pain points, not deploying technology for its own sake.</li><li>Established an automation evaluation framework assessing tools on ROI, technical feasibility, integration complexity, and bottom-line efficiency \u2014 prevented uncommercial tool adoption and ensured every automation investment mapped to a quantified operational problem.</li></ul>"
    ),

    # AI Strategy & Innovation
    make_exp_item(
        "Hiloka Limited \u2014 AI Strategy & Digital Innovation",
        "Independent Consultant",
        "UK / Remote",
        "Jun 2025 \u2013 Present",
        "<p>Built AI POCs and prototype automations for operational pain points. Work is grounded in operational reality: connecting AI capability to genuine business friction rather than deploying technology for its own sake.</p><ul><li>Built prototype AI automations for internal operational processes \u2014 including legal document processing, prompt-engineered decision support, and automated document classification \u2014 delivering working prototypes within defined time and budget parameters.</li><li>Developed GenAI use case mapping frameworks used by client leadership teams to self-assess where automation could reduce manual effort, identify governance requirements, and build a prioritised delivery roadmap.</li></ul>"
    ),

    # Rainmaker Solutions
    make_exp_item(
        "Rainmaker Solutions",
        "Contract Operations Director",
        "London, UK",
        "Jan 2017 \u2013 Dec 2018",
        "<p>Operational delivery lead across 7 UK Central Government departments, driving multi-stream digital transformation programmes. The process improvement and automation mindset developed here now applies to AI-enabled operational transformation.</p><ul><li>Delivered a 42,000-user M365 migration for the Home Office as part of a multi-department digital transformation programme \u2014 built the delivery governance, managed cross-department dependencies, and delivered operational change at scale in complex, regulated government environments.</li><li>Operational lead for MHCLG, MoJ, FSA, Ofsted, and PINS digital transformation programmes \u2014 each requiring structured delivery governance, stakeholder coordination, and operational continuity across live government services.</li><li>GDS-aligned delivery methodology: built user-centred service designs, managed multi-supplier ecosystems, and produced the programme governance artefacts required for Cabinet Office assurance.</li></ul>"
    ),

    # CentricsIT
    make_exp_item(
        "CentricsIT",
        "Operations & Infrastructure Director, EMEA",
        "London, UK / EMEA",
        "Nov 2020 \u2013 Dec 2024",
        "<p>Standardised delivery workflows across a live portfolio of 15+ concurrent programmes serving Tier 1 finance, UK Government, NATO-aligned, and NHS clients.</p><ul><li>Standardised delivery workflows across 15+ concurrent programmes \u2014 eliminated bespoke process overhead where each programme previously had its own way of working. Enabled the team to scale without proportional headcount growth. This is process automation at enterprise scale, applied to programme delivery itself.</li><li>Governed end-to-end delivery across 130-site rollouts and 6,100+ circuit migrations in regulated environments \u2014 phased cutover governance, dependency management, and live-service continuity throughout.</li><li>NATO airbase deployment programme: 200+ airbases across 12+ nations, 300-400 access points per base \u2014 large-scale operational deployment in a militarily-regulated, aviation-adjacent operational context with zero-tolerance for disruption.</li><li>Produced executive reporting from engineering-level data to C-Suite and Board stakeholders; operational governance trusted by clients with zero-tolerance risk profiles.</li></ul>"
    ),

    # LVS
    make_exp_item(
        "Major International Gaming Group (LVS)",
        "Operations Director, Digital Gaming & Managed Services",
        "Bulgaria, EU",
        "Jan 2024 \u2013 Feb 2025",
        "<p>Built the full contract-to-cash operational system for a greenfield digital gaming platform from scratch \u2014 the first of its kind for the client in Europe.</p><ul><li>Owned end-to-end lifecycle: procurement, vendor management, service delivery, KPI reporting for a 1,200+ endpoint regulated estate.</li><li>Built and chaired the operational governance framework: weekly service reviews, Board-level KPI packs covering performance, risk, compliance, and commercial position.</li><li>Cross-functional delivery across product, operations, and technology \u2014 led a 24-engineer multilingual team through live service launch.</li></ul>"
    ),

    # Sitehands
    make_exp_item(
        "Sitehands LLC",
        "Operations Director / Project Director",
        "Europe",
        "Jan 2019 \u2013 Nov 2020",
        "<p>Led M&A-driven estate transformation across Europe, managing complex international delivery across approximately 25,000 endpoints and implementing operational control frameworks in live, occupied commercial environments \u2014 comparable operational complexity to regulated multi-site sectors such as aviation, transport, and utilities.</p>"
    ),

    # Lambeth
    make_exp_item(
        "London Borough of Lambeth",
        "Lead Enterprise Architect / Operations & Technology Director",
        "London, UK",
        "Mar 2009 \u2013 Apr 2015",
        "<p>Delivered large-scale operational transformation across a 5,000-employee, 200+ site public sector organisation \u2014 finding operational cost and eliminating it through process redesign.</p><ul><li>Achieved 60% reduction in WAN costs through operating model redesign and a \u00a312M competitive re-tender \u2014 commercial outcome delivered without service disruption across a complex live-estate environment.</li><li>Owned programme governance, supplier performance management, and Board-level commercial reporting throughout.</li></ul>"
    ),
]

# ── SKILLS ──
skill_groups = [
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "icon": "wrench",
        "iconColor": "#e11d48",
        "name": "Automation & Process Improvement",
        "proficiency": "5",
        "level": "0",
        "keywords": [
            "Hands-On Automation Building",
            "Workflow Scripting & Process Code",
            "Manual Process Elimination",
            "Workforce Reduction Through Automation",
            "Automated Service Desk Triage",
            "End-to-End Process Redesign"
        ]
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "icon": "chart-scatter",
        "iconColor": "#e11d48",
        "name": "Operational Excellence",
        "proficiency": "5",
        "level": "0",
        "keywords": [
            "Operational Process Improvement",
            "KPI/SLA Governance & Delivery",
            "Cross-Functional Delivery Ownership",
            "Zero-Disruption Deployment",
            "Multi-Vendor Ecosystem Management",
            "Regulated Environment Delivery"
        ]
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "icon": "cpu",
        "iconColor": "#e11d48",
        "name": "AI & Workflow Tools",
        "proficiency": "4",
        "level": "0",
        "keywords": [
            "AI Workflow Orchestration & Tool-Calling",
            "WhatsApp/Telegram Bots & Service Automation",
            "Vision AI / OCR Asset Tracking",
            "GenAI Use Case Mapping & POCs",
            "Structured Outputs & Schema Design",
            "Human-in-the-Loop Approval Systems"
        ]
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "icon": "users",
        "iconColor": "#e11d48",
        "name": "Stakeholder & Leadership",
        "proficiency": "5",
        "level": "0",
        "keywords": [
            "Executive Stakeholder Engagement",
            "Board-Level Reporting & Narrative",
            "Senior Leadership Influence",
            "Clear Communication of Complex Change",
            "Ambiguity Reduction & Structure Creation"
        ]
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "icon": "refresh-cw",
        "iconColor": "#e11d48",
        "name": "Change & Adoption",
        "proficiency": "4",
        "level": "0",
        "keywords": [
            "Workflow Redesign & Process Automation",
            "AI Adoption & Operational Change",
            "Capability Building & Workforce Transition",
            "Stakeholder Buy-In & Usage Metrics",
            "Post-Implementation Governance"
        ]
    },
]

# ── CERTIFICATIONS ──
certifications = [
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "Security Check (SC)",
        "issuer": "UK Government",
        "date": "Active",
        "website": {"url": "", "label": ""},
        "description": "Government security clearance for sensitive operational roles"
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "NPPV3",
        "issuer": "National Counter Terrorism / UK Police",
        "date": "Active",
        "website": {"url": "", "label": ""},
        "description": "Non-Police Personnel Vetting Level 3"
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "PRINCE2 Practitioner",
        "issuer": "AXELOS",
        "date": "",
        "website": {"url": "", "label": ""},
        "description": ""
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "ITIL Foundation",
        "issuer": "AXELOS",
        "date": "",
        "website": {"url": "", "label": ""},
        "description": ""
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "CCNA",
        "issuer": "Cisco",
        "date": "",
        "website": {"url": "", "label": ""},
        "description": ""
    },
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "title": "SASE Fundamentals",
        "issuer": "",
        "date": "",
        "website": {"url": "", "label": ""},
        "description": ""
    },
]

# ── PROFILES (LinkedIn) ──
profiles = [
    {
        "id": str(uuid.uuid4()),
        "hidden": False,
        "network": "LinkedIn",
        "username": "russellbatchelor",
        "url": "https://linkedin.com/in/russellbatchelor",
        "icon": "linkedin",
        "website": {"url": "https://linkedin.com/in/russellbatchelor", "label": "LinkedIn"}
    }
]

# ── APPLY TO RESUME ──
resume['sections']['profiles'] = {
    "title": "Profiles",
    "columns": 1,
    "hidden": True,
    "items": profiles
}

# Update experience - keep existing layout config
exp_section = resume['sections']['experience']
# It might be a list or dict - preserve structure but replace items
if isinstance(exp_section, list):
    resume['sections']['experience'] = experience_items
elif isinstance(exp_section, dict):
    exp_section['items'] = experience_items
    # Ensure title is right
    exp_section['title'] = "Professional Experience"
    exp_section['hidden'] = False

# Update skills
skills_section = resume['sections']['skills']
if isinstance(skills_section, dict):
    skills_section['items'] = skill_groups
    skills_section['title'] = "Core Competencies"
    skills_section['hidden'] = False

# Update certifications
cert_section = resume['sections']['certifications']
if isinstance(cert_section, dict):
    cert_section['items'] = certifications
    cert_section['title'] = "Education & Certifications"
    cert_section['hidden'] = False

# Hide unused sections
for sec_name in ['education', 'languages', 'interests', 'awards', 'publications', 'volunteer', 'references']:
    sec = resume['sections'].get(sec_name)
    if isinstance(sec, dict):
        sec['hidden'] = True
        sec['items'] = []

# Projects - hide
proj_section = resume['sections'].get('projects')
if isinstance(proj_section, list):
    resume['sections']['projects'] = []
elif isinstance(proj_section, dict):
    proj_section['hidden'] = True
    proj_section['items'] = []

# ── WRITE JSON ──
with open('/Users/russellbatchelor/projects/Russell Batchelor CV/archetype-E-cv.json', 'w') as f:
    json.dump(base, f, indent=2)

print("Archetype E JSON written to archetype-E-cv.json")
print(f"Experience items: {len(experience_items)}")
print(f"Skill groups: {len(skill_groups)}")
print(f"Certifications: {len(certifications)}")
