#!/usr/bin/env python3
"""
RSS Feed Server — LinkedIn + JobServe + Manual

FastAPI app with in-process asyncio background aggregation.
"""
from __future__ import annotations
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import re

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

import config
from aggregator import aggregate, schedule_aggregation, load_aggregated_jobs

# ── Pydantic Response Models (for Swagger/OpenAPI docs) ───────────────────

class HealthResponse(BaseModel):
    status: str
    total_jobs: int
    last_aggregated_at: str | None = None
    aggregated_count: int = 0
    jobserve_rss_configured: bool

class StatsCounts(BaseModel):
    linkedin: int = 0
    manual: int = 0
    jobserve: int = 0
    deduped: int = 0
    scored: int = 0

class StatsResponse(BaseModel):
    last_run_iso: str | None = None
    last_run_success: bool | None = None
    counts: StatsCounts | None = None
    duration_ms: int | None = None
    error: str | None = None

class PushResponse(BaseModel):
    status: str
    queued: bool
    count: int

class ManualJobResponse(BaseModel):
    status: str
    message: str
    total_manual: int

class CachePushError(BaseModel):
    error: str

class ManualJobError(BaseModel):
    error: str

class CareerEvidenceCard(BaseModel):
    title: str
    category: str
    keywords: list[str]

class CareerEvidenceResponse(BaseModel):
    cards: list[dict]
    matched: int
    total: int

class MasterDataResponse(BaseModel):
    content: str
    source: str | None

class RootResponse(BaseModel):
    service: str
    version: str
    feeds: dict[str, str]
    management: dict[str, str]
    total_jobs: int
    jobserve_configured: bool

# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Job RSS Feed Server",
    description="""
Aggregates job listings from LinkedIn (via cache push), JobServe (live RSS), and manual entry.
Scores each job against Russell Batchelor's MASTER_CAREER_DATA profile.
Serves scored jobs as RSS feeds (consumed by Reactive Resume) and JSON APIs.

## Sources
- **LinkedIn**: Scraped headlessly on Mac M4 Pro, pushed via `POST /api/cache/push`
- **JobServe**: Fetched live on each aggregation cycle
- **Manual**: Added via `POST /api/jobs/manual`
    """,
    version="3.0.0",
    contact={
        "name": "Russell Batchelor",
        "url": "https://raspberrypi.zebra-sailfin.ts.net",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Tags ──────────────────────────────────────────────────────────────────

FEEDS_TAG = "RSS Feeds"
JOBS_TAG = "Jobs API"
INGEST_TAG = "Ingestion"
SYSTEM_TAG = "System"
HEALTH_TAG = "Health & Monitoring"
LEGACY_TAG = "Legacy"


# ── Startup ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Run initial aggregation and start the background scheduling loop."""
    try:
        await aggregate()
    except Exception as exc:
        print(f"[startup] initial aggregate failed: {exc}")
    asyncio.create_task(schedule_aggregation())


# ── Helpers ────────────────────────────────────────────────────────────────

def _load_json(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = path.read_text(encoding="utf-8").strip()
    return json.loads(data) if data else []


def _save_json(path: Path, data: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


# ── RSS Feeds ──────────────────────────────────────────────────────────────

@app.get(
    "/feed",
    tags=[FEEDS_TAG],
    summary="Aggregated jobs RSS feed",
    response_description="RSS 2.0 XML with scored jobs",
    responses={200: {"content": {"application/rss+xml": {}}}},
)
@app.get(
    "/feed.rss",
    tags=[FEEDS_TAG],
    summary="Aggregated jobs RSS feed (alias)",
    response_description="RSS 2.0 XML with scored jobs",
    include_in_schema=False,
)
async def get_feed(
    q: str = Query("", description="Filter jobs by keyword (matches title, company, and description text)"),
):
    """
    Return aggregated LinkedIn + JobServe + Manual jobs as RSS 2.0 XML.

    Each item includes score prefixes in titles:
    - `[80+]` — Target match
    - `[60-79]` — Good match
    - `[40-59]` — Possible match
    - `[<40]` — Poor match

    Custom `<rr:*>` metadata elements are included per item:
    - `<rr:score>` — Numeric score 0-100
    - `<rr:match_level>` — target/good/maybe/poor
    - `<rr:source>` — linkedin/jobserve/manual
    - `<rr:enrichment_status>` — enriched/raw
    """
    jobs = load_aggregated_jobs()
    if q:
        ql = q.lower()
        jobs = [
            j for j in jobs
            if ql in (j.get("title", "") + j.get("company", "") + j.get("description", "")).lower()
        ]
    from jobfeed.rss_builder import build_jobs_rss
    rss = build_jobs_rss(
        jobs,
        feed_url="http://192.168.0.178:9099/feed",
        title="Job Aggregator Feed — UK",
        description="Aggregated LinkedIn, JobServe, and manual job listings",
    )
    return Response(content=rss, media_type="application/rss+xml")


@app.get(
    "/feed/jobserve",
    tags=[FEEDS_TAG, LEGACY_TAG],
    summary="Legacy JobServe feed (redirects to main feed)",
    response_description="RSS 2.0 XML (same as /feed)",
)
async def get_jobserve_feed():
    """
    Legacy endpoint — previously proxied JobServe RSS raw.

    Now returns the same aggregated/scored feed as `/feed`.
    Maintained for backward compatibility with Reactive Resume configuration.
    """
    return await get_feed(q="")


# ── Cache Push (from Mac scraper) ──────────────────────────────────────────

@app.post(
    "/api/cache/push",
    tags=[INGEST_TAG],
    summary="Push LinkedIn scraped jobs",
    response_description="Push acknowledgement",
    responses={
        200: {"model": PushResponse},
        400: {"model": CachePushError, "description": "Body must be a JSON array"},
        401: {"model": CachePushError, "description": "Invalid or missing API key"},
    },
)
async def push_cache(request: Request):
    """
    Accept a LinkedIn job cache push from the local Mac M4 Pro scraper.

    - Receives a JSON array of job objects (same format as `jobs_cache.json`)
    - Saves to `jobs_cache.json`
    - Triggers background aggregation (fire-and-forget)
    - Optional Bearer token auth via `PUSH_API_KEY` env var
    """
    if config.PUSH_API_KEY:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {config.PUSH_API_KEY}":
            return JSONResponse({"error": "unauthorized"}, status_code=401)

    body = await request.json()
    if not isinstance(body, list):
        return JSONResponse({"error": "body must be a JSON array"}, status_code=400)

    _save_json(config.JOBS_CACHE_JSON, body)
    asyncio.create_task(aggregate())
    return {"status": "ok", "queued": True, "count": len(body)}


# ── Manual Job Add ─────────────────────────────────────────────────────────

@app.post(
    "/api/jobs/manual",
    tags=[INGEST_TAG],
    summary="Add a single job manually",
    response_description="Job add acknowledgement",
    responses={
        200: {"model": ManualJobResponse},
        400: {"model": ManualJobError, "description": "Body must be a JSON object"},
    },
)
async def add_manual_job(request: Request):
    """
    Add a single job from any source (LinkedIn, YunoJuno, direct application, etc.).

    **Request body fields:**
    - `title` (required): Job title
    - `company`: Company name (default: "Manual Entry")
    - `location`: Job location
    - `url`: Link to original posting
    - `employment_type`: e.g. "Contract", "Permanent"
    - `salary`: Salary or rate
    - `description`: Full job description text
    - `posted_date`: Date string (default: "1 day ago")

    Duplicate URLs are automatically detected and rejected.
    Triggers background aggregation.
    """
    body = await request.json()
    if not isinstance(body, dict):
        return JSONResponse({"error": "body must be a JSON object"}, status_code=400)

    new_job = {
        "title": body.get("title", "Unknown Position"),
        "company": body.get("company", "Manual Entry"),
        "location": body.get("location", ""),
        "url": body.get("url", body.get("linkedin_url", "")),
        "posted_date": body.get("posted_date", "1 day ago"),
        "employment_type": body.get("employment_type", ""),
        "salary": body.get("salary", ""),
        "description": body.get("description", ""),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "manual": True,
    }

    manual = _load_json(config.MANUAL_JOBS_JSON)
    urls = {j.get("url", "") for j in manual}
    if new_job["url"] and new_job["url"] in urls:
        return {"status": "ok", "message": "Job already exists (duplicate URL)"}

    manual.insert(0, new_job)
    _save_json(config.MANUAL_JOBS_JSON, manual)
    asyncio.create_task(aggregate())
    return {"status": "ok", "message": "Job added", "total_manual": len(manual)}


# ── JSON API ───────────────────────────────────────────────────────────────

@app.get(
    "/api/jobs",
    tags=[JOBS_TAG],
    summary="List scored jobs",
    response_description="Array of scored job objects",
)
async def get_jobs(
    q: str = Query("", description="Keyword filter (searches title, company, and description)"),
    source: str = Query("", description="Filter by source: `linkedin`, `jobserve`, or `manual`"),
    min_score: int = Query(0, description="Minimum score threshold (0-100)"),
    limit: int = Query(50, description="Maximum number of results to return (1-200)", ge=1, le=200),
    exclude_expired: bool = Query(True, description="Exclude jobs past their expiry date"),
):
    """
    Return aggregated jobs as a JSON array, with optional filtering.

    Each job object includes both `score`/`match_level` (CSV column names)
    and `_score`/`_match_level` (native types) for backward compatibility.
    """
    jobs = load_aggregated_jobs()
    if q:
        ql = q.lower()
        jobs = [j for j in jobs if ql in (j.get("title", "") + j.get("company", "") + j.get("description", "")).lower()]
    if source:
        jobs = [j for j in jobs if j.get("source", "") == source]
    if min_score:
        jobs = [j for j in jobs if int(j.get("_score", "0") or "0") >= min_score]
    if exclude_expired:
        jobs = [j for j in jobs if not j.get("is_expired", False)]
    return jobs[:limit]


@app.get(
    "/api/jobs/by-id",
    tags=[JOBS_TAG],
    summary="Get a single job by ID",
    response_description="Job snapshot or 404",
)
async def get_job_by_id(job_id: str = Query(..., description="The job's unique job_id")):
    """Return a single job snapshot by its unique job_id or source_job_id."""
    jobs = load_aggregated_jobs()
    for job in jobs:
        if job.get("job_id") == job_id or job.get("source_job_id") == job_id:
            return job
    return JSONResponse({"error": "Job not found"}, status_code=404)

@app.get(
    "/api/jobs/top",
    tags=[JOBS_TAG],
    summary="Top scored jobs",
    response_description="Array of top scored job objects",
)
async def get_top_jobs(
    limit: int = Query(10, description="Number of top matches to return (1-50)", ge=1, le=50),
):
    """
    Return the highest-scored jobs, sorted by `_score` descending.

    Useful for quickly identifying the best matches against Russell's career profile
    without needing to review all 80+ jobs.
    """
    jobs = load_aggregated_jobs()
    jobs.sort(key=lambda x: int(x.get("_score", "0") or "0"), reverse=True)
    return jobs[:limit]


# ── Search API (SearchResponse format for Reactive Resume) ──────────────────

def _parse_salary(salary_text: str) -> dict:
    """Parse a salary string into JobResult salary fields."""
    result = {
        "job_min_salary": None,
        "job_max_salary": None,
        "job_salary_currency": None,
        "job_salary_period": None,
    }
    if not salary_text:
        return result

    # Try GBP format: £XXX - £XXX per day/hour/year
    amounts = [float(m.replace(",", "")) for m in re.findall(r"£\s*([\d,]+(?:\.\d+)?)", salary_text)]
    if not amounts:
        # Try numeric-only format like "450.00 Daily - 500.00 Daily"
        amounts = [float(m) for m in re.findall(r"([\d]+(?:\.\d+)?)\s*(?:Daily|Weekly|Monthly|Yearly|Annual)", salary_text, re.IGNORECASE)]
    if not amounts:
        return result

    # Determine period
    period = None
    if re.search(r"\b(?:day|daily|per day|p[./]?d)\b", salary_text, re.IGNORECASE):
        period = "DAY"
    elif re.search(r"\b(?:hour|hourly|per hour|p[./]?h)\b", salary_text, re.IGNORECASE):
        period = "HOUR"
    elif re.search(r"\b(?:week|weekly|per week|p[./]?w)\b", salary_text, re.IGNORECASE):
        period = "WEEK"
    elif re.search(r"\b(?:month|monthly|per month|p[./]?m)\b", salary_text, re.IGNORECASE):
        period = "MONTH"
    elif re.search(r"\b(?:year|yearly|annual|per annum|p[./]?a|per year)\b", salary_text, re.IGNORECASE):
        period = "YEAR"

    is_up_to = bool(re.search(r"\bup to\b", salary_text, re.IGNORECASE))

    if len(amounts) >= 2 and not is_up_to:
        result["job_min_salary"] = amounts[0]
        result["job_max_salary"] = amounts[1]
    elif is_up_to:
        result["job_min_salary"] = None
        result["job_max_salary"] = amounts[-1]
    else:
        result["job_min_salary"] = None
        result["job_max_salary"] = amounts[0]

    result["job_salary_currency"] = "GBP"
    result["job_salary_period"] = period
    return result


def _parse_posted_date_ts(date_str: str) -> tuple[int | None, str]:
    """Parse a posted_date string into timestamp and ISO string."""
    if not date_str:
        return None, ""

    # RFC-2822: "Tue, 05 May 2026 09:09:29 GMT"
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_str)
        return int(dt.timestamp()), dt.isoformat()
    except (ValueError, TypeError, OverflowError):
        pass

    # ISO format
    try:
        dt = datetime.fromisoformat(date_str)
        return int(dt.timestamp()), dt.isoformat()
    except (ValueError, TypeError):
        pass

    # Relative: "2 days ago", "Today", "Yesterday"
    ds = date_str.strip().lower()
    now = datetime.now(timezone.utc)
    if ds in ("today", "1 day ago"):
        ts = int(now.timestamp())
        return ts, now.isoformat()
    if ds == "yesterday":
        dt = now - __import__("datetime").timedelta(days=1)
        return int(dt.timestamp()), dt.isoformat()

    m = re.match(r"(\d+)\s+(day|week|month|year)s?\s+ago", ds)
    if m:
        n = int(m.group(1))
        unit = m.group(2)
        if unit == "day":
            dt = now - __import__("datetime").timedelta(days=n)
        elif unit == "week":
            dt = now - __import__("datetime").timedelta(weeks=n)
        elif unit == "month":
            dt = now - __import__("datetime").timedelta(days=n * 30)
        elif unit == "year":
            dt = now - __import__("datetime").timedelta(days=n * 365)
        else:
            return None, ""
        return int(dt.timestamp()), dt.isoformat()

    return None, ""


def _is_remote(location: str, description: str) -> bool:
    text = f"{location} {description}".lower()
    return bool(re.search(r"\b(?:remote|hybrid|work from home|wfh|fully remote)\b", text))


def _to_job_result(row: dict) -> dict:
    """Map an aggregated job row to JobResult format matching the Zod schema."""
    salary = _parse_salary(row.get("salary", "") or "")
    timestamp, iso = _parse_posted_date_ts(row.get("posted_date", "") or "")

    # Employer: for jobserve try advertiser from raw_description
    employer = row.get("company", "") or ""
    if not employer or employer == "JobServe":
        raw = row.get("raw_description", "") or ""
        # Extract from HTML table: <td><strong>Advertiser:</strong></td><td>...</td><td>Octopus Computer Associates</td>
        m = re.search(r"Advertiser:</strong></td><td[^>]*>.*?</td><td[^>]*>([^<]+)</td>", raw, re.IGNORECASE)
        if m:
            employer = m.group(1).strip()
        # Fallback: simple pattern
        if not employer or employer == "JobServe":
            m = re.search(r"Advertiser[^:]*:\s*(.+?)(?:<|$)", raw)
            if m:
                employer = m.group(1).strip()
    if not employer:
        employer = "JobServe"

    # Score
    score_val = None
    score_raw = row.get("_score", row.get("score", ""))
    if score_raw:
        try:
            score_val = int(float(str(score_raw)))
        except (ValueError, TypeError):
            pass

    # Highlights from remaining enriched fields
    highlights = {}
    for h_key in ("first_seen_at", "approved", "rejected", "notes", "updated_at",
                   "match_level", "enrichment_status", "scraped_at",
                   "source_job_id", "origin_json_path", "manual", "id"):
        val = row.get(h_key, "")
        if val:
            highlights[h_key] = [str(val)]

    # Employment type normalization
    emp_type = (row.get("employment_type", "") or "").strip().upper()
    if emp_type in ("CONTRACT", "CONTRACTOR"):
        emp_type = "CONTRACTOR"
    elif emp_type in ("FULL TIME", "FULL-TIME", "FULLTIME"):
        emp_type = "FULLTIME"
    elif emp_type in ("PART TIME", "PART-TIME", "PARTTIME"):
        emp_type = "PARTTIME"

    location = (row.get("location", "") or "").strip()

    return {
        "job_id": row.get("job_id", ""),
        "job_title": row.get("title", ""),
        "employer_name": employer,
        "employer_logo": None,
        "employer_website": None,
        "employer_company_type": None,
        "employer_linkedin": None,
        "job_publisher": row.get("source", ""),
        "job_employment_type": emp_type if emp_type else "",
        "job_apply_link": row.get("url", "") or "",
        "job_apply_is_direct": True,
        "job_apply_quality_score": score_val,
        "job_description": row.get("description", "") or "",
        "job_is_remote": _is_remote(location, row.get("description", "") or ""),
        "job_city": location,
        "job_state": "",
        "job_country": "GB",
        "job_latitude": None,
        "job_longitude": None,
        "job_posted_at_timestamp": timestamp,
        "job_posted_at_datetime_utc": iso,
        "job_offer_expiration_datetime_utc": row.get("expires_at", "") or None,
        "job_offer_expiration_timestamp": None,
        "job_min_salary": salary["job_min_salary"],
        "job_max_salary": salary["job_max_salary"],
        "job_salary_currency": salary["job_salary_currency"],
        "job_salary_period": salary["job_salary_period"],
        "job_benefits": None,
        "job_google_link": None,
        "job_required_experience": {
            "no_experience_required": False,
            "required_experience_in_months": None,
            "experience_mentioned": False,
            "experience_preferred": False,
        },
        "job_required_skills": None,
        "job_required_education": {
            "postgraduate_degree": False,
            "professional_certification": False,
            "high_school": False,
            "associates_degree": False,
            "bachelors_degree": False,
            "degree_mentioned": False,
            "degree_preferred": False,
            "professional_certification_mentioned": False,
        },
        "job_experience_in_place_of_education": None,
        "job_highlights": highlights if highlights else None,
        "job_posting_language": None,
        "job_onet_soc": None,
        "job_onet_job_zone": None,
        "job_occupational_categories": None,
        "job_naics_code": None,
        "job_naics_name": None,
        "apply_options": [
            {
                "publisher": row.get("source", ""),
                "apply_link": row.get("url", "") or "",
                "is_direct": True,
            }
        ],
    }


@app.get(
    "/api/jobs/search",
    tags=[JOBS_TAG],
    summary="Search jobs in SearchResponse format",
    response_description="Jobs in SearchResponse format matching Reactive Resume's Zod schema",
)
async def search_jobs(
    query: str = Query("", description="Keyword search filter"),
    page: int = Query(1, description="Page number", ge=1),
    num_pages: int = Query(1, ge=1, le=10, description="Number of 10-result pages"),
):
    """
    Return jobs in the exact SearchResponse shape expected by Reactive Resume's searchResponseSchema.

    Each result maps all 26 aggregated CSV fields to JobResult fields:
    - Score -> job_apply_quality_score
    - Company -> employer_name (actual company extracted from raw data)
    - Salary -> parsed min/max/currency/period
    - Location -> job_city + job_is_remote detection
    - Source -> job_publisher
    - Expiry -> job_offer_expiration_datetime_utc
    - Remaining enriched fields -> job_highlights

    This bypasses the lossy RSS pipeline, giving job cards direct access to ALL enriched fields.
    """
    jobs = load_aggregated_jobs()

    # Filter by query
    if query:
        ql = query.lower()
        jobs = [
            j for j in jobs
            if ql in (j.get("title", "") + " " + j.get("company", "") + " " + j.get("description", "")).lower()
        ]

    # Exclude expired
    jobs = [j for j in jobs if not j.get("is_expired", "") == "true"]

    # Map to JobResult format
    results = [_to_job_result(j) for j in jobs]

    # Pagination
    per_page = num_pages * 10
    offset = (page - 1) * per_page
    paginated = results[offset:offset + per_page]

    return {
        "status": "OK",
        "request_id": f"enriched-api-{int(datetime.now(timezone.utc).timestamp())}",
        "parameters": {"query": query, "page": str(page)},
        "data": paginated,
    }


# ── Health & Stats ─────────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=[HEALTH_TAG],
    summary="Service health check",
    response_description="Health status with job counts and last aggregation time",
    response_model=HealthResponse,
)
async def health():
    """
    Lightweight health check endpoint.

    Returns service status, total job count, last aggregation timestamp,
    and whether the JobServe RSS feed is configured.
    Used by monitoring and for verifying the service is running correctly.
    """
    state = {}
    if config.AGGREGATOR_STATE_JSON.exists():
        try:
            state = json.loads(config.AGGREGATOR_STATE_JSON.read_text(encoding="utf-8"))
        except Exception:
            pass
    jobs = load_aggregated_jobs()
    return {
        "status": "ok",
        "total_jobs": len(jobs),
        "last_aggregated_at": state.get("last_run_iso"),
        "aggregated_count": state.get("counts", {}).get("scored", 0),
        "jobserve_rss_configured": bool(config.JOBSERVE_RSS_URL),
    }


@app.get(
    "/stats",
    tags=[HEALTH_TAG],
    summary="Aggregation statistics",
    response_description="Detailed aggregation state with source counts and timing",
    response_model=StatsResponse,
)
async def stats():
    """
    Return detailed aggregation state from the last aggregator run.

    Includes:
    - Timestamp of last run
    - Success/failure status
    - Source counts (LinkedIn, JobServe, Manual)
    - Total deduped and scored counts
    - Duration in milliseconds
    - Error message (if failed)
    """
    state = {}
    if config.AGGREGATOR_STATE_JSON.exists():
        try:
            state = json.loads(config.AGGREGATOR_STATE_JSON.read_text(encoding="utf-8"))
        except Exception:
            pass
    return state


# ── Legacy endpoints kept unchanged ────────────────────────────────────────

@app.get(
    "/api/career-evidence",
    tags=[LEGACY_TAG],
    summary="Career evidence cards",
    response_description="Career evidence cards matched against a query",
)
async def get_career_evidence(
    q: str = Query("", description="Job description text to match career evidence against"),
):
    """
    Return career evidence cards from the JSON file, optionally filtered by keyword matching.

    Cards are scored by how many of their keywords and category/title words match
    the provided query text. Results are sorted by relevance.
    """
    evidence_file = Path(__file__).parent / "career_evidence.json"
    if not evidence_file.exists():
        return {"cards": [], "matched": 0, "total": 0}
    with open(evidence_file) as f:
        cards = json.load(f)
    if not q:
        return {"cards": cards[:6], "matched": len(cards[:6]), "total": len(cards)}
    query_words = set(q.lower().split())
    scored = []
    for card in cards:
        keywords = set(k.lower() for k in card.get("keywords", []))
        score = len(keywords & query_words)
        title_words = set(card["title"].lower().split())
        cat_words = set(card["category"].lower().split())
        score += len(title_words & query_words) * 2
        score += len(cat_words & query_words) * 2
        if score > 0:
            scored.append((score, card))
    scored.sort(key=lambda x: -x[0])
    return {"cards": [s[1] for s in scored], "matched": len(scored), "total": len(cards)}


@app.get(
    "/api/master-data",
    tags=[LEGACY_TAG],
    summary="MASTER_CAREER_DATA content",
    response_description="Raw MASTER_CAREER_DATA.md content",
)
async def get_master_data():
    """
    Return the MASTER_CAREER_DATA.md file content used as the reference for job scoring.

    This is the career profile that the scoring engine compares against when
    calculating job relevance scores.
    """
    md_file = Path("/opt/pi.dev/cvs/MASTER_CAREER_DATA.md")
    if md_file.exists():
        return {"content": md_file.read_text(), "source": str(md_file)}
    return {"content": "MASTER_CAREER_DATA not found", "source": None}


@app.get(
    "/",
    tags=[SYSTEM_TAG],
    summary="Service root",
    response_description="Service information with endpoint overview",
)
async def root():
    """Return service metadata, available feeds, and management endpoints."""
    jobs = load_aggregated_jobs()
    return {
        "service": "Job RSS Feed Server",
        "version": "3.0",
        "feeds": {
            "/feed": "Aggregated jobs RSS (?q=keywords to filter)",
            "/feed/jobserve": "Legacy alias (now merged into /feed)",
        },
        "management": {
            "POST /api/cache/push": "Push LinkedIn job cache (JSON array)",
            "POST /api/jobs/manual": "Add a single job manually",
            "GET /api/jobs": "JSON API with query params",
            "GET /api/jobs/top": "Top scored jobs",
            "GET /health": "Health check",
            "GET /stats": "Aggregation stats",
        },
        "total_jobs": len(jobs),
        "jobserve_configured": bool(config.JOBSERVE_RSS_URL),
    }


# ── Main ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", "9099"))
    print(f"🚀 Job RSS Feed Server v3")
    print(f"   Swagger: http://0.0.0.0:{port}/docs")
    print(f"   Feed:    http://0.0.0.0:{port}/feed")
    print(f"   Health:  http://0.0.0.0:{port}/health")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
