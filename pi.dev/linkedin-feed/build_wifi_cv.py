#!/usr/bin/env python3
"""Build tailored CV for Wi-Fi PM role from donor CV + interview responses."""
import json

with open("/tmp/donor-cv.json") as f:
    root = json.load(f)

data = root.get("data", root)
cv = dict(data)

# ─── HEADLINE ───
cv["basics"]["headline"] = "Infrastructure Project Manager | Wi-Fi & Network Deployment | Multi-Site Rollouts | MSP Coordination | SC + NPPV3"

# ─── SUMMARY ───
cv["summary"]["content"] = """<p>Infrastructure Project Manager with 25+ years delivering large-scale Wi-Fi, network, and workplace technology deployments across multi-site estates in regulated and commercial environments. Proven track record managing MSPs, field engineers, and third-party suppliers to deliver Wi-Fi rollouts in occupied buildings — from 25,000 endpoints across European retail, finance, and shopping estates to 200+ NATO airbase network upgrades covering service areas, logistics, and customer-facing environments. Hands-on, visible, and experienced in fast-moving delivery where site coordination, stakeholder communication, and service continuity are critical. SC and NPPV3 cleared. Available within 2 weeks.</p>"""

# ─── GAMING GROUP — Project Manager, full rewrite ───
gi_desc = """<p>Brought in as Project Manager to lead a flagship, multi-operator digital build spanning London, Las Vegas, Singapore, and Sofia. Full lifecycle responsibility for digital/IT scope across an 8-level complex in Europe, operating as the main contractor's primary technology interface for delivery and contract governance.</p><ul><li>Directed deployment of 400+ WiFi access points and 20,000+ cables across AV, WiFi, CCTV, and fibre/copper backbones; designed and executed 8,000+ patching schedules enabling phased activation across the estate.</li><li>Delivered PCR/MDF core rooms, racks/PDUs, in-row cooling, structured cabling, and network readiness (DNAC/ISE/Infoblox integration) with milestone gating (FNLT/Go-Live) and clean-down protocols.</li><li>Established contract governance including obligation and decision logs, formal change notes, commercial event register, and evidence packs supporting contractual compliance and dispute defence.</li><li>Chaired weekly programme and contract boards; produced Board/PMO packs (KPI/SLA, risk, schedule variance) and maintained a central repository for audits and assurance.</li><li>Managed 30-person multilingual workforce across multiple jurisdictions, coordinating rotation, visas, and cross-border logistics (bonded freight, asset security, JIT staging).</li></ul>"""

for i, item in enumerate(cv["sections"]["experience"]["items"]):
    if "Gaming" in item["company"]:
        cv["sections"]["experience"]["items"][i]["position"] = "Project Manager"
        cv["sections"]["experience"]["items"][i]["description"] = gi_desc
        break

# ─── CENTRICSIT — emphasise NATO WiFi ───
cen_desc = """<p>EMEA programme delivery lead accountable for multi-site technology deployment across a live portfolio of 15+ concurrent programmes for Tier 1 finance, UK Government, NATO, and NHS clients.</p><ul><li>Led large-scale WiFi and network deployment programme across 200+ NATO airbases in Europe — delivering 300-400 WiFi access points per base across service areas, shopping malls, food courts, warehousing, and logistics facilities; coordinated field engineering teams, MSPs, and multi-country site access across 12+ nations.</li><li>Managed 7,000+ endpoint deployments and 6,100+ circuit migrations across EMEA, directing access provisioning, device rollouts, and user readiness alongside infrastructure delivery.</li><li>Oversaw end-to-end IT operations and field engineering coordination across 130+ active sites, maintaining SLA performance through structured governance and supplier management.</li></ul>"""

for i, item in enumerate(cv["sections"]["experience"]["items"]):
    if "CentricsIT" in item["company"]:
        cv["sections"]["experience"]["items"][i]["description"] = cen_desc
        break

# ─── SITEHANDS — lead with WiFi ───
sh_desc = """<p>Operations delivery lead for large-scale technology deployment programmes across multi-country European environments, responsible for end-to-end WiFi and network rollout coordination in occupied commercial buildings.</p><ul><li>Oversaw Wi-Fi deployments across approximately 25,000 endpoints in occupied commercial buildings — including Tier 1 banks, high street retail chains, car dealerships, supermarkets, and shopping malls across the UK and Europe; managed user impact, access sequencing, and service continuity throughout live environments.</li><li>Coordinated multi-site rollout across European estates, directing MSPs and field engineer teams to deliver within tight change windows in customer-facing environments.</li></ul>"""

