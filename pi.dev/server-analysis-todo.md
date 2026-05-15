# Server Analysis & Remediation TODO

**Last updated:** 2026-05-02
**Repo:** https://github.com/ruskibeats/resumeb.git

## System Overview

| Service | Host | Port | Status |
|---------|------|------|--------|
| Reactive Resume (RR) | 192.168.0.178 | 3000 | ✅ Running (latest build) |
| RSS Feed Server | 192.168.0.178 | 9099 | ✅ Running (systemd managed) |
| LinkedIn Scraper | 192.168.0.178 | — | ✅ Timer active (6-hourly) |

## Completed

- ✅ Build fixed (duplicate import removed)
- ✅ Lingui extracted & rebuilt (no hash IDs)
- ✅ Git repo created (github.com/ruskibeats/resumeb)
- ✅ Info card removed from integrations page
- ✅ Provider selector removed (always RSS mode)
- ✅ Per-feed test buttons (JobServe + LinkedIn separate)
- ✅ use-job-search.ts simplified (RSS-only)
- ✅ Custom tailor prompt restored
- ✅ RSS server systemd service created
- ✅ Patch scripts & .bak files cleaned up
- ✅ AI ATS patches surfaced (customPrompt, analyze JSON parsing, no Output.object/choice)
- ✅ Orphaned node processes killed

## Remaining

| # | Task |
|---|------|
| 1 | ✅ **Tailor + Analyze resume both fixed for OpenRouter** — `tailorResume` uses text JSON + `jsonrepair` fallback + dual-format normalizer + optional `position`/`headline` fields. Executive contractor prompt with `master-career-data.md`. `analyzeResume` also migrated from structured output to text JSON + fallback (overallScore 68, 5 scorecard, 6 strengths, 5 suggestions). Realism calibration, anti-fabrication, hidden-items rules added. Both endpoints validated. Build passed, service restarted healthy. |
| 2 | ✅ **Apply suggestion button** — `POST /api/openapi/ai/apply-suggestion` endpoint + UI button on each suggestion card. Uses text JSON Patch with `applyResumePatches` (captures returned new document). Headline change validated: HTTP 200, headline updated. |
| 3 | ✅ **Cover letter generation** — added `POST /api/openapi/ai/generate-cover-letter`, `src/schema/cover-letter.ts`, AI service prompt/parser, and builder-side UI. Generates veteran-contractor cover letters, previews HTML, copies plain text, and appends to a cover-letter custom section. HTTP 200 validated with OpenRouter. |
| 4 | 🟡 **Wire source filter to backend** — `jobSource` dropdown in search UI is never sent to the API |
| 5 | 🟢 **Configure git on server** — RR source patches not under version control |

## Quick Commands

```bash
# RR service
ssh root@192.168.0.178 'systemctl status reactive-resume --no-pager'
ssh root@192.168.0.178 'systemctl restart reactive-resume'

# Build
ssh root@192.168.0.178 'cd /opt/reactive-resume && npm run build 2>&1'

# Lingui extract
ssh root@192.168.0.178 'cd /opt/reactive-resume && npm run lingui:extract 2>&1'

# Health
curl -s http://192.168.0.178:3000/api/health | python3 -m json.tool
curl -s http://192.168.0.178:9099/health | python3 -m json.tool

# RSS server log
ssh root@192.168.0.178 'tail -30 /opt/pi.dev/linkedin-feed/server.log'

# LinkedIn scraper
ssh root@192.168.0.178 'systemctl status linkedin-scrape.timer --no-pager'
```
