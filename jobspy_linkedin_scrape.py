#!/usr/bin/env python3
"""Scrape LinkedIn jobs with JobSpy and push them into the 9099 aggregator.

This replaces the Playwright/browser LinkedIn scrape path. JobSpy uses HTTP
requests, so it does not need a browser session, xvfb, or human login.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import requests
from jobspy import scrape_jobs

DEFAULT_SEARCHES = [
    "IT Operations Manager",
    "Project OR Programme Manager Infrastructure OR Operations Director Contract OR Part Time",
    "Infrastructure Project Manager OR Programme Manager IT Operations",
]
DEFAULT_OUTPUT = Path("/opt/pi.dev/linkedin-feed/jobs_cache.json")
DEFAULT_PUSH_URL = "http://localhost:9099/api/cache/push"


def _clean(value: Any) -> str:
    """Return a stable string for values that may be None/NaN/Timestamps."""
    if value is None:
        return ""
    try:
        # pandas.NA / NaN support without hard dependency in this function.
        if value != value:  # noqa: PLR0124 - NaN is not equal to itself
            return ""
    except Exception:
        pass
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value).strip()


def _clean_job_url(url: Any) -> str:
    raw = _clean(url)
    if not raw:
        return ""
    parts = urlsplit(raw)
    # Drop tracking query/fragment and normalize trailing slash.
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc, path, "", ""))


def _salary_text(row: dict[str, Any]) -> str:
    currency = _clean(row.get("currency"))
    interval = _clean(row.get("interval"))
    min_amount = _clean(row.get("min_amount"))
    max_amount = _clean(row.get("max_amount"))
    if not (currency or min_amount or max_amount):
        return ""
    if min_amount and max_amount:
        amount = f"{min_amount}-{max_amount}"
    else:
        amount = min_amount or max_amount
    suffix = f" per {interval}" if interval else ""
    return " ".join(part for part in [currency, amount] if part) + suffix


def normalize_jobspy_row(row: dict[str, Any]) -> dict[str, str]:
    """Map a JobSpy dataframe row to the aggregator LinkedIn cache schema."""
    url = _clean_job_url(row.get("job_url") or row.get("job_url_direct"))
    return {
        "source": "linkedin",
        "source_job_id": _clean(row.get("id")),
        "title": _clean(row.get("title")),
        "company": _clean(row.get("company")),
        "location": _clean(row.get("location")),
        "linkedin_url": url,
        "url": url,
        "posted_date": _clean(row.get("date_posted")),
        "employment_type": _clean(row.get("job_type")),
        "salary": _salary_text(row),
        "description": _clean(row.get("description")),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


def scrape_linkedin(searches: list[str], results_per_search: int, hours_old: int) -> list[dict[str, str]]:
    jobs: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    for search in searches:
        print(f"Searching LinkedIn via JobSpy: {search!r}", flush=True)
        frame = scrape_jobs(
            site_name=["linkedin"],
            search_term=search,
            location="United Kingdom",
            results_wanted=results_per_search,
            hours_old=hours_old,
            country_indeed="UK",
        )
        print(f"  JobSpy returned {len(frame)} rows", flush=True)
        for row in frame.to_dict(orient="records"):
            job = normalize_jobspy_row(row)
            url = job.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            jobs.append(job)

    return jobs


def save_jobs(jobs: list[dict[str, str]], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(jobs, indent=2), encoding="utf-8")
    print(f"Saved {len(jobs)} LinkedIn jobs to {output}", flush=True)


def push_jobs(jobs: list[dict[str, str]], push_url: str) -> None:
    response = requests.post(push_url, json=jobs, timeout=30)
    response.raise_for_status()
    print(f"Pushed to {push_url}: {response.text}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape LinkedIn jobs via JobSpy and push to aggregator")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--push-url", default=DEFAULT_PUSH_URL)
    parser.add_argument("--results-per-search", type=int, default=25)
    parser.add_argument("--hours-old", type=int, default=168)
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--search", action="append", help="Override/add search term; may be repeated")
    args = parser.parse_args()

    searches = args.search or DEFAULT_SEARCHES
    jobs = scrape_linkedin(searches, args.results_per_search, args.hours_old)
    save_jobs(jobs, args.output)
    if not args.no_push:
        push_jobs(jobs, args.push_url)


if __name__ == "__main__":
    main()
