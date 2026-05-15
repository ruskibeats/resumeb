# Resume & CV Technical Skill

Build, validate, tailor, and inject CVs into Reactive Resume programmatically.

## Overview

This skill provides a reusable pipeline for CV/resume work:
1. **Read** existing CV data (JSON, markdown, CSV)
2. **Analyse** against a job description
3. **Tailor** — rewrite headline, summary, bullets, skills for target role
4. **Validate** — check ATS keywords, quantified metrics, structure, scoring
5. **Inject** — push directly into Reactive Resume API

## Project Structure (`/opt/pi.dev/`)

```
/opt/pi.dev/
├── cvs/                    # CV source files (JSON, MD, CSV, TXT)
│   └── CV_*.json           # Reactive Resume format JSON
├── skills/                 # This skill file + any helpers
│   └── SKILL.md
├── agents/                 # Agent definition files
├── templates/              # Reusable CV templates/structures
├── scripts/                # Helper scripts
│   ├── inject.sh           # Inject JSON into Reactive Resume
│   ├── validate.sh         # Validate JSON schema
│   └── export.sh           # Export CV as PDF/DOCX
├── schemas/                # Interview schemas for requirement gathering
│   └── interview_questions.json
└── team_outputs/           # Generated output files
```

## Reactive Resume API

**Base URL:** `http://192.168.0.178:3000/api/openapi`
**API Key:** Set `REACTIVE_RESUME_API_KEY` in your local environment.

### Key Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/resumes/import` | POST | Import a full CV JSON (`{ "data": { ... } }`) |
| `/resumes` | GET | List all resumes |
| `/resumes/{id}` | GET | Get resume by ID |
| `/resumes/{id}` | PATCH | Update resume fields |
| `/resume/export/{id}/pdf` | GET | Export as PDF |
| `/resume/export/{id}/docx` | GET | Export as DOCX |

### Authentication

Include header: `x-api-key: <key>`

## CV JSON Structure (Reactive Resume v5 Schema)

The JSON must follow this structure:

```json
{
  "data": {
    "picture": { ... },
    "basics": {
      "name": "...",
      "headline": "...",
      "email": "...",
      "phone": "...",
      "location": "...",
      "website": { "url": "...", "label": "..." },
      "customFields": [{ "id": "uuid", "icon": "...", "text": "...", "link": "" }]
    },
    "summary": {
      "title": "Professional Profile",
      "columns": 1,
      "hidden": false,
      "content": "<p>HTML content</p>"
    },
    "sections": {
      "experience": {
        "title": "Professional Experience",
        "columns": 1,
        "hidden": false,
        "items": [
          {
            "id": "uuid",
            "hidden": false,
            "company": "...",
            "position": "...",
            "location": "...",
            "period": "...",
            "website": { "url": "", "label": "" },
            "description": "<p>Intro</p><ul><li>Bullet 1</li><li>Bullet 2</li></ul>",
            "roles": []
          }
        ]
      },
      "skills": { ... "items": [ { "id": "uuid", "hidden": false, "name": "...", "proficiency": "Expert|Advanced", "keywords": [...] } ] },
      "certifications": { ... }
    },
    "customSections": [ ... ],
    "metadata": {
      "template": "onyx",
      "layout": { "sidebarWidth": 31.17, "pages": [{ "fullWidth": true, "main": [...], "sidebar": [] }] },
      "page": { "format": "free-form", "marginX": 20, "marginY": 10, "hideIcons": true },
      "design": { ... },
      "typography": { "body": { "fontFamily": "IBM Plex Serif", "fontSize": 9, "lineHeight": 1.25 }, "heading": { "fontFamily": "IBM Plex Serif", "fontSize": 11 } }
    }
  }
}
```

## CV Tailoring Rules

When tailoring for a target role, apply these rules in order:

### 1. Headline
- Must match the target role's seniority level (not overstate or understate)
- Include key differentiators: JML at Scale, SC/NPPV3 clearance, sector keywords
- Format: `[Role Title] | [Key Skill 1] | [Key Skill 2] | [Sectors] | [Clearances]`

