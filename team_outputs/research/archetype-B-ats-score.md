# ATS Compatibility Analysis: Archetype B (Senior Infrastructure Programme Manager) CV

**Date:** 2026-05-04
**Analyst:** ATS Compatibility Subagent
**Target Role:** Senior Infrastructure Programme Manager — Multi-Workstream Delivery, RAID & Dependency Control

---

## Overall Score: 89/100

The Archetype B CV scores **89/100** — matching Archetype A's score and **+4 points above the current live baseline (85/100)**. This is a strong "green-zone" score indicating excellent ATS parsing compatibility across all major platforms (Workday, Taleo, Lever, Greenhouse, SuccessFactors).

However, Archetype B achieves this score through a **different profile of strengths** compared to Archetype A — stronger content relevance and keyword density, but slightly lower structure compliance due to the Hiloka nested-role architecture.

---

## Dimension-by-Dimension Scoring

### 1. Structure Compliance — 82/100 (Weight: 30%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Section headings clear & standardised | ⚠️ Good | Most headings are clear; "Key Programme Delivery Achievements", "Earlier Career", "Engagement Model" are non-standard |
| Logical flow & organisation | ✅ Strong | Summary → Achievements → Experience → Skills → Certifications → Earlier Career → Engagement Model |
| Standard section names used | ⚠️ Moderate | "Professional Experience" ✓, "Core Skills" ✓, "Certifications & Clearances" ✓, but three custom sections |
| Consistent bullet point usage | ✅ Strong | All experience entries use consistent `<ul><li>` bullet points throughout |

**Issues identified:**
- **Education section hidden** (`hidden: true`). Many ATS systems expect an education section. Even for a 25+ year career, a minimal entry improves completeness.
- **"Key Programme Delivery Achievements"** is a non-standard heading (maps to `projects` section type). ATS parsers may not recognise this. Renaming to "Key Achievements" would improve parsing.
- **"Earlier Career"** and **"Engagement Model"** are completely non-standard sections not recognised by ATS. The Engagement Model contains rate information (£600-£800/day) — this may be flagged or stripped by some ATS platforms, and may be viewed negatively by recruiters.
- **Nested role structure**: The Hiloka Ltd entry contains two nested roles (Collective IP, Hiloka Advisory) with date ranges that overlap each other and overlap with Atos. Some ATS parsers struggle with nested role hierarchies — content beneath "roles" arrays may be flattened, merged with the parent, or lost entirely depending on the parser.
- **"Professional Profile"** instead of the simpler "Summary" or "Professional Summary" — minor, but some ATS recognise "Summary" more reliably.

### 2. Keyword Optimization — 92/100 (Weight: 25%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Job-specific keyword density | ✅ Excellent | "Senior Infrastructure Programme Manager", multi-workstream, RAID, dependency control — excellent placement in headline, summary, every role |
| Skill keyword relevance | ✅ Excellent | RAID, dependency management, JML, SASE, SD-WAN, EUC, M365, ServiceNow, GDS, NATO, NHS — all highly relevant |
| Avoidance of graphics/images | ✅ Strong | No graphics, no images, `hideIcons: true` — text-only parsing is optimal |
| Standard job titles | ✅ Strong | "Infrastructure Programme Manager", "Technical Programme Manager", "Programme Manager" — all consistent grade levels |

**Issues identified:**
- **Skills section uses comma-separated keywords** under each skill group (e.g., `"multi-workstream delivery", "milestones, owners, dependencies"`). Some ATS parse these literally and may treat the entire comma-separated string as one keyword. Consider breaking each keyword into a separate bullet or pipe-delimited list.
- **No methodology keywords** (Agile, Waterfall, PRINCE2 methodology, Scrum). While PRINCE2 Practitioner is listed in certifications, it's never mentioned in experience descriptions. Many Senior PM roles explicitly require methodology experience.
- **Education hidden** means education-related keywords (degree level, subject, institution) are missing from keyword corpus — minor but could matter for filtering.
- **"Expert" proficiency level** used 7/10 times. Some ATS systems treat proficiency labels inconsistently — "Expert" is good, but mixing "Expert"/"Lead"/"Advanced" may create parsing noise.

### 3. Format Compatibility — 90/100 (Weight: 25%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| File format compatibility | ✅ Strong | Designed for PDF export from Reactive Resume — safe for all ATS |
| Font & styling consistency | ✅ Strong | Single consistent font (IBM Plex Serif), clean colour scheme, no styling inconsistencies |
| Avoidance of columns/tables | ✅ Excellent | `fullWidth: true`, single column, no tables, no complex layouts throughout |
| Proper text encoding | ✅ Strong | Standard HTML content, no special characters or encoding issues |

