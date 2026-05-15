# Plan: Russell Batchelor Archetype Base Resumes

## Context for Coding Agent

The objective is to programmatically generate ATS-optimized Archetype Base Resumes (A, B, C) for Russell Batchelor, mapping his 30-year career into a structured JSON/Markdown format in Reactive Resume at `192.168.0.178:3000`.

To prevent ATS "job-hopper" penalties from short-term contracts while preserving the verifiable timeline, use a **Hybrid (Combination) format**. This architecture balances a skills-forward summary with a reverse-chronological work history using **Agency-Based Grouping** — nesting short-term and concurrent mandates under a single consultancy vehicle.

Existing source material lives in `team_outputs/` — coverage notes, CV texts, Transfer Packs, role research, ATS keyword banks. Read those first. The existing archetype JSONs on the server at `/opt/pi.dev/cvs/` also need rebuilt with the new structure.

---

## The Structural Blueprint (Bot Instructions)

### 1. The Executive Summary & Skills Matrix
The top third of the CV must function as a strategic narrative anchor.
- **Summary formulation:** `[Target Job Title] + [Years of Experience] + [Primary Proof Point/Scale] + [Core Value Proposition]`
- **Competency Mapping:** Follow with a "Core Competencies" matrix that de-aggregates expertise into logical groupings (Strategic Leadership, Technical Domain Expertise, Interpersonal & Stakeholder Management).

### Bot Instruction Module: Agency-Based Grouping (The "Umbrella" Strategy)

**Objective for the AI:**
You must implement "Agency-Based Grouping" to format the candidate's recent work history. Do not list all short-term contract roles as separate, disconnected jobs — this creates a scattered timeline and triggers ATS "job-hopper" penalties. Instead, group all short-term, concurrent, and interim consulting mandates under the candidate's own personal consultancy vehicle.

**Step 1: Create the Parent "Umbrella" Entity**
Create a single overarching work experience block for the candidate's consultancy. This establishes 15 years of uninterrupted executive stability:
- **Employer:** Hiloka Limited
- **Title:** Managing Director / Contract Operations Director
- **Dates:** Jan 2010 – Present
- **Location:** UK / Remote
- **Description:** *Own consultancy vehicle through which contract operations, infrastructure delivery, and independent advisory engagements are delivered to enterprise and PE-backed businesses. Key engagements include:*

**Step 2: Nest the "Child" Engagements**
Format the following client engagements as sub-roles or nested project blocks inside the Hiloka Limited parent entry. Order them reverse-chronologically by start date.

**CRITICAL ATS RULE:** You must append the exact tag `*(Concurrent)*` or `*(Concurrent engagement)*` to any overlapping dates. This instructs the ATS and human recruiters to parse overlapping dates as parallel capacity rather than timeline errors:

1. **Independent Consultant – AI Strategy & Digital Innovation** | June 2025 – Present *(Concurrent)*
2. **Atos** | Infrastructure Programme Manager | Sept 2025 – Present *(Concurrent)*
3. **Collective IP** | Technical Programme Manager | June 2025 – Present *(Concurrent)*
4. **Founder & Managing Director – Private Equity & AI Automation** | Mar 2020 – Present *(Concurrent)* — ~£20M PE-backed online portfolio, nested under Hiloka
5. **Major International Gaming Group (LVS)** | Operations Director | Jan 2024 – Feb 2025
6. **CentricsIT** | Operations & Infrastructure Director, EMEA | Nov 2020 – Dec 2024
7. **Sitehands LLC** | Operations Director / Project Director | Jan 2019 – Nov 2020
8. **Rainmaker Solutions** | Contract Operations Director | Jan 2017 – Dec 2018

**Step 3: The Exclusion Rule (Standalone Entities)**
Do **not** nest massive, long-term engagements or early-career permanent roles under the Hiloka umbrella. Grouping a 7-year engagement under a consultancy umbrella dilutes its executive scale. The following must be kept as separate, standalone chronological entries outside the umbrella:
- **London Borough of Lambeth** (Mar 2009 – Apr 2015)
- All compressed roles in the **"Earlier Career Highlights"** section (Charles Stanley, Comunica, Ipitomi, Virgin Media, Whittington).

**Step 4: JSON & Schema Mapping Logic**
If outputting to a JSON schema (like Reactive Resume), place the Child engagements inside the `roles` array or nested items list belonging to the Hiloka Limited `experience` object. If outputting to Markdown, use bolded sub-headers or bullet points for the Child roles, indented clearly under the Hiloka Limited parent block to maintain visual hierarchy.

### Step 5: Earlier Career Compression (15+ Years)
Compress pre-2009 roles into a single section titled **"EARLIER CAREER HIGHLIGHTS"**. One-line proofs only:
- Infrastructure Consultant | Charles Stanley Group (Apr 2007 – Mar 2009)
- Operations Manager | Comunica (Mar 2005 – Apr 2007)
- Co-Founder & Managing Director | Ipitomi Ltd (Jan 2001 – Mar 2005)
- Non-Standard Technical Design Authority | Virgin Media (Nov 1998 – Dec 2000)
- Head of IT & Network Operations | Whittington Insurance Markets (Jun 1996 – Oct 1998)

