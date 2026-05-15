# Plan: Add Explicit Pi Context Instructions for CV Repo

## Context

This repo currently has no project-controlled Pi instruction files:

- No `AGENTS.md` found in the workspace.
- No `SYSTEM.md` found in the workspace.
- No `.pi/` directory currently exists in the repo.

Pi still supplies hidden runtime/developer instructions and tool schemas, but the repo does not currently make its own expectations explicit. The goal is to add a small, auditable instruction layer so future Pi sessions behave consistently when working on Russell Batchelor's CV / Reactive Resume workflows.

## Approach

Add two markdown instruction files:

1. `.pi/SYSTEM.md` — concise project-level system guidance for Pi in this repo.
2. `AGENTS.md` — repo-specific operational rules for CV, Reactive Resume API, memory, verification, and safety.

The instructions should make explicit that agents should:

- Preserve Russell Batchelor's core identity/contact details unless specifically instructed otherwise.
- Prefer the Reactive Resume API for builder changes and avoid Playwright unless explicitly requested.
- Create new resumes rather than altering existing ones unless the user gives a target resume ID and confirms the edit.
- Verify API results after creating/updating resumes.
- Treat memory as useful but stale until verified.
- Keep resume work factual, lean, ATS-friendly, and aligned with the user's stated role target.

## Files to modify

- `.pi/SYSTEM.md` — new file.
- `AGENTS.md` — new file at repo root.

## Reuse

Existing project conventions and artifacts to reference:

- Reactive Resume builder/API host used in this session: `http://192.168.0.178:3000`.
- API base pattern used successfully: `http://192.168.0.178:3000/api/openapi`.
- Existing resume data/template source patterns from `archetype-*.json`, `resume-builder.yml`, and `README-Archetypes.md`.
- Existing project-specific docs under `pi.dev/`, especially `pi.dev/server-analysis-todo.md` for RR-related operational history.

## Draft `.pi/SYSTEM.md`

```md
# Pi System Instructions — Russell Batchelor CV

You are working in Russell Batchelor's personal CV/resume workspace.

Default stance:
- Be direct, practical, and execution-focused.
- Prefer using available tools to inspect or verify local/project state rather than guessing.
- Keep outputs concise unless the user asks for detail.
- Treat this repo as personal/professional career material: preserve accuracy, confidentiality, and tone.

Core CV guardrails:
- Do not change Russell Batchelor's name, email, phone number, or location unless the user explicitly asks.
- Do not invent employment history, certifications, clearances, dates, budgets, clients, or metrics.
- If tailoring a CV, preserve the factual career timeline and only adapt emphasis, wording, ordering, and role framing.
- Prefer lean, ATS-friendly wording: clear titles, measurable scope, concise bullets, and no filler.
- Avoid ageism triggers and unnecessary historic detail unless requested.

Reactive Resume guardrails:
- Prefer the Reactive Resume API for creating/updating resumes.
- Do not use Playwright for Reactive Resume unless the user explicitly requests UI automation.
- Create a new resume by default. Do not alter existing resumes unless the user provides a target resume ID and confirms the edit.
- After API writes, verify by fetching the created/updated resume and report the builder URL.

Memory and context:
- Memory can be stale. Verify file paths, API hosts, IDs, and current project state before relying on remembered facts.
- If the user asks what context is loaded, distinguish between hidden Pi runtime instructions, project files such as `SYSTEM.md`/`AGENTS.md`, skills, memory, and live conversation history.
```

## Draft `AGENTS.md`

```md
# AGENTS.md — Russell Batchelor CV Repo

## Project Purpose

This repository contains Russell Batchelor's CV/resume materials, tailored CV variants, Reactive Resume data, LinkedIn/profile automation assets, and supporting documentation.

## Current Working Assumptions

- Primary local project path: `/Users/russellbatchelor/projects/Russell Batchelor CV`.
- Reactive Resume builder currently used for API work: `http://192.168.0.178:3000`.
- Reactive Resume OpenAPI base: `http://192.168.0.178:3000/api/openapi`.
- API authentication uses the `x-api-key` header. Do not print secrets unnecessarily.

Always verify these assumptions before making important changes.

## Resume Editing Rules

1. Preserve identity/contact details unless explicitly instructed:
   - Name: Russell Batchelor
   - Email: russell.batchelor@gmail.com
   - Phone: 07881795908
   - Location: Hemel Hempstead / London

2. Prefer new variants over destructive edits:
   - Create a new resume when tailoring for a new role.
   - Only update an existing resume when the user gives a specific resume ID or builder URL and confirms that it should be changed.

3. Maintain factual integrity:
   - Do not invent companies, dates, budgets, client names, clearances, certifications, or quantified outcomes.
   - If a claim is uncertain or has a placeholder, flag it clearly before final use.
   - Preserve chronological consistency.

4. Tailoring style:
   - Use lean, recruiter-readable bullets.
   - Prioritise role-relevant evidence and keywords from the target job.
   - Keep bullets punchy and specific.
   - Avoid fluffy intros, excessive adjectives, and unsupported claims.
   - Avoid unnecessary age indicators and overlong early-career detail.

## Reactive Resume API Workflow

For creating a new resume:

1. Fetch or reuse a known-good existing resume/template structure when needed.
2. Build a complete `data` object matching the current Reactive Resume schema.
3. `POST /resumes` with name, slug, tags, and `withSampleData: false`.
4. `PUT /resumes/{id}` with the full resume payload/data.
5. Verify with `GET /resumes/{id}`.
6. Report the builder URL: `http://192.168.0.178:3000/builder/{id}`.

For patching an existing resume:

1. Fetch current resume first.
2. Confirm the exact target path or field.
3. Prefer JSON Patch only for small targeted changes.
4. Verify after update.

## Tool Preferences

- Use API calls for Reactive Resume work unless the user explicitly asks for browser/UI automation.
- Use local file reads/searches to verify project state.
- Use memory as a hint, not as proof.
- Keep generated scripts temporary unless the user asks to save tooling permanently.

## Safety

- Do not delete or overwrite existing CV/resume artifacts without explicit confirmation.
- Do not commit, push, install packages, or make destructive changes unless the user asks and the current mode permits it.
- Avoid exposing API keys or credentials in final responses.

## Known Recent Resume Variants

Recent API-created builder URLs may exist in memory, but verify before relying on them:

- IT/Wi-Fi Transformation variant.
- Real Estate / Lean variant.
- M&A Technology Separation / SD-WAN / Cloud / IAM variant.
```

## Steps

- [ ] Create `.pi/` directory if it does not exist.
- [ ] Add `.pi/SYSTEM.md` using the draft above.
- [ ] Add root `AGENTS.md` using the draft above.
- [ ] Re-open both files to verify contents.
- [ ] Optionally run a quick search to confirm there are no conflicting instruction files.
- [ ] Ask Pi in a fresh/new session to summarize loaded project context and confirm the files are picked up.

## Verification

- `find . -name 'SYSTEM.md' -o -name 'AGENTS.md'` should show the new files.
- A new Pi session in this repo should be able to report that `.pi/SYSTEM.md` and `AGENTS.md` exist.
- Future resume-creation tasks should default to API-based new-resume creation, preserving Russell's identity/contact details and verifying builder URLs.