**Issues identified:**
- **Nested role complexity**: The Hiloka → Collective IP / Hiloka Advisory nested structure uses Reactive Resume's `roles[]` array. When rendered to PDF, this typically creates a sub-bullet hierarchy. Some ATS parsers treat all text as flat and may merge parent/child content or miss the role boundaries.
- **Custom sections** ("Earlier Career", "Engagement Model", "Key Programme Delivery Achievements") use three different HTML structures (one `<ul>` list, one `<p>`, one nested `<ul>`). Section-aware ATS parsers looking for standard headings may skip these entirely, losing ~15% of the CV content.
- **Font size 9pt** is at the lower boundary. Fine for ATS text extraction, but if OCR is involved (scanned PDFs), 10pt+ is safer.
- **`free-form` page format** may cause inconsistent rendering across different PDF engines.

### 4. Content Relevance — 92/100 (Weight: 20%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Quantifiable achievements | ✅ Excellent | 42,000-user M365 migration, 6,100+ circuit migrations, 7,000+ endpoints, 25,000 Wi-Fi endpoints, 200+ NATO airbases, £12M re-tender, 60% cost reduction |
| Action verb usage | ✅ Strong | Managed, Led, Coordinated, Established, Delivered, Conducted, Produced — consistent strong action verbs |
| Clear career progression | ✅ Strong | Clear arc from Virgin Media (1998) through Lambeth Council, Rainmaker, Sitehands, CentricsIT to current roles |
| Relevant experience highlighting | ✅ Excellent | Every role directly relevant to multi-workstream infrastructure programme management in regulated environments |

**Issues identified:**
- **Overlapping concurrent roles**: Hiloka Ltd (Jan 2010–Present), Collective IP (Jun 2025–Present), Atos (Sept 2025–Present) — three concurrent roles is a complex timeline. The Hiloka umbrella structure helps (Managing Director + client engagements), but some ATS will flatten these into separate simultaneous full-time positions.
- **Certification validity concern**: Multiple certifications are described as "Knowledge current (active certification expired)". ATS that filter on certification validity dates or recognise certification bodies may not count these as current qualifications.
- **No education data visible** — while acceptable for 25+ year careers, some ATS and recruitment workflows auto-filter candidates missing education fields.
- **Engagement Model rate info** (£600-£800/day) visible on CV — unusual for a CV, may be filtered by salary/rate-aware ATS modules or viewed negatively by recruiters.

---

## Comparison Table: Baseline vs Archetype A vs Archetype B

| Dimension | Weight | Baseline (Current) | Archetype A (Director) | Archetype B (Senior PM) | B vs A Δ |
|-----------|:------:|:------------------:|:----------------------:|:------------------------:|:--------:|
| Structure Compliance | 30% | 80 | 88 | **82** | **-6** ▼ |
| Keyword Optimization | 25% | 85 | 90 | **92** | **+2** ▲ |
| Format Compatibility | 25% | 88 | 92 | **90** | **-2** ▼ |
| Content Relevance | 20% | 87 | 85 | **92** | **+7** ▲ |
| **Overall Score** | **100%** | **85** | **89** | **89** | **0** — |

### Key Improvements over Archetype A

| Area | Archetype A (Director) | Archetype B (Senior PM) | Advantage |
|------|------------------------|------------------------|-----------|
| **Company names** | 1 anonymised ("Major International Gaming & HFT Group") | All real company names | **B** — verifiability |
| **Skill keyword density** | 11 skill groups | 10 skill groups with richer sub-keywords | **B** — slightly deeper |
| **Content credibility** | Gaming role anonymised, title regression concern | All titles consistent (PM/Programme Manager grade) | **B** — clearer narrative |
| **Engagement model** | Rate (£800-£1,200/day) in CV body | Rate (£600-£800/day) also present | **Tie** — both have this issue |
| **Concurrent roles** | 3 overlapping roles (Collective IP, Atos, Hiloka) | Same 3 roles but Hiloka shown as umbrella parent | **B** — slightly clearer structure |

### Regressions vs Archetype A

| Area | Archetype A (Director) | Archetype B (Senior PM) | Impact |
|------|------------------------|------------------------|:------:|
| **Structure compliance** | 88 | 82 | **-6** — nested roles and custom sections impact parsing |
| **Format compatibility** | 92 | 90 | **-2** — role nesting adds complexity |
| **Seniority positioning** | Director-grade headline & titles | Senior PM-grade headline & titles | Intentional — B is for a different target role |
| **Non-standard sections** | 3 custom sections | 3 custom sections | Tie — both need cleanup |

---

## Top 3 Strengths

1. **Deeply quantified achievement narrative**: Every role includes hard numbers — 42,000-user migration, 6,100 circuit migrations, 7,000 endpoint deployments, 25,000 Wi-Fi rollouts, 200+ NATO sites, £12M re-tender, 60% cost saving. This is gold for both ATS keyword matching and human reviewers. The quantifiers are specific, verifiable, and directly relevant to programme management scale indicators.