---

## Subagent Orchestration & Model Governance

Master Orchestrator: Your role is to manage the pipeline, read the source data, and delegate specific tasks to specialized subagents. Do not attempt to generate CV text, apply the psychological archetype, and build JSON structure in a single unstructured pass.

### Subagent: cv-creator (The Narrative Engineer)
- **Task:** Apply the LaneConfig, the chosen Psychological Archetype, and target ATS keywords to MASTER_CAREER_DATA. Dynamically rewrite bullet points under the Hiloka umbrella to match the target audience (e.g., P&L emphasis for Lane C, multi-vendor orchestration for Lane A).
- **Required Model:** `openrouter/anthropic/claude-sonnet-4.6` — needed for the strict 6-step Transfer Pack protocol, occupational psychology framing, and Do Not Claim guardrails.

### Subagent: resume-cv-agent (The Structural Injector)
- **Task:** Take approved markdown text from cv-creator and map it into the strict JSON schema required by the Reactive Resume backend. Enforce single-column hybrid layout, en-dash dates (Jan 2024 – Present), and standard machine-readable headers.
- **Required Model:** A fast, high-accuracy structural model (gpt-4o or claude-3-5-sonnet) optimized for clean JSON output.

### Subagent: ats-compatibility-analyzer (The Elite Auditor)
- **Task:** Run the generated JSON against the Elite Executive CV Analyst system prompt. Audit chronology, the Action+Metric impact formula, and ATS parsing safety.
- **Required Model:** `openrouter/anthropic/claude-sonnet-4.6` — prevents hallucinated scores, ensures strict validation against absolute source of truth.

### Execution Workflow (Phases 2–4)
For each archetype rebuild, execute this strict loop:
1. Call **cv-creator** (model: claude-sonnet-4.6) to generate targeted CV text based on the specific archetype blueprint.
2. Pass the approved text to **resume-cv-agent** to inject into Reactive Resume JSON structure.
3. Call **ats-compatibility-analyzer** (model: claude-sonnet-4.6) to score the new CV.
4. If overall ATS score < 75, return the precise JSON suggestions to cv-creator for a mandatory revision loop before finalizing.

---

## Archetype Definitions

### Archetype A — Infrastructure Programme Director
| Element | Value |
|---------|-------|
| **Target audience** | Enterprise IT consultancies, MSPs, PE-backed infrastructure firms |
| **Headline** | Per Transfer Pack v2 lane definition |
| **Priority evidence** | CentricsIT 6,100+ circuits, NATO, Sitehands 25,000 endpoints |
| **ATS keyword clusters** | separation programme, multi-workstation delivery, risk cascades, dependency mapping, enterprise infrastructure, governance |

### Archetype B — Senior Infrastructure Programme Manager
| Element | Value |
|---------|-------|
| **Target audience** | NHS, government, global software, retail |
| **Headline** | Per Transfer Pack v2 lane definition |
| **Priority evidence** | Atos/NHS live-estate, Rainmaker JML, Collective IP governance |
| **ATS keyword clusters** | JML, ServiceNow, ITIL, RAID logs, cross-functional tracking, delivery cadence |

### Archetype C — Technical Operations Director (Interim)
| Element | Value |
|---------|-------|
| **Target audience** | PE-backed tech firms, connectivity providers, scale-ups |
| **Headline** | Per Transfer Pack v2 lane definition |
| **Priority evidence** | LVS P&L + board KPI, Ipitomi subscription model, Lambeth 12M re-tender |
| **ATS keyword clusters** | run-rate reduction, P&L impact, vendor performance, SLA governance, operational efficiency |

### Archetype D — Head of AI Operations & Digital Innovation
| Element | Value |
|---------|-------|
| **Lane ID** | D |
| **Psychological archetype** | The Innovation Integrator — forward-looking, ROI-driven, bridging technical AI capability with business operations |
| **Target audience** | Forward-thinking enterprises, consultancies, and scale-ups looking to operationalise AI without breaking existing governance |
| **Headline** | Head of AI Operations & Digital Innovation | Operating Model Transformation & AI Governance | SC + NPPV3 Cleared |
| **Priority evidence** | Hiloka AI PE firm (2020-Present), Hiloka AI advisory (2025-Present), Comunica (weeks-to-days process automation), Lambeth 60% cost reduction |
| **Proof strip metrics** | AI-First Operating Model Transformation, ~42,000-user service migrations, 60% WAN cost reduction, SC/NPPV3 Cleared |
| **ATS keyword clusters** | AI strategy, digital innovation, discovery workshops, value hypotheses, operating model changes, AI pilots/POCs, workflow automation, GenAI use case mapping |
| **Do Not Claim** | Hands-on ML engineering, exact financial ROI for independent AI projects, clinical/neurodiversity language, NATO exact budgets, named PE logos |

