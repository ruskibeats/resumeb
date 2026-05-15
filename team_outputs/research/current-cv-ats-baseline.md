# ATS Compatibility Analysis: Russell Batchelor CV (Baseline)

**Analyzed:** 2026-05-04  
**Source:** `/tmp/current_cv.json` (Reactive Resume v5 export — "onyx" template, full-width layout)  
**Target role context:** IT Operations Manager / Onboarding Manager (British Council / JobServe, £500–600/day)  
**Rendered dimensions:** Single column, serif font (IBM Plex Serif 9pt), no graphics, no tables, HTML body content in description fields.

---

## Overall ATS Score: **85/100**

This CV is **strongly ATS-compatible** with targeted improvements to unlock the remaining 15 points. The single-column layout, text-only content, dense quantified bullet points, and comprehensive keyword coverage all work in its favour. The main deductions come from non-standard section names, hidden education, and duplicated body text between roles.

---

## Dimension Scores & Detailed Analysis

### 1. Structure Compliance — **80/100** (Weight: 30%)

✅ **Strengths:**
- Clear hierarchical organisation: Summary → Key Achievements → Professional Experience → Skills → Certifications → Earlier Career
- Each role follows a consistent pattern: Company → Position → Location → Period → Description with bullet points
- Section heading font weights (600/600) clearly differentiate from body text (400/500)
- Certifications section well-structured with issuer and title
- Custom "Earlier Career" section properly separated from main experience — good

⚠️ **Issues:**
| Issue | Severity | Impact |
|-------|----------|--------|
| **Education section is hidden** (`hidden: true`) — no education content appears on the rendered CV | High | Many ATS and recruiters automatically filter for education history. Even if not degree-required, its absence can trigger automated rejection or human doubt |
| **Section label "Professional Profile"** used instead of standard "Professional Summary" or "Summary" | Medium | Most ATS expect "Summary" or "Professional Summary" as a section keyword |
| **"Key Onboarding & Operations Achievements"** mapped to `projects` section type — not a standard ATS heading | Medium | ATS parsers trained on standard schemas (JSON Resume, HR-XML) may not recognise "Key... Achievements" as a section and could dump its content into an unstructured bucket |
| **"Engagement Model" custom section** with rate/day and availability info | Low | Rate information in body text can sometimes cause ATS to classify the document as a "proposal" rather than a CV (rare but documented) |
| **Custom sections "Earlier Career" and "Engagement Model"** are `customSections` of type `summary` — they lack the structured fields (company, position, period) that ATS parsers rely on | Medium | Bullet point content in a summary block is less reliably extracted than structured role entries |
| **Some roles marked hidden:true** (Collective IP) — if this translates to hidden on the rendered PDF, then a gap in employment chronology appears (Jun 2025–Present with only Hiloka visible) | Medium | Gaps or missing concurrent roles can trigger parser uncertainty or mismatch signals |

---

### 2. Keyword Optimization — **85/100** (Weight: 25%)

✅ **Strengths:**
- **Exceptional job-specific keyword density** for the target role: "JML", "onboarding", "service desk", "ServiceNow", "ITIL", "access provisioning", "device deployment", "user readiness", "governance", "RAID", "SLA", "NHS", "UK Government", "SC cleared", "NPPV3"
- **Headline is keyword-rich** — "IT Operations & Onboarding Manager | JML at Scale | Service Delivery | NHS · Government · Finance | SC + NPPV3 Cleared" — this is exactly what ATS keyword matchers look for
- **Quantified metrics throughout**: 42K Home Office, 25K Anon endpoints, 5K NHS Windows 11, 3.5K payments, 7K+ endpoint deployments, 6,100+ circuit migrations, 24 engineers, 200+ NATO airbases, £10M+ programme, 60% WAN cost saving, £12M re-tender
- **Skills section is comprehensive** with 22 skill entries, many with sub-keywords — excellent for keyword matching
- **GDS, SC, NPPV3, NHS, Tier 1 finance** — all security/clearance/domain keywords present

⚠️ **Issues:**
| Issue | Severity | Impact |
|-------|----------|--------|
| **Duplicated body text between Hiloka and Collective IP roles** — Hiloka's description contains ~6 bullet points verbatim from the (hidden) Collective IP role | High | ATS de-duplication logic may penalise this as keyword stuffing or low-quality content. A human reader will also notice the repetition |
| **"Career Outcomes" section re-summarises the same quantified metrics** already present in the experience bullets | Medium | This reads as keyword repetition. Some ATS weight keyword density positively, but excessive repetition can trigger spam detection |
| **Skills section has 22 entries but many lack proficiency levels** (empty `proficiency` field) | Low | Some modern ATS can parse proficiency indicators to weight skill matches; missing levels leave all skills at equal weight |
| **Rate information (£550–650/day) in Engagement Model section** | Low | Rate numbers can confuse ATS keyword extractors that try to match salary bands against job descriptions |
| **"Knowledge current (active certification expired)"** on PRINCE2, CCNA, SASE — ATS keyword matching may still count these as "certified" but some advanced parsers check certification dates | Low | May still match keyword filters, but could be flagged in manual review |

