# ATS Compatibility Analysis: Archetype A (Infrastructure Programme Director) CV

**Date:** 2026-05-04
**Analyst:** ATS Compatibility Subagent
**Target Role:** Infrastructure Programme Director — Multi-Site Transformation & Separation-Ready Delivery

---

## Overall Score: 89/100

The Archetype A CV scores **89/100** against the standard ATS compatibility rubric — a **+4 point improvement** over the current live baseline (85/100). This is a strong "green-zone" score indicating the CV will parse well in virtually all major ATS platforms (Workday, Taleo, Lever, Greenhouse, SuccessFactors, etc.).

---

## Dimension-by-Dimension Scoring

### 1. Structure Compliance — 88/100 (Weight: 30%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Section headings clear & standardised | ⚠️ Good | Most sections use standard names; "Key Career Outcomes", "Earlier Career", "Engagement Model" are non-standard |
| Logical flow & organisation | ✅ Strong | Summary → Highlights → Experience → Skills → Certifications → Earlier Career → Engagement Model |
| Standard section names used | ⚠️ Moderate | "Professional Experience" ✓, "Skills & Proficiencies" ⚠️ (plural non-standard), "Career Highlights" mapped to projects section type |
| Consistent bullet point usage | ✅ Strong | All experience entries use consistent bullet points throughout |

**Issues identified:**
- **"Key Career Outcomes"** is a non-standard heading (maps to `projects` section type in the JSON). Many ATS parsers expect either no heading here or a standard heading like "Key Achievements" or "Notable Projects". Consider renaming to "Key Achievements" or folding highlights into the summary.
- **"Earlier Career"** as a section heading is not widely recognised by ATS. The content is a single bullet list of 5 earlier roles — this may be parsed incorrectly or skipped entirely.
- **"Engagement Model"** is a completely non-standard section containing rate expectations (£800-£1,200/day) and engagement type. While useful for human readers, this may confuse ATS parsers and should be considered for removal in ATS-optimised versions.
- **Education section is hidden** (`hidden: true`). Many ATS systems and recruiters expect an education section, even if minimal. A one-liner showing school/qualification level would improve completeness.
- **Concurrent role overlap**: Three roles (Collective IP, Atos, Hiloka) show overlapping date ranges. Some ATS may flag this as a data integrity issue.

### 2. Keyword Optimization — 90/100 (Weight: 25%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Job-specific keyword density | ✅ Strong | "Infrastructure Programme Director" appears in headline, summary, multiple role titles, skills — excellent density |
| Skill keyword relevance | ✅ Strong | SD-WAN, SASE, MPLS, LAN/WAN, data centre, EUC, M365, cloud, RAID, SteerCo, KPI, SLA — all highly relevant |
| Avoidance of graphics/images | ✅ Strong | No graphics, no images, `hideIcons: true` — text-only parsing is optimal |
| Standard job titles | ⚠️ Good | Mostly standard; "Infrastructure Programme Manager" (Atos role) is one grade below target — could confuse role-level matching |

**Issues identified:**
- **No Agile/Scrum/Waterfall methodology keywords**. The CV mentions PRINCE2 Practitioner in certifications but never uses the keyword in experience descriptions. Many programme director roles explicitly require Agile/Waterfall hybrid delivery knowledge.
- **Missing "PMP" or "PgMP"** — while PRINCE2 is UK-standard, PMP/PgMP have higher international recognition in ATS keyword matching.
- **Anonymised company name** ("Major International Gaming & HFT Group") will not match any corporate reference database used by ATS enrichment tools. Consider a generic sector descriptor if confidentiality is essential.
- **"Transformation"** appears only in context, never as a standalone skill or keyword tag. For an Infrastructure Programme Director, this should be a primary keyword.
- **Skills section uses `level: 0`** for all proficiency levels — some ATS may interpret this as "no proficiency" rather than "not using a numeric scale". Consider setting to a non-zero value or relying on the text label.