for i, item in enumerate(cv["sections"]["experience"]["items"]):
    if "Sitehands" in item["company"]:
        cv["sections"]["experience"]["items"][i]["description"] = sh_desc
        break

# ─── STK — keep with agency shielding ───
# Already good as STK Limited with the existing bullets covering multi-site rollout

# ─── HILOKA ───
# Keep existing - concurrent infras programmes

# ─── RAINMAKER — add network consultant framing ───
rm_desc = """<p>Programme delivery and technical consultancy for network infrastructure and EUC deployments across multiple UK Central Government departments under GDS assurance standards.</p><ul><li>Served as technical consultant for network and infrastructure deployments across 7 central government departments, coordinating procurement strategy, vendor selection, and delivery assurance.</li><li>Led Microsoft 365 and Windows onboarding for Home Office (~42,000 users) and MHCLG (~4,000 users), coordinating bulk provisioning and service desk integration.</li><li>Managed procurement strategy and delivery coordination across networking, cloud, and EUC platforms for multiple departments.</li></ul>"""

for i, item in enumerate(cv["sections"]["experience"]["items"]):
    if "Rainmaker" in item["company"]:
        cv["sections"]["experience"]["items"][i]["description"] = rm_desc
        break

# ─── LAMBETH — add borough WiFi ───
for i, item in enumerate(cv["sections"]["experience"]["items"]):
    if "Lambeth" in item["company"]:
        desc = item.get("description", "")
        new_bullet = "<li>Developed outdoor borough-wide WiFi network across the estate; led commercial transition to third-party mobile operator for ongoing service delivery.</li>\n"
        desc = desc.replace("</ul>", new_bullet + "</ul>")
        cv["sections"]["experience"]["items"][i]["description"] = desc
        break

# ─── CAREER OUTCOMES ───
cv["sections"]["projects"]["title"] = "Key Infrastructure Delivery Achievements"
cv["sections"]["projects"]["items"][0]["description"] = """<ul><li>Wi-Fi deployment across 200+ NATO airbases in Europe — 300-400 APs per base across service areas, shopping malls, food courts, and logistics facilities</li><li>25,000 Wi-Fi endpoints deployed across occupied commercial buildings — Tier 1 finance, retail chains, and shopping centres across UK and Europe</li><li>Flagship digital build across 8-level complex — 400+ WiFi APs, 20,000+ cables, MDF/IDF rooms, structured cabling, DNAC/ISE/Infoblox integration</li><li>Microsoft 365 onboarding and migration for ~42,000 Home Office users under GDS assurance</li><li>60% WAN cost reduction across 200+ London Borough of Lambeth sites; led £12M voice and data services re-tender</li><li>Outdoor borough-wide WiFi network developed and transitioned to third-party mobile operator</li></ul>"""

# ─── RATE ───
for section in cv.get("customSections", []):
    if "Engagement" in section.get("title", ""):
        for item in section.get("items", []):
            if "rate" in item.get("content", "").lower():
                item["content"] = """<p>Vehicle: Hiloka Limited (sole director) | Target rate: £450/day | Availability: Within 2 weeks</p><p>Engagement type: Contract / inside IR35 considered | Location: UK-based with flexibility for on-site delivery</p>"""

# ─── SKILLS — reorder ───
skills = cv["sections"]["skills"]["items"]
# Move IT Ops, Network, Stakeholder, Vendor, Regulated to front
priority = ["network", "infrastructure", "operations", "vendor", "stakeholder", "regulated", "governance"]
front = []
back = []
for s in skills:
    name = s.get("name", "").lower()
    if any(p in name for p in priority):
        front.append(s)
    else:
        back.append(s)
cv["sections"]["skills"]["items"] = front + back

# ─── WRITE ───
output_path = "/Users/russellbatchelor/projects/Russell Batchelor CV/team_outputs/CV_Russell_Batchelor_WiFi_PM.json"
with open(output_path, "w") as f:
    json.dump(cv, f, indent=2)

print("✅ Tailored CV written")
print(f"   {len([e for e in cv['sections']['experience']['items'] if not e.get('hidden')])} experience blocks")
print(f"   {len(cv['sections']['skills']['items'])} skills")
print(f"   Headline: {cv['basics']['headline']}")
