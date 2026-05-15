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