---

## Formatting & ATS Rules (for resume-cv-agent)
1. **File Format & Layout:** Single-column layout. No tables, graphics, or complex columns — these degrade parsing in Workday and iCIMS.
2. **Date Standardisation:** `Month Year – Month Year` (e.g. Jan 2024 – Present) using en-dashes. Current roles end with "Present" (capitalised). No "Now" or "Current".
3. **Section Headers:** Standard machine-readable headers only: *Professional Summary, Core Competencies, Professional Experience, Earlier Career Highlights, Education & Certifications*.
4. **Bullet Formula:** Action Verb + Context/Project + Metric/Scale + Business Effect.

---

## Source Assets (Read Before Building)

### From `team_outputs/`
| File | Purpose |
|------|---------|
| `archetype-{A,B,C}-coverage-notes.md` | Gap analysis per lane |
| `archetype-{A,B,C}-cv-text.md` | Existing CV text as starting reference |
| `Human_Profile_Transfer_Pack_v2.md` | Lane definitions, ATS keywords, Do Not Claim |
| `Human_Profile_Master_v2.md` | Full career narrative and evidence library |
| `UKMR_03-ATS-Keyword-Bank-and-Positioning-Guidance.md` | ATS keyword clusters per lane |
| `UKMR_02-Target-Role-Matrix-UK.md` | Target role mapping |
| `research/archetype-A-ats-score.md` | Baseline 89/100 for comparison |
| `research/current-cv-ats-baseline.md` | Baseline 85/100 |

### From Server
| Asset | Location |
|-------|----------|
| Master Career Data | `/opt/reactive-resume/src/integrations/ai/prompts/master-career-data.md` |
| Tailor System Prompt | `/opt/reactive-resume/src/integrations/ai/prompts/tailor-system.md` |
| Reactive Resume API | `http://192.168.0.178:3000/api/openapi` |

---

## Steps

### Phase 1: Read source data
- [ ] Read all three archetype coverage notes from `team_outputs/`
- [ ] Read all three archetype CV text files from `team_outputs/`
- [ ] Read Human_Profile_Transfer_Pack_v2.md for lane definitions
- [ ] Read ATS keyword bank and role matrix from `team_outputs/UKMR_*`
- [ ] Read existing archetype JSONs from `/opt/pi.dev/cvs/` on server

### Phase 2: Rebuild Archetype A (Infra Programme Director)
- [ ] Write Archetype A blueprint with umbrella nesting structure
- [ ] Use `cv-creator` agent to generate A CV text per new structure
- [ ] Use `resume-cv-agent` to inject A into Reactive Resume
- [ ] Use `ats-compatibility-analyzer` to score A (target ≥75)

### Phase 3: Rebuild Archetype B (Senior Infra PM)
- [ ] Write Archetype B blueprint with umbrella nesting structure
- [ ] Use `cv-creator` agent to generate B CV text
- [ ] Use `resume-cv-agent` to inject B into Reactive Resume
- [ ] Use `ats-compatibility-analyzer` to score B (target ≥75)

### Phase 4: Rebuild Archetype C (Tech Ops Director)
- [ ] Write Archetype C blueprint with umbrella nesting structure
- [ ] Use `cv-creator` agent to generate C CV text
- [ ] Use `resume-cv-agent` to inject C into Reactive Resume
- [ ] Use `ats-compatibility-analyzer` to score C (target ≥75)

### Phase 5: Create Archetype D (Head of AI Operations)
- [x] PE firm detail confirmed by Russell: ~£20M PE-backed online portfolio
- [x] Entity: Nested under Hiloka Limited (Founder & Managing Director – Private Equity & AI Automation)
- [x] Scale metric: ~£20M PE-backed online portfolio engagement
- [x] Master career data updated with AI Strategy role and PE firm detail
- [x] Narrative Engineering Directive added to master data
- [x] Archetype D blueprint written (team_outputs/research/archetype-D-blueprint.md)
- [x] Use cv-creator to generate D CV text — done
- [x] Use resume-cv-agent to inject D into Reactive Resume — UUID: 019e0297-2210-7290-8246-54126533e02c
- [ ] Use ats-compatibility-analyzer to score D (target >=75)

### Phase 6: Document
- [x] Update README-Archetypes.md with all archetypes, UUIDs and nesting rules
- [x] Record all CV UUIDs in README

---

## Verification
1. Each archetype uses the umbrella nesting structure (Hiloka + nested child roles + standalone Lambeth + earlier career compression)
2. All three exist in Reactive Resume with ATS score ≥75
3. README documents which archetype to use for which JD type
4. Bullet content shifts by archetype lens — same role, different emphasis per lane
