# pi.dev — CV/Resume Workspace

**Server:** 192.168.0.178  
**Service:** Reactive Resume (v5.0.20) at http://192.168.0.178:3000  
**API Docs:** http://192.168.0.178:3000/api/openapi

## Structure

```
/opt/pi.dev/
├── cvs/                    # CV source files (JSON, MD, CSV, TXT)
│   └── CV_*.json           # Reactive Resume format (injectable)
├── skills/
│   └── SKILL.md            # CV technical skill rules
├── agents/
│   └── resume-cv-agent.md   # Reusable subagent definition
├── scripts/
│   ├── inject.sh           # Inject CV JSON → Reactive Resume
│   └── validate.sh         # Validate JSON against schema
├── schemas/
│   └── interview_questions.json
└── templates/              # (future) Reusable templates
```

## Quick Start

### Validate a CV:
```bash
bash /opt/pi.dev/scripts/validate.sh /opt/pi.dev/cvs/CV_FILENAME.json
```

### Inject a CV:
```bash
bash /opt/pi.dev/scripts/inject.sh /opt/pi.dev/cvs/CV_FILENAME.json
```

### Use the resume-cv-agent:
```bash
# From your agent tools, delegate to resume-cv-agent
```

## Key Credentials

- **API Key:** Set `REACTIVE_RESUME_API_KEY` in your local environment.
- **PostgreSQL:** `/root/reactive-resume.creds`

## Source Control

This workspace mirrors the local project at:
`/Users/russellbatchelor/projects/Russell Batchelor CV/pi.dev/`