2. **Excellent sector keyword saturation**: The CV covers every target sector explicitly — NHS, UK Central Government, NATO/Defence, Tier 1 Financial Services — with role descriptions that embed sector-specific terminology (GDS methodology, clinical service continuity, JML at scale, CDM 2015, ServiceNow governance). This ensures high match rates for senior PM roles across government, healthcare, and finance.

3. **Clean ATS-safe visual layout**: Single column, no images, no tables, no graphics, consistent heading hierarchy, text-based skill tags, `hideIcons: true` — this CV will parse cleanly in text-extraction mode across virtually every ATS. The serif font is universally readable.

---

## Top 3 Remaining Issues

1. **Non-standard section headings (HIGH PRIORITY)**: "Key Programme Delivery Achievements", "Earlier Career", and "Engagement Model" are not recognised by ATS section parsers. Combined, these three sections contain ~15-20% of the CV's total content, and may be entirely skipped or misclassified. *Recommendation:* Rename "Key Programme Delivery Achievements" → "Key Achievements", fold "Earlier Career" content into a compressed "Earlier Career" subsection within Professional Experience or remove it, and either remove "Engagement Model" entirely or move key details (availability, clearance) into the professional summary.

2. **Nested role architecture (HIGH PRIORITY)**: The Hiloka Ltd entry with two nested roles (Collective IP, Hiloka Advisory) uses Reactive Resume's `roles[]` array. When rendered, this creates a parent-child visual hierarchy. Some ATS parsers will:
   - Flatten the roles into a single continuous text block, losing the role boundaries
   - Merge the nested role description with the parent company description
   - Miss the distinct date ranges for each nested role
   *Recommendation:* Consider whether the nested roles should be standalone entries (separating Hiloka Ltd, Collective IP, Hiloka Advisory into three distinct Experience items) to ensure each is parsed independently.

3. **Certification validity ambiguity (MEDIUM PRIORITY)**: Multiple certifications note "active certification expired" or "Knowledge current (active certification expired)". ATS systems that cross-reference certification databases or filter on validity dates may not recognise these as current qualifications. *Recommendation:* For certifications where the knowledge is genuinely current but the paper credential has lapsed, either rephrase as "Practitioner-level knowledge (certification exam completed, renewal pending)" or consider which certifications to omit entirely.

---

## Recommendations

### Quick Wins (30 minutes or less)
- [ ] **Rename "Key Programme Delivery Achievements"** → "Key Achievements" (improves ATS section recognition)
- [ ] **Unhide Education** and add a minimal entry (school, subject, qualification level, year) — satisfies ATS field requirements
- [ ] **Add "Agile" and "Waterfall"** methodology keywords to 1-2 experience descriptions (e.g., "Managed delivery across hybrid Agile-Waterfall governance frameworks")

### Moderate Effort (1-2 hours)
- [ ] **Restructure nested roles** — Convert the Hiloka Ltd entry from parent-with-nested-roles to standalone entries:
  - "Managing Director, Hiloka Ltd (Jan 2010–Present)" — separate entry with consultancy overview
  - "Technical Programme Manager, Collective IP (Jun 2025–Present)" — standalone entry
  - "Technology, Risk & Programme Assurance, Hiloka Advisory (Feb 2025–Sept 2025)" — standalone entry
  This ensures each role is parsed independently by ATS and eliminates hierarchy loss.
- [ ] **Remove or relocate Engagement Model** — Move availability/clearance info to summary, remove rate information entirely from CV (reserve for cover letters).
- [ ] **Reframe expired certifications** — Either remove certs with "active certification expired" notes, or rephrase to focus on current knowledge application rather than past certification dates.

### Strategic Consideration
- [ ] **Create a "clean" ATS-only variant** of this CV that:
  - Uses only standard section headings (Summary, Professional Experience, Education, Skills, Certifications)
  - Removes Engagement Model and Earlier Career sections
  - Standalone (non-nested) entries for each role
  - Includes a minimal education entry
  Use the full version for direct human review (email, LinkedIn).

---

## Appendix: Scoring Rubric Applied

| Dimension | Raw Score | Deductions |
|-----------|:---------:|------------|
| **Structure Compliance** | 82 | Hidden education (-5), custom section headings (-6), nested role complexity (-4), "Professional Profile" over "Summary" (-2), overlapping concurrent roles (-1) |
| **Keyword Optimization** | 92 | Comma-separated skill keywords may not parse fully (-3), missing methodology keywords (-3), hidden education removes keyword corpus (-2) |
| **Format Compatibility** | 90 | Nested hierarchy may flatten (-5), custom sections unrecognised (-3), `free-form` page format (-2) |
| **Content Relevance** | 92 | Overlapping concurrent roles (-3), certification validity ambiguity (-3), rate info in CV body (-2) |
| **Overall** | **89** | Weighted: 82×0.30 + 92×0.25 + 90×0.25 + 92×0.20 = 24.6 + 23.0 + 22.5 + 18.4 = **88.5 ≈ 89** |
