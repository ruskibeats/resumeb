# Job Feed Aggregator (`192.168.0.178:9099`)

Standalone FastAPI job aggregation service for Russell Batchelor's Reactive Resume / job matching workflow.

The service is independent of Reactive Resume. Reactive Resume consumes it over HTTP via RSS and JSON APIs.

---

## Current Status

- **Host:** `192.168.0.178`
- **Port:** `9099`
- **Systemd service:** `rss-feed-server.service`
- **Working directory:** `/opt/pi.dev/linkedin-feed`
- **Runtime:** Python + FastAPI + Uvicorn
- **LinkedIn source:** JobSpy HTTP scraper (`python-jobspy`), no browser/session required
- **Other sources:** JobServe RSS + manually added jobs
- **Git:** local git repo in `/opt/pi.dev/linkedin-feed`

Quick checks:

```bash
curl -s http://localhost:9099/health | python3 -m json.tool
curl -s http://localhost:9099/stats | python3 -m json.tool
systemctl status rss-feed-server.service --no-pager
```

---

## Why This Exists

Reactive Resume needs a job source. This service provides one by:

1. Scraping/pulling jobs from external sources.
2. Normalising them into a common schema.
3. Deduplicating repeated jobs.
4. Scoring them against `MASTER_CAREER_DATA.md`.
5. Serving the result as RSS and JSON.

The service intentionally stays outside the Reactive Resume runtime.

---

## Architecture

```text
LinkedIn via JobSpy ─┐
                     │
manual_jobs.json ────┼──▶ aggregator.py ──▶ aggregated_jobs.json
                     │        │             aggregated_jobs.csv
JobServe RSS ────────┘        │             feed.rss
                              ▼
                         server.py
                      FastAPI on :9099
```

Core flow:

1. `jobspy_linkedin_scrape.py` scrapes LinkedIn using JobSpy.
2. It writes `jobs_cache.json` and pushes the JSON array to `POST /api/cache/push`.
3. `server.py` accepts the push and triggers `aggregator.aggregate()`.
4. `aggregator.py` loads LinkedIn cache + JobServe + manual jobs.
5. It deduplicates, scores, expires old jobs, and writes runtime outputs.
6. `server.py` serves `/feed`, `/api/jobs`, `/api/jobs/search`, `/health`, `/stats`, etc.

---

## Important Files

| Path | Purpose |
|---|---|
| `server.py` | FastAPI app and HTTP endpoints |
| `aggregator.py` | Merge/dedupe/score/persist pipeline |
| `jobspy_linkedin_scrape.py` | LinkedIn scraper using JobSpy; replaces Playwright/browser scraping |
| `config.py` | Environment-driven settings and paths |
| `jobfeed/` | Internal package: models, scorer, JobServe parser, RSS builder, storage helpers |
| `manual_jobs.json` | Source data for manually entered jobs |
| `career_evidence.json` | Career evidence cards used by helper endpoint/UI |
| `jobs_cache.json` | Runtime LinkedIn cache; generated; ignored by git |
| `aggregated_jobs.json` | Runtime merged/scored JSON; generated; ignored by git |
| `aggregated_jobs.csv` | Runtime CSV; generated; ignored by git |
| `feed.rss` | Runtime RSS output; generated; ignored by git |
| `aggregator_state.json` | Last aggregation status; generated; ignored by git |
| `server.log` / `scrape.log` | Runtime logs; ignored by git |

---

## LinkedIn: JobSpy, Not Playwright

LinkedIn scraping now uses JobSpy:

<https://github.com/speedyapply/JobSpy>

Why:

- No browser.
- No xvfb.
- No LinkedIn session cookies.
- No human login loop.
- No Playwright/headless fingerprinting.
- Runs directly on `.178`.

The older Playwright/browser scraper worked intermittently on the Mac, but failed when ported to `.178` because LinkedIn detects server-side browser automation. Treat that path as deprecated for this service.

### Run LinkedIn scrape and push

