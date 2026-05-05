# Job Feed Pipeline — Architecture & Operations

## Overview

The job discovery system runs on a **Python RSS Feed Server** at `http://192.168.0.178:9099`. It scrapes LinkedIn, proxies Jobserve, scores jobs against Russell's career profile, and serves them as RSS feeds consumed by Reactive Resume at `http://192.168.0.178:3000`.

```
┌─────────────────────┐     ┌─────────────────────┐     ┌────────────────────┐
│   LinkedIn          │     │   Feed Server        │     │  Reactive Resume   │
│   (scrape.py)       │────▶│   :9099              │────▶│  :3000             │
│                     │     │                      │     │                    │
│  * Headless Chrome  │     │  GET  /feed          │     │  Job Search UI     │
│  * Cron */6h        │     │  GET  /feed/jobserve │     │  Tailor Pipeline   │
│  * Keyword searches │     │  POST /api/cache/push│     │                    │
│                     │     │  POST /api/jobs/manual│    │                    │
│  ┌───────────────┐  │     │  GET  /api/jobs/top  │     │                    │
│  │ jobs_cache.json│──┼────▶│  GET  /health        │     │                    │
│  └───────────────┘  │     │  GET  /stats          │     │                    │
│                     │     │  GET  /               │     │                    │
│  ┌───────────────┐  │     │                      │     │                    │
│  │ manual_jobs.json│─┼────▶│  scored_jobs.json   │     │                    │
│  └───────────────┘  │     │  canonical_jobs.csv  │     │                    │
└─────────────────────┘     └─────────────────────┘     └────────────────────┘
```

## Location

All files: `/opt/pi.dev/linkedin-feed/` on `192.168.0.178`

## Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `server.py` | 382 | FastAPI server — all HTTP endpoints, RSS generation, cache management |
| `scrape.py` | ~190 | LinkedIn scraper — headless Chrome, keyword searches, dedup |
| `improved_scorer.py` | ~280 | Job scoring engine — scores jobs against MASTER_CAREER_DATA |
| `job_scorer.py` | ~100 | Older simpler scorer (kept for reference) |
| `migrate_standalone.py` | ~150 | Merge sources into canonical CSV |
| `json2md.py` | ~120 | Convert job JSON to markdown for LinkedIn CV export |

## Data Files

| File | Size | Contents |
|------|------|----------|
| `jobs_cache.json` | 131KB | 29 LinkedIn-scraped jobs |
| `manual_jobs.json` | 1.5KB | 3 manually added jobs |
| `scored_jobs.json` | 2.5MB | 281 scored/enriched jobs |
| `canonical_jobs.csv` | 1MB | 89 canonical job records, 23 columns |
| `career_evidence.json` | 6KB | Career evidence cards for matching |
| `server.log` | 15MB+ | Server access log |
| `scrape.log` | 37MB+ | Scraper execution log |

## Scrape Pipeline (`scrape.py`)

### Search Configs

Two search queries run every **6 hours** via cron:

| Keywords | Location | Limit | Max Pages |
|----------|----------|-------|-----------|
| IT Operations Manager | United Kingdom | 20 | 5 |
| Project OR Programme Manager Infrastructure OR Operations Director Contract OR Part Time | United Kingdom | 20 | 5 |

### Process

1. Load existing cache from `jobs_cache.json`
2. Launch headless Chromium via `linkedin_scraper` library
3. Load LinkedIn session from `session.json` (pre-authenticated cookies)
4. For each search config:
   - Search LinkedIn for job URLs
   - Scrape details (title, company, location, salary, description, etc.)
5. Merge new results with existing cache
6. Deduplicate by URL
7. Age out jobs older than 5 days
8. Save to `jobs_cache.json`

### Running

```bash
cd /opt/pi.dev/linkedin-feed && python3 scrape.py
```

Cron: `*/6 * * * * cd /opt/pi.dev/linkedin-feed && python3 scrape.py`

## Server Layer (`server.py`)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/feed` | GET | LinkedIn jobs RSS (filter with `?q=keywords`) |
| `/feed.rss` | GET | Same as `/feed` |
| `/feed/jobserve` | GET | JobServe RSS proxy |
| `/health` | GET | Health check |
| `/stats` | GET | Job statistics |
| `/` | GET | Server info and endpoints |
| `/api/cache/push` | POST | Accept scraped job cache |
| `/api/jobs/manual` | POST | Add a single job manually |
| `/api/jobs/top` | GET | Top N scored jobs |
| `/api/career-evidence` | GET | Career evidence cards |
| `/api/master-data` | GET | MASTER_CAREER_DATA.md content |

### Running

```bash
cd /opt/pi.dev/linkedin-feed && python3 server.py --port 9099
```

Systemd: `rss-feed-server.service`

### Score Indicators in Titles

- `[80+]` → High match
- `[60-79]` → Good match
- `[40-59]` → Possible match
- `[<40]` → Poor match
- `🩷` → Manual job (unscored)
- `— JobServe` → JobServe-sourced job

## Scoring (`improved_scorer.py`)

Matche job title + description against Russell's MASTER_CAREER_DATA using:
- High-value keywords (programme director, infrastructure, SD-WAN, circuit migrations, etc.)
- Medium-value keywords
- Russell-specific indicators (NATO, Home Office, SC clearance)

Output: scored_jobs.json with score (0-100), match_level, enrichment_status, approved/rejected flags

```bash
cd /opt/pi.dev/linkedin-feed && python3 improved_scorer.py
```

## Manual Job Import

```bash
curl -X POST http://192.168.0.178:9099/api/jobs/manual \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Principal Program Manager",
    "company": "YunoJuno",
    "location": "London",
    "url": "https://example.com/job/123",
    "description": "Full job description here..."
  }'
```

## Canonical Data (`migrate_standalone.py`)

Merges all sources into `canonical_jobs.csv` with 23 fields including score, match_level, approved, rejected, notes.

## Integration with Reactive Resume

The feed at `/feed` is consumed by Reactive Resume's `jobserve-rss.ts` provider. The feed URL is stored in the user's browser localStorage (Zustand persist), sent to the server on each job search API call.

Tailor workflow: Job in RSS feed → Select → "Tailor Resume" → AI rewrites archetype CV → New tailored CV
