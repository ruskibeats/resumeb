# LinkedIn Profile Updating Skill

Use this skill to safely and repeatably update Russell Batchelor's LinkedIn profile via Playwright.

## Purpose
This skill manages:
- headline updates
- about updates
- role title updates
- role description updates
- config-driven replay of known LinkedIn role edit forms

## Workspace layout
```text
pi.dev/linkedin-profile-agent/
├── package.json
├── README.md
├── SKILL.md
├── scripts/
│   ├── linkedin-update-profile.mjs
│   └── run-linkedin-update.mjs
├── data/
│   ├── linkedin-profile.config.json
│   └── linkedin-profile.config.example.json
├── docs/
│   ├── WORKFLOW.md
│   └── MCP-SELECTORS.md
└── .pi/
    ├── agents/
    └── skills/
```

## Core operating model
### Preferred path
1. Use the saved Playwright session in `.linkedin-profile-session/`
2. Load a config JSON with desired updates
3. Run `npm run update`
4. If a role fails in standalone automation, verify with MCP snapshots and retry

### One-time setup
```bash
npm install
npm run setup
```
Log into LinkedIn directly. Avoid Google sign-in.

## Role key mapping
- `COLLECTIVE_IP`
- `SOLUTIONS_THROUGH_KNOWLEDGE`
- `HILOKA_LTD`
- `PARK_PLACE_TECHNOLOGIES`
- `CENTRICSIT`
- `SITEHANDS`
- `RAINMAKER_SOLUTIONS`
- `LONDON_BOROUGH_OF_LAMBETH`
- `CHARLES_STANLEY`
- `COMUNICA`
- `IPITOMI`
- `VIRGIN_MEDIA`
- `WHITTINGTON_INSURANCE_MARKETS`

## Config schema
```json
{
  "headline": "...",
  "about": "...",
  "profileUrl": "https://www.linkedin.com/in/russellbatchelor/",
  "roles": {
    "CHARLES_STANLEY": {
      "title": "Project Manager",
      "description": "...",
      "editUrl": "https://..."
    }
  }
}
```

## Known selectors
- Title textbox: `Ex: Retail Sales Manager`
- Description textbox: `Description, maximum 2,000 characters`
- Save: `Save`
- Prompt dismissal after save: `Skip`

## Known direct edit URLs
Read `docs/WORKFLOW.md` for the current list.

## Rules
- Prefer direct role edit URLs over dynamic discovery.
- Prefer direct LinkedIn authentication, not Google OAuth.
- If standalone Playwright fails on a role, use MCP snapshot verification and update the config or script.
- Save after every role edit and dismiss `Skip` when shown.
- Do not assume all roles share identical DOM behavior; validate if a role starts failing.

## Successful validation examples
- Collective IP title changed to `Operations Manager`
- Hiloka Ltd title changed to `Managing Director`
- Charles Stanley title targeted via direct role edit URL
- Description field successfully filled via `Description, maximum 2,000 characters`