```bash
cd /opt/pi.dev/linkedin-feed
./jobspy_linkedin_scrape.py
```

Default behaviour:

- Runs the default LinkedIn searches.
- Requests 25 results per search.
- Deduplicates by URL.
- Saves to `jobs_cache.json`.
- Pushes to `http://localhost:9099/api/cache/push`.
- The API triggers aggregation.

### Small smoke test without pushing

```bash
cd /opt/pi.dev/linkedin-feed
./jobspy_linkedin_scrape.py \
  --search "IT Operations Manager" \
  --results-per-search 3 \
  --no-push
```

### Useful options

```text
--search TERM              Override/add search term; may be repeated
--results-per-search N     Number of JobSpy rows requested per search
--hours-old N              Limit result age where supported by JobSpy
--output PATH              Cache JSON path
--push-url URL             Aggregator push URL
--no-push                  Save only; do not push to API
```

### Normalised LinkedIn cache schema

```json
{
  "source": "linkedin",
  "source_job_id": "li-4408915855",
  "title": "Global IT Operations Manager",
  "company": "Muck Rack",
  "location": "United Kingdom",
  "linkedin_url": "https://www.linkedin.com/jobs/view/4408915855",
  "url": "https://www.linkedin.com/jobs/view/4408915855",
  "posted_date": "2026-05-05",
  "employment_type": "fulltime",
  "salary": "GBP 400-500 per day",
  "description": "...",
  "scraped_at": "2026-05-05T16:11:01+00:00"
}
```

---

## JobServe

JobServe is fetched live inside `aggregator.py` using `JOBSERVE_RSS_URL` from `config.py` or the environment.

The output is normalised into the same job model as LinkedIn and manual jobs.

---

## Manual Jobs

Manual jobs are stored in `manual_jobs.json` and can be added via API:

```bash
curl -X POST http://localhost:9099/api/jobs/manual \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Example Programme Director",
    "company": "Example Ltd",
    "location": "London",
    "url": "https://example.com/job",
    "employment_type": "Contract",
    "salary": "£700 per day",
    "description": "Programme delivery role..."
  }'
```

---

## Main API Endpoints

### Health and stats

```bash
curl -s http://localhost:9099/health | python3 -m json.tool
curl -s http://localhost:9099/stats | python3 -m json.tool
```

### RSS

```bash
curl -s http://localhost:9099/feed | head
```

Aliases:

- `/feed`
- `/feed.rss`
- `/feed/jobserve` — legacy alias, now returns the aggregated feed

### JSON jobs

```bash
curl -s 'http://localhost:9099/api/jobs?limit=5' | python3 -m json.tool
```

Filters:

```bash
# Source-specific
curl -s 'http://localhost:9099/api/jobs?source=linkedin&limit=5' | python3 -m json.tool
curl -s 'http://localhost:9099/api/jobs?source=jobserve&limit=5' | python3 -m json.tool
curl -s 'http://localhost:9099/api/jobs?source=manual&limit=5' | python3 -m json.tool

# Minimum score
curl -s 'http://localhost:9099/api/jobs?min_score=60&limit=10' | python3 -m json.tool

# Include expired jobs
curl -s 'http://localhost:9099/api/jobs?exclude_expired=false&limit=10' | python3 -m json.tool
```

### Top jobs

```bash
curl -s 'http://localhost:9099/api/jobs/top?limit=10' | python3 -m json.tool
```

### Single job

```bash
curl -s 'http://localhost:9099/api/jobs/by-id?job_id=linkedin:li-4408915855' | python3 -m json.tool
```

### Reactive Resume search shape

```bash
curl -s 'http://localhost:9099/api/jobs/search?query=jobs&page=1&num_pages=1' | python3 -m json.tool
```

This endpoint maps the aggregate rows into the richer shape expected by the Reactive Resume job-card integration.

### Push LinkedIn cache manually