### 3. Format Compatibility — 92/100 (Weight: 25%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| File format compatibility | ✅ Strong | Designed for PDF export from Reactive Resume — safe for all ATS |
| Font & styling consistency | ✅ Strong | Single consistent font (IBM Plex Serif), clean colour scheme, no styling inconsistencies |
| Avoidance of columns/tables | ✅ Excellent | `fullWidth: true`, single column, no tables, no complex layouts throughout |
| Proper text encoding | ✅ Strong | Standard HTML content, no special characters or encoding issues |

**Issues identified:**
- **Sidebar width setting**: Metadata shows `sidebarWidth: 31.17` even though `pages[].sidebar` is empty. In some PDF rendering engines, this could produce a blank left column. If rendering to PDF, verify the output has no empty space.
- **Font size 9pt** body text is at the lower boundary of ATS legibility. While most parsers handle this, 10pt+ is safer.
- **Custom sections** ("Earlier Career", "Engagement Model") may not be recognised by section-aware ATS parsers that look for a fixed set of expected section headings.

### 4. Content Relevance — 85/100 (Weight: 20%)

| Criterion | Rating | Comments |
|-----------|--------|----------|
| Quantifiable achievements | ✅ Excellent | 6,100+ circuit migrations, 7,000+ endpoints, 200+ NATO airbases, £12M re-tender, 42,000-user migration, 60% cost reduction |
| Action verb usage | ✅ Strong | Led, Managed, Direct, Delivered, Oversaw, Established, Designed, Governed — consistent strong verbs |
| Clear career progression | ⚠️ Moderate | Overall arc is clear (1996 → present) but recent timeline shows three concurrent roles with overlapping dates |
| Relevant experience highlighting | ✅ Strong | Every role directly relevant to multi-site infrastructure transformation in regulated environments |

**Issues identified:**
- **Three concurrent current roles** (Collective IP Jun 2025–Present, Atos Sept 2025–Present, Hiloka Feb 2025–Present) is the single biggest concern. Some ATS will flag this as a contradiction or data error. Human recruiters may perceive it as overcommitment or lack of focus.
- **Title regression concern**: "Operations & Infrastructure Director, EMEA" (CentricsIT, 2020-2024) → "Infrastructure Programme Manager" (Atos, 2025-present) reads as a step down in seniority, even though the Collective IP title ("Technical Programme Director") restores the director level. This may confuse both ATS and human reviewers.
- **Anonymised gaming role** has reduced credibility — no company name, no verifiable reference. If this role was significant (£3M programme, 24-engineer team, board-level KPIs), the missing company name weakens the impact.
- **No education section visible** — for a 25+ year career this may be acceptable, but some ATS and recruitment processes automatically filter candidates who lack education data.
- **Engagement Model section** includes rate information (£800-£1,200/day). This is highly unusual on a CV and may be viewed negatively by recruiters (appears transactional) or filtered by ATS (salary/rate data is sometimes stripped or flagged).

---

## Comparison Table: Baseline vs Archetype A

| Dimension | Weight | Baseline (Current CV) | Archetype A | Change |
|-----------|--------|---------------------:|------------:|:------:|
| Structure Compliance | 30% | 80 | **88** | **+8** ▲ |
| Keyword Optimization | 25% | 85 | **90** | **+5** ▲ |
| Format Compatibility | 25% | 88 | **92** | **+4** ▲ |
| Content Relevance | 20% | 87 | **85** | **-2** ▼ |
| **Overall Score** | **100%** | **85** | **89** | **+4** ▲ |

### Key Improvements in Archetype A
1. **+8 Structure Compliance**: Far better section organisation, consistent bullet points, clear job title hierarchy with quantified descriptors
2. **+5 Keyword Optimization**: Target keywords ("Infrastructure Programme Director", "SC cleared", "multi-site", "regulated environment") strategically placed in headline, summary, and all role descriptions
3. **+4 Format Compatibility**: Single-column full-width layout is ideal for ATS parsing; no tables, no graphics, minimal styling complexity

### Regressions in Archetype A
1. **-2 Content Relevance**: Three overlapping concurrent roles create timeline confusion; anonymised gaming role reduces credibility; missing education section; rate information in Engagement Model is unusual

---

## Top 3 Strengths

