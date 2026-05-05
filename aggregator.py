"""
aggregator.py — Periodic background aggregation job.
Merges LinkedIn cache, manual jobs, and JobServe RSS; scores, deduplicates, and persists.
"""
from __future__ import annotations
import asyncio
import json
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any

import httpx

from jobfeed.models import Job, utc_now_iso
from jobfeed.scorer import calculate_job_score, add_scoring_metadata, load_master_career_data, _master_cache
from jobfeed.jobserve import fetch_jobserve_rss_async, parse_jobserve_rss
from jobfeed.repository import atomic_write_rows
import config


# In-memory cache
_aggregated_mtime: float = 0.0
_aggregated_data: list[dict[str, Any]] = []


def _load_json(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = path.read_text(encoding="utf-8").strip()
    return json.loads(data) if data else []


def _parse_posted_date(date_str: str) -> datetime | None:
    """Parse a posted_date string into a timezone-aware datetime."""
    if not date_str:
        return None
    date_str = date_str.strip()
    # RFC-2822: "Tue, 05 May 2026 10:53:38 GMT"
    try:
        return parsedate_to_datetime(date_str)
    except (ValueError, TypeError):
        pass
    # ISO format: "2026-05-05T10:53:38+00:00"
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        pass
    return None


def _to_job(row: dict[str, Any], source: str, path_name: str) -> Job:
    """Normalise a raw dict into a Job."""
    r = dict(row)
    r.setdefault("source", source)
    r.setdefault("url", r.get("linkedinurl", r.get("url", "")))
    r.setdefault("employment_type", r.get("employment_type", r.get("employmenttype", "")))
    r.setdefault("posted_date", r.get("posted_date", r.get("posteddate", "")))
    r.setdefault("scraped_at", r.get("scraped_at", r.get("scrapedat", "")))
    r.setdefault("raw_description", r.get("raw_description", r.get("description", "")))
    r.setdefault("origin_json_path", path_name)
    return Job.from_row(r)


def dedupe_jobs(jobs: list[Job]) -> list[Job]:
    """Deduplicate by URL then by title+company+location. Keep newest scraped_at."""
    url_idx: dict[str, Job] = {}
    tcl_idx: dict[str, Job] = {}
    for j in jobs:
        key = j.url.strip().lower() if j.url else ""
        if key:
            existing = url_idx.get(key)
            if existing is None or j.scraped_at > existing.scraped_at:
                url_idx[key] = j
            continue
        # fallback
        tcl_key = f"{j.source}::{j.title.strip().lower()}::{j.company.strip().lower()}::{j.location.strip().lower()}"
        existing = tcl_idx.get(tcl_key)
        if existing is None or j.scraped_at > existing.scraped_at:
            tcl_idx[tcl_key] = j
    # merge url-based and fallback sets (prefer url set on overlap)
    result = dict(url_idx)
    for k, v in tcl_idx.items():
        if k not in result:
            result[k] = v
    return list(result.values())


async def aggregate() -> dict[str, Any]:
    """
    Main aggregation routine:
      1. Load jobs_cache.json (linkedin)
      2. Load manual_jobs.json (manual)
      3. Fetch JobServe RSS
      4. Merge + dedupe
      5. Score
      6. Persist aggregated_jobs.json / .csv / feed.rss / aggregator_state.json
    """
    started = datetime.now(timezone.utc)
    counts: dict[str, int] = {}
    now = datetime.now(timezone.utc)
    expiry_days = getattr(config, "DEFAULT_EXPIRY_DAYS", 3)

    # 1. LinkedIn cache
    cache_raw = _load_json(config.JOBS_CACHE_JSON)
    cache_jobs = [_to_job(r, "linkedin", "jobs_cache.json") for r in cache_raw]
    counts["linkedin"] = len(cache_jobs)

    # 2. Manual jobs
    manual_raw = _load_json(config.MANUAL_JOBS_JSON)
    manual_jobs = [_to_job(r, "manual", "manual_jobs.json") for r in manual_raw]
    counts["manual"] = len(manual_jobs)

    # 3. JobServe
    jobserve_jobs: list[Job] = []
    if config.JOBSERVE_RSS_URL:
        xml = await fetch_jobserve_rss_async(config.JOBSERVE_RSS_URL)
        if xml:
            jobserve_jobs = parse_jobserve_rss(xml)
    counts["jobserve"] = len(jobserve_jobs)

    # 4. Merge & dedupe
    merged = cache_jobs + manual_jobs + jobserve_jobs
    deduped = dedupe_jobs(merged)
    counts["deduped"] = len(deduped)

    # 5. Score + expiry
    career_data = load_master_career_data()
    scored_rows: list[dict[str, Any]] = []
    for j in deduped:
        row = j.to_row()
        
        # Generate job_id if missing
        if not row.get("job_id"):
            from jobfeed.models import derive_job_id
            row["job_id"] = derive_job_id(
                row.get("source", ""),
                row.get("source_job_id", ""),
                row.get("url", ""),
                row.get("title", ""),
                row.get("company", ""),
                row.get("location", ""),
            )
        
        # first_seen_at — set on first ingest, never overwritten
        if not row.get("first_seen_at"):
            row["first_seen_at"] = utc_now_iso()
        
        # Protect url — never overwrite an existing url with empty
        if not row.get("url") and row.get("id"):
            pass  # Keep existing url from merge
        
        score = calculate_job_score(row, career_data)
        scored = add_scoring_metadata(row, score)
        scored["score"] = str(scored.get("_score", "0"))
        scored["match_level"] = scored.get("_match_level", "poor")
        scored["enrichment_status"] = "enriched"
        scored["updated_at"] = utc_now_iso()

        # Expiry
        posted_dt = _parse_posted_date(scored.get("posted_date", ""))
        if posted_dt:
            expires_at = posted_dt + timedelta(days=expiry_days)
            scored["expires_at"] = expires_at.isoformat()
            scored["is_expired"] = "true" if now > expires_at else "false"
        else:
            scored["expires_at"] = ""
            scored["is_expired"] = "false"

        scored_rows.append(scored)

    counts["scored"] = len(scored_rows)

    # Sort by score desc, then posted_date desc
    scored_rows.sort(key=lambda r: (int(r.get("_score", "0") or "0"), r.get("posted_date", "")), reverse=True)

    # 6. Persist
    config.AGGREGATED_JOBS_JSON.write_text(
        json.dumps(scored_rows, indent=2), encoding="utf-8")
    atomic_write_rows(config.AGGREGATED_JOBS_CSV, scored_rows)

    # RSS — filter out expired jobs
    from jobfeed.rss_builder import build_jobs_rss
    active_rows = [r for r in scored_rows if r.get("is_expired", "") != "true"]
    rss = build_jobs_rss(
        active_rows,
        feed_url="http://192.168.0.178:9099/feed",
        title="Job Aggregator Feed — UK",
        description="Aggregated LinkedIn, JobServe, and manual job listings",
    )
    config.FEED_RSS.write_text(rss, encoding="utf-8")

    # State
    duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    state = {
        "last_run_iso": started.isoformat(),
        "last_run_success": True,
        "counts": counts,
        "duration_ms": duration_ms,
    }
    config.AGGREGATOR_STATE_JSON.write_text(json.dumps(state, indent=2), encoding="utf-8")

    # Update in-memory cache
    global _aggregated_mtime, _aggregated_data
    _aggregated_data = scored_rows
    _aggregated_mtime = config.AGGREGATED_JOBS_JSON.stat().st_mtime

    return state


def load_aggregated_jobs() -> list[dict[str, Any]]:
    """Load from disk, with in-memory mtime cache."""
    global _aggregated_mtime, _aggregated_data
    if not config.AGGREGATED_JOBS_JSON.exists():
        return []
    mtime = config.AGGREGATED_JOBS_JSON.stat().st_mtime
    if mtime != _aggregated_mtime:
        text = config.AGGREGATED_JOBS_JSON.read_text(encoding="utf-8").strip()
        _aggregated_data = json.loads(text) if text else []
        _aggregated_mtime = mtime
    return list(_aggregated_data)


async def schedule_aggregation() -> None:
    """Background loop: aggregate every AGGREGATION_INTERVAL_SECONDS."""
    while True:
        try:
            await aggregate()
        except Exception as exc:
            # Log to state file
            state = {
                "last_run_iso": datetime.now(timezone.utc).isoformat(),
                "last_run_success": False,
                "error": str(exc),
            }
            config.AGGREGATOR_STATE_JSON.write_text(json.dumps(state, indent=2), encoding="utf-8")
        await asyncio.sleep(config.AGGREGATION_INTERVAL_SECONDS)