```bash
curl -X POST http://localhost:9099/api/cache/push \
  -H 'Content-Type: application/json' \
  -d @jobs_cache.json
```

---

## Aggregation Details

`aggregator.py`:

1. Loads LinkedIn cache from `jobs_cache.json`.
2. Loads manual jobs from `manual_jobs.json`.
3. Fetches JobServe RSS.
4. Converts rows into the `Job` model.
5. Deduplicates by URL, then title/company/location fallback.
6. Scores using `jobfeed/scorer.py` and `MASTER_CAREER_DATA.md`.
7. Sets expiry based on `posted_date` and `DEFAULT_EXPIRY_DAYS`.
8. Writes `aggregated_jobs.json`, `aggregated_jobs.csv`, `feed.rss`, and `aggregator_state.json`.

Aggregation runs:

- Once on FastAPI startup.
- Periodically in the background.
- After `POST /api/cache/push`.

---

## Scoring

Implemented in `jobfeed/scorer.py`.

Inputs considered:

- High-value phrases: programme director, technical operations director, infrastructure modernisation, SD-WAN, cloud migration, etc.
- Medium-value phrases: infrastructure, network, migration, deployment, security, programme, director, project management.
- Russell indicators: Home Office, MHCLG, NATO, WWT, Hemel Hempstead, London.
- Title bonuses.
- Salary/rate signals.
- Negative keywords: junior, graduate, helpdesk, service desk, desktop support, etc.
- Description quality.

Key output fields:

```text
_score        integer 0-100
_match_level  target | good | maybe | poor
score         string compatibility copy
match_level   string compatibility copy
```

---

## Systemd Operations

Service:

```bash
systemctl status rss-feed-server.service --no-pager
systemctl restart rss-feed-server.service
journalctl -u rss-feed-server.service -n 100 --no-pager
```

Port check:

```bash
ss -tlnp | grep 9099
```

Logs:

```bash
tail -100 /opt/pi.dev/linkedin-feed/server.log
```

Expected systemd file:

```ini
[Unit]
Description=RSS Feed Server (LinkedIn + JobServe)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pi.dev/linkedin-feed
ExecStart=/usr/bin/python3 /opt/pi.dev/linkedin-feed/server.py --port 9099
Restart=always
RestartSec=10
StandardOutput=append:/opt/pi.dev/linkedin-feed/server.log
StandardError=append:/opt/pi.dev/linkedin-feed/server.log

[Install]
WantedBy=multi-user.target
```

---

## Optional Systemd Timer for JobSpy Scraping

Manual is currently safest:

```bash
cd /opt/pi.dev/linkedin-feed
./jobspy_linkedin_scrape.py
```

If scheduling is desired, create:

```ini
# /etc/systemd/system/linkedin-jobspy-scrape.service
[Unit]
Description=Scrape LinkedIn jobs with JobSpy and push to aggregator
After=network-online.target rss-feed-server.service
Wants=network-online.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/opt/pi.dev/linkedin-feed
ExecStart=/usr/bin/python3 /opt/pi.dev/linkedin-feed/jobspy_linkedin_scrape.py
StandardOutput=append:/opt/pi.dev/linkedin-feed/scrape.log
StandardError=append:/opt/pi.dev/linkedin-feed/scrape.log
```