---

### 3. Format Compatibility — **88/100** (Weight: 25%)

✅ **Strengths:**
- **Single-column layout** (sidebarWidth: 0, fullWidth page) — optimal for ATS parsing. Multi-column layouts frequently cause text re-ordering errors
- **No tables, no graphics, no charts** — `picture.url` is empty, `hideIcons: true`, no embedded images. Excellent
- **No columns in section layout** — all sections use `columns: 1`
- **Clean colour palette** — white background, black text, single primary colour (#0F4C81). No gradient/shadow text
- **Font choice** — IBM Plex Serif is a standard web font, well-supported in PDF generation
- **CSS disabled** — no custom CSS that could interfere with text extraction
- **`hideIcons: true`** — prevents icon fonts (which often render as invisible or garbled characters in ATS text extraction)

⚠️ **Issues:**
| Issue | Severity | Impact |
|-------|----------|--------|
| **Body content uses HTML formatting** (`<p>`, `<ul>`, `<li>`) — most ATS can handle basic HTML, but some strip or mangle it | Medium | The best practice ATS resume uses plain text or minimal markdown. HTML `&nbsp;`, `<br>`, and nested tags can cause extraction gaps |
| **Font size 9pt** is quite small | Low | Most modern ATS handle any font size, but OCR-based legacy ATS may struggle with very small text |
| **"IBM Plex Serif" is a serif font** — serif fonts are slightly more prone to OCR character confusion (rn→m, cl→d) than sans-serif at small sizes | Low | This is marginal with modern parsers, but sans-serif (Arial, Helvetica, Calibri) is the ATS-safe convention |
| **The "onyx" template** — need to verify its PDF output produces clean, selectable text (not outlined text or image-based rendering) | Medium | I cannot verify this without rendering the PDF. If the template renders text as paths or uses unusual encoding, ATS extraction degrades |

---

### 4. Content Relevance — **87/100** (Weight: 20%)

✅ **Strengths:**
- **Strong action verbs** open most bullet points: "Led", "Managed", "Coordinated", "Oversaw", "Directed", "Produced", "Governed", "Delivered"
- **Quantifiable achievements in ~70% of bullets** — numbers, percentages, scale, and outcomes are consistently present
- **Clear career progression narrative** — from Lead Enterprise Architect (Lambeth) → Associate Consultant (Rainmaker) → Infra Project Director (Sitehands) → EMEA Ops Director (CentricsIT) → Ops Director (Gaming/HFT) → Senior Ops Lead (Hiloka) → Infra Programme Manager (Atos). Shows increasing responsibility and scale
- **Excellent context alignment** — the CV is specifically tailored to the target role (IT Operations Manager/Onboarding), with JML, onboarding wave management, and service delivery as the central narrative
- **Clearance/security status prominently placed** in headline, basics customFields, and certifications — SC + NPPV3 is a key differentiator for public sector roles
- **Summary paragraph** does an excellent job of establishing the "hands-on, visible, fixes-problems" persona — this is high-signal content for hiring managers

⚠️ **Issues:**
| Issue | Severity | Impact |
|-------|----------|--------|
| **Education is entirely absent** (section hidden) | High | For some roles (particularly inside IR35 government contracts), a degree may be a hard filter. Without any education section, the ATS may flag this as incomplete |
| **Duplicated bullet content** between Hiloka and Collective IP roles (6 of 8 Hiloka bullets are copied from Collective IP) | High | Reduces perceived authenticity and can trigger ATS quality scoring penalties |
| **"Earlier Career" section uses summary type** instead of structured job entries — no dates, no company-position pairing for some entries (Whittington Insurance: ~1996, no precise dates) | Medium | ATS timeline analysers may not extract pre-2010 roles properly |
| **"Career Outcomes" section re-states the same quantified achievements** already in the experience section | Medium | This section adds no new information — it's a summary of what's already stated. ATS sees this as redundancy |
| **Proficiency levels in skills are inconsistent** — some say "Expert", some say "Advanced", many are empty | Low | For the target role, the core skills (IT Operations & Service Delivery, Onboarding & JML at Scale) are correctly marked Expert |
| **Engagement Model mentions target rate (£550–650/day)** | Low | May prematurely anchor salary expectations before interview; some ATS keyword systems try to match this against job bandings |

---

## Summary of Issues by Severity

| Severity | Issues |
|----------|--------|
| **🔴 High (must fix)** | 1. Education section is hidden — add at minimum an entry or explain alternative qualifications<br>2. Duplicated bullet content across Hiloka and Collective IP roles — deduplicate<br>3. "Career Outcomes" section duplicates experience bullets — remove or restructure |
| **🟡 Medium (should fix)** | 4. Section label "Professional Profile" → rename to "Professional Summary"<br>5. "Key Onboarding & Operations Achievements" → consider renaming to standard section type or integrating into summary<br>6. "Engagement Model" custom section with rate info → move rate info out of CV body (discuss at interview)<br>7. Hidden Collective IP role creates a chronological gap → reconsider visibility<br>8. Some proficiency levels missing in skills → fill consistently |
| **🟢 Low (nice to fix)** | 9. Font → consider switching to sans-serif (IBM Plex Sans, Inter, or Calibri)<br>10. Font size → consider 10–10.5pt for better OCR resilience<br>11. "Knowledge current (active certification expired)" wording → reframe positively or remove date qualifier |

---

## Recommendations (Actionable)

### Must-Do (before sending to any ATS-gated application)

1. **Unhide the Education section** — Even one line ("Relevant professional qualifications held in lieu of formal degree — details available on request") prevents the ATS from flagging it as missing. Better yet, add your actual education history.

2. **Deduplicate Hiloka and Collective IP role content** — The Hiloka role currently reuses ~6 bullet points from the Collective IP role. Since Collective IP is hidden, rework the Hiloka bullets to be unique to the Hiloka engagement (PE-backed portfolio advisory, operational assessments, vendor performance reviews, remediation planning). The JML and RAID bullets should appear only once.

3. **Remove or collapse the "Career Outcomes" section** — Its content is entirely duplicated from the experience bullets. If you need a quick-reference achievements summary, move 2–3 standout metrics into the Professional Profile summary paragraph instead.

### Should-Do (to increase ATS score from 85→90+)

4. **Rename "Professional Profile" to "Professional Summary"** — This matches the standard heading most ATS are trained to recognise.

5. **Move rate information out of the CV body** — "Target rate £550–650/day" in the Engagement Model section can cause keyword confusion and premature salary anchoring. Discuss at initial contact, not on the CV.

6. **Unhide the Collective IP role OR merge it into Hiloka** — A Jun 2025–Present gap (if Collective IP is hidden) may cause parser confusion. Either show both concurrent roles clearly or merge the relevant bullets into Hiloka with a note about concurrent engagements.

7. **Standardise proficiency levels** — Fill all missing proficiency fields across the 22 skills entries. Consistency helps ATS weighting algorithms.

### Nice-to-Do (polish)

8. **Consider IBM Plex Sans (sans-serif) instead of IBM Plex Serif** — Sans-serif at 9–10pt is marginally more ATS-OCR-safe. Not critical with modern parsers, but best practice.

9. **Reframe expired certifications positively** — "PRINCE2 (practitioner-level knowledge, actively applied)" instead of "Knowledge current (active certification expired)". The latter signals obsolescence; the former signals competence.

10. **Increase body font from 9pt to 10pt** — Improves readability and OCR accuracy with negligible space impact (summary and experience sections can be tightened).

---

## ATS Compatibility Checklist Scorecard

| Criterion | Pass? | Notes |
|-----------|-------|-------|
| Single-column layout | ✅ | Full-width, no sidebar |
| No tables | ✅ | — |
| No images/graphics | ✅ | Picture URL empty, icons hidden |
| No columns in sections | ✅ | All sections: `columns: 1` |
| Standard section headings | ⚠️ | "Professional Profile" instead of "Summary" |
| Education section present | ❌ | Hidden entirely |
| Standard font (sans-serif preferred) | ⚠️ | IBM Plex Serif (serif) |
| Font size ≥ 10pt | ❌ | 9pt body text |
| Consistent bullet point format | ✅ | HTML `<ul><li>` used throughout |
| Quantified achievements | ✅ | Strong throughout |
| Action verbs | ✅ | Excellent variety |
| Clear career progression | ✅ | Visible upward trajectory |
| Keywords match target role | ✅ | Excellent density for IT Ops/Onboarding |
| No duplicated content | ❌ | Hiloka/Collective IP duplication, Career Outcomes redundancy |
| No salary/rate info | ❌ | £550–650/day in Engagement Model |
| Contact info in header | ✅ | Name, email, phone, location, LinkedIn |
| SC/NPPV3 clearance visible | ✅ | Multiple locations |
| PDF output (not Word/DOCX) | ✅ | Reactive Resume generates PDF |
| Clean HTML (minimal markup) | ⚠️ | Full HTML in descriptions — most ATS handle it, not ideal |

---

*Generated by ATS Compatibility Analyzer subagent on 2026-05-04. This baseline can be used as a reference point to measure improvement from subsequent edits.*
