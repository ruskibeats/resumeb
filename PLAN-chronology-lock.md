# PLAN: Lock Chronology Using Master Career Data

**Context:** The Reactive Resume tailoring and analysis pipelines sometimes rewrite or accept incorrect employment date ranges, causing ATS chronology penalties and recruiter red flags. We have a canonical CV (`Russell_Batchelor_CV.pdf`) with verified dates. The pipeline must treat this as the single source of truth for role dates and enforce it in both Analyse and Tailor flows.

---

## Goals

1. Create a **Master Career Timeline** config containing canonical roles and date ranges.
2. Wire this into the **AI prompts** so models never invent or alter those dates.
3. Extend the **analysis output** so date conflicts are detected and surfaced structurally.
4. Verify that tailoring and analysis both respect the locked chronology.

---

## Files to Create / Modify

- **New:** `src/config/career-timeline.ts` — canonical roles + dates
- **Modify:**
  - `src/integrations/ai/prompts/analyze-resume-system.md` — add chronology rules + `{{MASTER_CAREER_TIMELINE}}` placeholder
  - `src/integrations/ai/prompts/tailor-system.md` — enforce timeline in 6-step protocol (Step 3 & Step 6)
  - `src/integrations/orpc/services/ai.ts` — inject timeline into both analyse and tailor prompt builders
  - `src/schema/resume/analysis.ts` (or equivalent) — add `chronology` section with `dateConflicts` array

---

## Reuse

- `buildTailorSystemPrompt()` in `src/integrations/orpc/services/ai.ts` (line ~956) — already accepts `laneConfig`, now also needs timeline
- `buildAnalyzeResumeSystemPrompt()` in same file — analysis prompt builder
- `resumeAnalysisSchema` in `@/schema/resume/analysis` — extend with chronology
- Existing `{{MASTER_CAREER_DATA}}` import pattern in prompts
- `master-career-data.md?raw` already in use

---

## Steps

### Phase 1 — Master Career Timeline Config

- [x] Create `src/config/career-timeline.ts`:
  - Export `interface TimelineRole { id, employer, roleTitle, location?, start: "YYYY-MM", end: "YYYY-MM" | "present" }`
  - Define `careerTimeline: TimelineRole[]` with canonical roles per the CV:
    - STK Limited: Ops Team Lead, Live Estate Modernisation — Sep 2025 – present
    - Hiloka Limited: Technology, Risk & Programme Assurance — Feb 2025 – present
    - Major International Gaming Group: Operations Director — Jan 2024 – Feb 2025
    - CentricsIT (Park Place): EMEA Operations & Infrastructure Director — Nov 2019 – Dec 2023
    - Sitehands LLC: Infrastructure Project Director, Europe — Nov 2018 – Nov 2019
    - Rainmaker Solutions: Associate Technology Consultant — Nov 2015 – Nov 2018
    - London Borough of Lambeth: Lead Enterprise Architect — Feb 2010 – Apr 2015
  - Export `getCareerTimelineByEmployer(employer: string)` helper
  - Export `getTimelineVersion()` returning "cv-2026-05"

### Phase 2 — Prompt Updates

- [x] Edit `analyze-resume-system.md`:
  - Add "Chronology Rules (Must Follow)" section instructing the model to:
    - Treat `MASTER_CAREER_TIMELINE` as authoritative
    - Never invent, extend, or shorten date ranges
    - Flag any difference between resume dates and timeline as **High** impact chronology error in `chronology.dateConflicts`
    - Provide corrected date range from `MASTER_CAREER_TIMELINE`
  - Add `{{MASTER_CAREER_TIMELINE}}` placeholder for JSON-serialised timeline
  - Add explicit Chronology Output Structure with field definitions (employer, roleTitle, resumeRange, masterRange, severity)
  - Update JSON output example to include chronology section
  - Add chronology field rule to "Field Rules" section

- [x] Edit `tailor-system.md` (within existing 6-step protocol):
  - In Step 3 (Section Mapping & Grouping): "Chronology lock: Use {{MASTER_CAREER_TIMELINE}} as the single source of truth for all role dates"
  - In Step 6 (Constraint Enforcement): "Does NOT alter, smooth, or fabricate employment dates for roles present in {{MASTER_CAREER_TIMELINE}}"
  - Ensure Hiloka grouping strategy still applies alongside date locking

### Phase 3 — Inject Timeline into AI Service

- [x] Modify `src/integrations/orpc/services/ai.ts`:
  - Import `{ careerTimeline }` from `@/config/career-timeline`
  - Extend `buildAnalyzeResumeSystemPrompt()` to inject `{{MASTER_CAREER_TIMELINE}}` with `JSON.stringify(careerTimeline, null, 2)`
  - Extend `buildTailorSystemPrompt()` to inject `{{MASTER_CAREER_TIMELINE}}` with `JSON.stringify(careerTimeline, null, 2)`

### Phase 4 — Structured Chronology Output

- [x] Update `resumeAnalysisSchema` in `@/schema/resume/analysis.ts`:
  - Add `dateConflictSchema` with fields: employer, roleTitle?, resumeRange, masterRange, severity
  - Add `chronologySectionSchema` with: score, rationale, dateConflicts[]
  - Add `chronology: chronologySectionSchema.optional()` to `resumeAnalysisSchema`
  - Add `chronology: chronologySectionSchema.optional()` to `resumeAnalysisOutputSchema`
  - Update `analyze-resume-system.md` to instruct the model to populate `dateConflicts` array

### Phase 5 — Verification

- [x] Run `analyzeResume` on current Archetype A resume:
  - `chronology.dateConflicts` includes 3 entries: Hiloka, CentricsIT, Lambeth ✅
  - Corrected ranges provided from MASTER_CAREER_TIMELINE ✅
  - Severity set to "high" for all core timeline roles ✅
- [x] Run `tailorResume` with `laneId: "A"`:
  - Tailor output passes all guardrails ✅
  - Dates handled by template, not baked into description (correct behaviour) ✅
- [x] Confirm `tailorOutputSchema` still validates — no schema changes needed ✅

---

## Deferred (All Completed)

- [x] Extend `careerTimeline` with earlier-career roles — verified against master-career-data.md, no pre-2010 roles missing
- [x] Add `getTimelineVersion()` returning "cv-2026-05" — exported from `career-timeline.ts`
- [x] Log `timelineVersion` at debug level with every analyse and tailor call (no PII)
- [x] Expose `POST /api/openapi/ai/career-timeline` returning `{ timelineVersion, roles[] }` — tested and returning 200
