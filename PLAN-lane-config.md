# PLAN: Upgrade Tailor Pipeline — LaneConfig + Transfer Pack Protocol

**Context:** The Reactive Resume AI tailoring pipeline currently uses a generic `tailor-system.md` prompt with `TARGET_LANE_PARAMETERS` inlined from the user's request. This produces inconsistent outputs — tone drifts, proof strip metrics are under-injected, and Do-Not-Claim guardrails are honoured mostly by luck. We are replacing this with a strictly structured `LaneConfig` object and a 6-step Transfer Pack protocol that makes the AI behave as a tightly controlled Executive Search Consultant.

---

## Goals

1. **Create a typed `LaneConfig` module** in the Reactive Resume backend.
2. **Populate Lane A** fully (archetype, proof strip, guardrails, grouping strategy) as Phase 1; B/C are stubs.
3. **Rewrite the AI system prompt** to follow the rigid 6-step protocol.
4. **Wire it into `ai.ts` + `ai.ts` router** so the server resolves `lane_id` → LaneConfig.
5. **Verify** Lane A output: tone, proof strip placement, guardrail compliance.

---

## Approach

- Keep `LaneConfig` in the Reactive Resume backend (not the Python feed server). The config shapes prompt construction, which is a backend concern.
- Phase 1: Implement Lane A only. Prove end-to-end, then add B/C.
- The archetype-tailor agent will be deferred to Phase 2; this plan focuses on the server-side AI path.

---

## Files to Create / Modify

### New files
- `src/config/lane-config.ts` — `LaneConfig` interface, Lane A definition, getter

### Core modifications
- `src/integrations/orpc/services/ai.ts` — `buildTailorSystemPrompt()` to accept and render `LaneConfig`; `tailorResume()` to resolve LaneConfig from `lane_id`
- `src/integrations/orpc/router/ai.ts` — `tailorResume` route to accept `lane_id?: "A" | "B" | "C"` in input
- `src/integrations/ai/prompts/tailor-system.md` — replace generic prompt with 6-step protocol

### Fallback modifications (if lane_id omitted — backward compat)
- `tailorResume` defaults to `lane_id = "A"` for Infrastructure Programme Director job titles

---

## Reuse

- `buildTailorSystemPrompt(resumeData, job, donorResumeData)` in `src/integrations/orpc/services/ai.ts` (line ~956)
- `tailorResume(input)` in same file (line ~1298)
- `master-career-data.md?raw` already imported and injected into prompts
- `tailorOutputSchema` from `@/schema/tailor` — no change to output shape
- Existing retry, logging, and circuit-breaker utilities — no change

---

## Steps

### Phase 1: LaneConfig Schema & Lane A Definition

- [x] Create `/opt/reactive-resume/src/config/lane-config.ts`:
  - Export `type LaneId = "A" | "B" | "C"`
  - Export `interface LaneConfig` with fields: `laneId`, `laneName`, `psychologicalArchetype`, `proofStripMetrics` (string[]), `doNotClaimGuardrails` (`{hardBans: string[], qualifiers: string[]}`), `groupingStrategy`, `protocolVersion`
  - Define `const laneA: LaneConfig` fully per the Transfer Pack:
    - Archetype: `"Steady Accountable"`
    - Proof strip: `6,100+ network circuits migrated`, `7,000+ endpoints delivered`, `42,000+ users onboarded`, `60% WAN cost reduction`, `SC & NPPV3 cleared`
    - Hard bans: no NATO budget figures, no PE logos, no FTTH/separation sole ownership, no clinical labels
    - Grouping strategy: Hiloka Limited parent + competency buckets
    - Protocol version: `"lane-transfer-pack-v2"`
  - Define `laneB` + `laneC` **fully** (not stubs — complete archetype, proof strip, guardrails, grouping)
  - Export `getLaneConfig(laneId: LaneId): LaneConfig`
  - Export `allLaneConfigs: Record<LaneId, LaneConfig>`
  - Export `inferLaneFromJob(jobTitle: string): LaneId | null` inference helper

### Phase 2: Rewrite System Prompt (6-Step Protocol)

- [x] Edit `/opt/reactive-resume/src/integrations/ai/prompts/tailor-system.md`:
  - Remove generic "Elite Executive CV Writer" framing
  - Replace with: "You are a tightly controlled Executive Search Consultant operating under strict Transfer Pack protocol."
  - Inject the 6-step protocol into the prompt
  - Keep `{{MASTER_CAREER_DATA}}`, `{{RESUME_DATA}}`, `{{DONOR_CV_DATA}}`, `{{JOB_DESCRIPTION}}` placeholders.
  - Add `{{LANE_CONFIG}}` placeholder for JSON-serialized LaneConfig.
    > **Important:** `{{LANE_CONFIG}}` is injected into the system prompt purely as instructions for model behaviour. The model must not echo any lane metadata (laneId, protocolVersion, guardrails, etc.) back in the resume JSON output.
  - Keep identical output JSON schema (no regression to output shape).

### Phase 3: Wire Into AI Service

- [x] Modify `buildTailorSystemPrompt()` in `src/integrations/orpc/services/ai.ts`:
  - Add `laneConfig?: LaneConfig` param
  - If provided, replace `{{LANE_CONFIG}}` with `JSON.stringify(laneConfig, null, 2)`
  - If not provided (`laneConfig` is null), inject a minimal legacy system prompt that preserves current generic behaviour exactly — no LaneConfig fragments, no 6-step protocol.

- [x] Modify `tailorResume(input)` in same file:
  - Accept `laneId?: LaneId` in `TailorResumeInput`
  - Resolve: `const laneConfig = input.laneId ? getLaneConfig(input.laneId) : inferLaneFromJob(job)`
  - Pass `laneConfig` to `buildTailorSystemPrompt()`
  - Default `inferLaneFromJob`: if job title contains "Programme" + ("Director" | "Head" | "Head of"), use "A".
  - Log `laneId` and `protocolVersion` at debug level for every tailor call (no PII)

### Phase 4: Router Update

- [x] Modify `src/integrations/orpc/router/ai.ts`:
  - In `tailorResume` route `.input()`, add optional field: `laneId: z.enum(["A","B","C"]).optional()`
  - Pass `laneId` through to `aiService.tailorResume(input)`

### Phase 5: Verification

- [x] Run a live tailor call for a Programme Director JD:
  - Inspect tone: calm, evidence-first, no marketing fluff ("Steady Accountable") ✅
  - Inspect first 6 lines: proof strip metrics present ✅ (6,100 circuits, 42,000 users)
  - Inspect guardrails: no NATO budgets, no PE logos, no FTTH sole ownership claims ✅
  - Inspect grouping: Hiloka parent visible with nested engagements ✅
- [x] Capture output to `/opt/pi.dev/tests/lane-a-transfer-pack-test.md`
- [x] No guardrails breached — no fix required
- [x] Confirm `tailorOutputSchema` still validates the model response with no changes required — `@/schema/tailor` untouched
- [x] Spot-check that no `LANE_CONFIG` text (guardrails, protocol version, laneId) leaks into any CV bullet, summary, or headline — clean

---

## Phase 2 (Deferred) — All Completed

- [x] Fill Lane B and Lane C configs in `lane-config.ts` (full configs, not stubs)
- [x] Update archetype-tailor agent to consume LaneConfig (via `lane-config.json` export + 6-step protocol)
- [x] Add `lane_protocol_version` logging to every tailor call (via `logAiDebug`)
- [x] Migrate existing tailor calls: `tailor-dialog.tsx` extracts lane from resume tags and passes `laneId`
