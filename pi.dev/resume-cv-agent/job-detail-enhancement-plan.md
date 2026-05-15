# Plan: Job Detail Panel — Resource Cards + Match Score + Evidence

## Overview

Enhance the Reactive Resume job detail sheet (right-side panel) with three new sections: **Resource Cards**, **Match Score**, and improved **Matching Experience** cards.

## Layout Order (Top to Bottom)

```
┌─────────────────────────────────────────┐
│  Job Title & Employer (existing)       │
├─────────────────────────────────────────┤
│  Badges + Apply button (existing)      │
├─────────────────────────────────────────┤
│  🔖 RESOURCES                          │
│  ┌─────────┬──────────┬──────────┐     │
│  │ Prompt  │Master    │ Donor    │     │
│  │ (edit)  │Data(edit)│ CV       │     │
│  └─────────┴──────────┴──────────┘     │
├─────────────────────────────────────────┤
│  📊 MATCH SCORE: 72%                   │
│  ████████████████░░░░░░░░              │
├─────────────────────────────────────────┤
│  🏆 MATCHING EXPERIENCE                │
│  ┌─────────────────────────────────┐   │
│  │ Card 1: Governance Framework   │   │
│  │ Score: High  |  Contract & Com  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Card 2: 25K Wi-Fi Endpoints    │   │
│  │ Score: Medium | Wi-Fi/Network   │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  Description (existing)                 │
│  Apply Via (existing)                   │
└─────────────────────────────────────────┘
```

## Components to Build

### 1. Resource Cards (3 cards in a grid)

- **Prompt Card** — Shows "Elite Tailor Prompt" label. Click opens a modal/dialog with an editable textarea containing the current prompt. Changes save to localStorage. Re-fetches on next job detail open.
- **Master Data Card** — Shows "Career Data" label. Click opens an editable view (modal with collapsible sections per role) where user can add/remove/amend entries. Changes save to localStorage.
- **Donor CV Card** — Shows "Donor CV" label. Click opens the donor CV in a new tab (`/builder/{donor-cv-id}`). Static link, no edit needed.

**Data Storage:**
- Prompt: `localStorage.getItem("cv-tailor-prompt")` with fallback to the default elite prompt
- Master Data: `localStorage.getItem("cv-master-data")` with fallback to the MASTER_CAREER_DATA.md content

### 2. Match Score

**Calculation** (simple keyword overlap):
1. Extract keywords from the job description (title + description text → tokenize → filter stop words → take top 20 meaningful terms)
2. Each evidence card has a `keywords` array already
3. Score per card = `(matching keywords / total card keywords) * 100`
4. Overall score = average of top 3 card scores

**Display:**
- Overall percentage with a progress bar (color: green > 60%, amber 30-60%, red < 30%)
- Per-card relevance badge: High/Medium/Low based on individual score

### 3. Matching Experience Cards (existing, enhanced)

Already working from CORS fix. Add:
- Relevance score badge on each card (High/Medium/Low)
- Show max 3 cards initially, "Show all N matches" expand

## Implementation Order

1. Create `JobResourceCards.tsx` — new React component (extract from job-detail.tsx)
2. Create `MatchScoreBar.tsx` — score calculation + progress bar component
3. Update `career_evidence.json` — ensure keyword arrays are comprehensive
4. Add match score to `/api/career-evidence` endpoint response
5. Update `job-detail.tsx` — integrate new components in the new layout order
6. Add prompt editor dialog component
7. Add master data editor dialog component
8. Rebuild RR + test

## Files to Modify

| File | Change |
|------|--------|
| `src/.../job-detail.tsx` | Restructure layout, integrate new components |
| `src/.../components/JobResourceCards.tsx` | **New** — resource cards + edit dialogs |
| `src/.../components/MatchScoreBar.tsx` | **New** — score calculation + progress bar |
| `/opt/pi.dev/linkedin-feed/server.py` | Update `/api/career-evidence` to return scores |
| `/opt/pi.dev/linkedin-feed/career_evidence.json` | Add comprehensive keyword arrays |
| `src/.../locales/en-US.po` | i18n for new labels |

## Edge Cases

- **No evidence cards match**: Show "No matching evidence" message with empty score
- **Job description too short**: Fall back to title-only keyword matching
- **Edited prompt vs default**: Check localStorage first, fall back to embedded default
- **Master data empty**: Show "No career data — upload MASTER_CAREER_DATA.md"
- **Score 0%**: Show greyed-out progress bar, "No direct match found"
- **Mobile**: Stack resource cards vertically on small screens (3-col → 1-col on mobile)

## Future Considerations

- LLM-powered scoring via OpenRouter for more nuanced matching
- Version history for edited prompt and master data
- Export edited master data back to pi.dev as MASTER_CAREER_DATA.md