```ini
# /etc/systemd/system/linkedin-jobspy-scrape.timer
[Unit]
Description=Run LinkedIn JobSpy scrape every 6 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=6h
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:

```bash
systemctl daemon-reload
systemctl enable --now linkedin-jobspy-scrape.timer
systemctl list-timers | grep linkedin-jobspy
```

---

## Testing and Validation

Run tests:

```bash
cd /opt/pi.dev/linkedin-feed
python3 -m unittest -q test_jobspy_linkedin_scrape.py test_server_filters.py
```

Syntax check:

```bash
python3 -m py_compile server.py aggregator.py config.py jobspy_linkedin_scrape.py jobfeed/*.py
```

End-to-end smoke test:

```bash
cd /opt/pi.dev/linkedin-feed
./jobspy_linkedin_scrape.py --search "IT Operations Manager" --results-per-search 3 --no-push
./jobspy_linkedin_scrape.py --search "IT Operations Manager" --results-per-search 3
sleep 2
curl -s 'http://localhost:9099/api/jobs?source=linkedin&limit=3' | python3 -m json.tool
```

Expected:

- JobSpy returns rows.
- `jobs_cache.json` updates.
- `/api/cache/push` returns `{"status":"ok","queued":true,...}`.
- `/stats` shows non-zero LinkedIn count.
- `/api/jobs?source=linkedin` returns LinkedIn rows.

---

## Git Workflow

This is a local git repo.

```bash
cd /opt/pi.dev/linkedin-feed
git status --short
git log --oneline --decorate -5
```

Commit changes:

```bash
git add .
git commit -m "describe change"
```

No remote is currently configured.

Runtime/generated files are ignored by `.gitignore`.

---

## Troubleshooting

### LinkedIn API returns zero jobs

```bash
./jobspy_linkedin_scrape.py --search "IT Operations Manager" --results-per-search 3 --no-push
python3 -c 'from jobspy import scrape_jobs; print("jobspy ok")'
```

### `/api/jobs?source=linkedin` returns zero rows

Check expiry filtering:

```bash
curl -s 'http://localhost:9099/api/jobs?source=linkedin&exclude_expired=false&limit=5' | python3 -m json.tool
```

Check aggregation state:

```bash
cat /opt/pi.dev/linkedin-feed/aggregator_state.json
```

### Service is down

```bash
systemctl status rss-feed-server.service --no-pager
ss -tlnp | grep 9099
```

### Aggregation failed

```bash
cat /opt/pi.dev/linkedin-feed/aggregator_state.json
tail -100 /opt/pi.dev/linkedin-feed/server.log
```

### Generated files missing

```bash
systemctl restart rss-feed-server.service
```

Or push the existing cache:

```bash
curl -X POST http://localhost:9099/api/cache/push \
  -H 'Content-Type: application/json' \
  -d @/opt/pi.dev/linkedin-feed/jobs_cache.json
```

---

## Security Notes

- `POST /api/cache/push` supports optional bearer-token auth via `PUSH_API_KEY`.
- No `PUSH_API_KEY` is currently configured, so trusted-LAN access is assumed.
- If exposed beyond the LAN, configure `PUSH_API_KEY` and firewall rules.
- Do not commit browser sessions or LinkedIn auth cookies.
- JobSpy avoids the need for LinkedIn auth cookies in normal operation.

---

## Design Decisions

1. Keep `:9099` standalone.
2. Use JobSpy for LinkedIn.
3. Keep JobServe as live RSS fetch in the aggregator.
4. Keep manual jobs as JSON source data.
5. Keep generated/runtime files out of git.
6. Keep `/feed/jobserve` as a compatibility alias.
7. Keep `/api/jobs/search` for Reactive Resume's richer job-card format.

---

## Quick Command Reference

```bash
# service
systemctl status rss-feed-server.service --no-pager
systemctl restart rss-feed-server.service

# scrape LinkedIn now
cd /opt/pi.dev/linkedin-feed
./jobspy_linkedin_scrape.py

# health/stats
curl -s http://localhost:9099/health | python3 -m json.tool
curl -s http://localhost:9099/stats | python3 -m json.tool

# jobs
curl -s 'http://localhost:9099/api/jobs?source=linkedin&limit=5' | python3 -m json.tool
curl -s 'http://localhost:9099/api/jobs/top?limit=10' | python3 -m json.tool
curl -s http://localhost:9099/feed | head

# validation
python3 -m unittest -q test_jobspy_linkedin_scrape.py test_server_filters.py
python3 -m py_compile server.py aggregator.py config.py jobspy_linkedin_scrape.py jobfeed/*.py

# git
git status --short
git log --oneline --decorate -5
```