### 2. Summary (Professional Profile)
- Open with hands-on operator framing (not strategic/director-level unless role demands it)
- Include: years of experience, what they deliver (JML, onboarding, service desk), sectors worked in
- Mention clearance status and availability
- Must reference target sector (e.g., "public sector and grant-funded programme environments")
- 4-5 sentences, single paragraph

### 3. Experience Bullets
- **CRITICAL: No `<p>` tags inside `<li>` elements** — this breaks DOCX rendering
- Use flat HTML: `<li>bullet text</li>` NOT `<li><p>bullet text</p></li>`
- Lead each role with a `<p>` intro paragraph, then `<ul><li>...</li></ul>`
- Every bullet must have a quantified metric where possible (user counts, ticket volumes, wave sizes)
- Lead bullets with the MOST relevant skill for the target role
- Recent roles (last 2 years) must have the strongest metrics
- Include ITSM tooling (ServiceNow) in relevant bullets

### 4. Skills Section
- Create JD-specific skill groups at the top with `hidden: false`
- Match keywords from the job description exactly
- All skills must have `hidden: false` for ATS compatibility
- Use `proficiency: "Expert"` or `"Advanced"` 
- Include keywords arrays with ATS-relevant terms

### 5. Career Outcomes / Projects
- Rename section to match role focus: "Key Onboarding & Operations Achievements" for ops roles
- Order bullets by relevance to target role, not chronology
- Lead with the biggest onboarding/JML numbers

### 6. Certifications
- ITIL: Reframe as applied knowledge not expired cert
- SC/NPPV3: Lead with clearance as these are differentiators
- All certs set to `hidden: false`

### 7. Engagement Model (Custom Section)
- Target rate should be flexible (lower end for contract roles)
- Include availability (e.g., "Within 2 weeks")
- Mention on-site delivery preference if role requires it

### 8. Concurrent Roles
- Add "(Part-time, concurrent with [other])" to role headers
- Or hide one and merge its bullets into the other

### 9. Rate Alignment
- If CV rate exceeds JD rate, adjust to show flexibility
- Format: "£550–£650/day (flexible for right-fit programme engagement)"

### 10. Column Settings
- With `fullWidth: true`, all section `columns` must be `1`
- Setting columns ≥ 2 with fullWidth breaks rendering

## Validation Checklist

Before injecting, verify:
- [ ] Valid JSON (python3 -c "import json; json.load(f)")
- [ ] All experience items have: id, hidden, company, position, location, period, website, description, roles
- [ ] All skills have: id, hidden, icon, name, proficiency, level, keywords
- [ ] All certifications have: id, hidden, title, issuer, date, website, description
- [ ] No `<p>` inside `<li>` in descriptions
- [ ] Headline matches target role seniority
- [ ] Recent roles (last 2) have quantified metrics
- [ ] All skills are hidden: false
- [ ] Section columns are 1 when fullWidth: true
- [ ] Rate is flexible/aligned with JD range
- [ ] Summary mentions relevant sector context
- [ ] JD keywords appear in bullets and skills

## Injection Command

```bash
curl -s http://192.168.0.178:3000/api/openapi/resumes/import \
  -H "x-api-key: $REACTIVE_RESUME_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json
with open('/opt/pi.dev/cvs/CV_FILENAME.json') as f:
    data = json.load(f)
print(json.dumps({'data': data}))
")"
```

## Available CV Source Files

| File | Format | Description |
|---|---|---|
| `/opt/pi.dev/cvs/CV_Russell_Batchelor_IT_Ops_Manager_FINAL_v2.json` | JSON | Latest tailored CV (IT Ops Manager) |
| `/opt/pi.dev/cvs/Russell_Batchelor_CV_Blend.md` | Markdown | Source CV in readable format |
| `/opt/pi.dev/cvs/russell_cv_aligned.csv` | CSV | Structured CV data |
| `/opt/pi.dev/cvs/russell_cv.txt` | Text | Plain text CV |