1. **Quantified scale and impact**: Every major role includes hard numbers (sites, circuits, endpoints, budget values, team sizes). This is exactly what ATS keyword matching and human reviewers both reward. The "6,100+ circuit migrations" and "200+ NATO airbases" metrics are particularly powerful.

2. **Strategic keyword architecture**: The headline alone packs 7+ primary keywords ("Infrastructure Programme Director", "Multi-Site Transformation", "Separation-Ready Delivery", "Regulated", "UK/EMEA Estates", "SC", "NPPV3 Cleared"). The summary and first two role descriptions continue this pattern without keyword stuffing.

3. **ATS-friendly layout**: Single column, no images, no tables, consistent heading hierarchy, text-only skill tags — this CV will parse cleanly in virtually every ATS on the market.

---

## Top 3 Remaining Issues

1. **Concurrent role overlap (HIGH PRIORITY)**: Three roles with overlapping date ranges spanning Feb 2025–Present will confuse timeline-based ATS parsing and may raise red flags with human reviewers. *Recommendation:* Consider whether the Hiloka Ltd consultancy role could be presented as an umbrella engagement (e.g., "Managing Director, Hiloka Limited — delivering contract Programme Director engagements including...") with the Collective IP and Atos roles listed as client engagements beneath it.

2. **Non-standard section headings (MEDIUM PRIORITY)**: "Key Career Outcomes", "Earlier Career", "Engagement Model" are not standard section names recognised by ATS. *Recommendation:* Rename "Key Career Outcomes" → "Key Achievements", fold "Earlier Career" into a compressed career timeline within Professional Experience or remove it, and either remove "Engagement Model" entirely or move key details (availability, clearance) into the summary.

3. **Missing education data (LOW PRIORITY)**: The education section is hidden. *Recommendation:* Add a minimal education entry showing highest qualification achieved — this satisfies both ATS field requirements and recruiter expectations.

---

## Recommendations (Score is above 75 — no mandatory improvements, but these are advised)

### Quick Wins (30 minutes or less)
- [ ] **Rename section headings**: "Key Career Outcomes" → "Key Achievements"; "Skills & Proficiencies" → "Skills"; "Earlier Career" → integrate into experience or remove
- [ ] **Unhide education** and add a single minimal entry (e.g., school/qualification, subject, year)
- [ ] **Add "transformation"** as an explicit keyword in the skills section

### Moderate Effort (1-2 hours)
- [ ] **Restructure concurrent roles** so Hiloka Ltd appears as the parent consultancy with Collective IP and Atos as client engagements beneath it, resolving the timeline overlap
- [ ] **Remove or relocate Engagement Model** section — consider putting availability and clearance into the summary, and omitting rate information from the CV entirely (reserve for cover letters/initial calls)
- [ ] **Add Agile/Waterfall methodology** keywords to one or two role descriptions (e.g., "Managed delivery across hybrid Agile-Waterfall governance frameworks")

### Strategic Consideration
- [ ] **Create a "clean" ATS-only variant** of this CV that strips custom sections (Earlier Career, Engagement Model, Career Highlights) and keeps only standard sections: Summary, Experience, Skills, Certifications, Education. Use the full version for human review.

---

## Appendix: Scoring Rubric Applied

| Dimension | Raw Score | Rationale |
|-----------|:---------:|-----------|
| **Structure Compliance** | 88 | Deductions for non-standard section headings (-5), hidden education (-3), concurrent role overlap (-4) |
| **Keyword Optimization** | 90 | Deductions for missing methodology keywords (-4), anonymised company (-3), missing "transformation" as standalone keyword (-3) |
| **Format Compatibility** | 92 | Deductions for custom sections that may not parse (-5), sidebarWidth concern (-3) |
| **Content Relevance** | 85 | Deductions for concurrent role confusion (-7), title regression concern (-3), missing education (-3), rate info in CV (-2) |
| **Overall** | **89** | Weighted: 88×0.30 + 90×0.25 + 92×0.25 + 85×0.20 = 26.4 + 22.5 + 23.0 + 17.0 = **88.9 ≈ 89** |
