#!/usr/bin/env python3
"""
RSS Feed Server — LinkedIn + JobServe

Serves job listings as RSS/XML feeds compatible with Reactive Resume's
JobSearchProvider format.

Endpoints:
  GET /feed                    → LinkedIn jobs (filtered by ?q=)
  GET /feed.rss                → Same as /feed
  GET /feed/jobserve           → JobServe RSS proxy
  GET /health                  → Health check
  POST /api/cache/push         → Accept LinkedIn cache push from local machine

Usage:
  python3 server.py --port 9099
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

import httpx
from fastapi import FastAPI, Query, Request
from fastapi.responses import PlainTextResponse, Response

# --- Configuration ---

CACHE_FILE = Path(__file__).parent / "jobs_cache.json"
HOST = "0.0.0.0"
PORT = 9099

# JobServe RSS URL to proxy (set via env var or /api/config endpoint)
JOBSERVE_RSS_URL = os.environ.get("JOBSERVE_RSS_URL", "")

# Push API key (optional, set to require auth on cache push)
PUSH_API_KEY = os.environ.get("PUSH_API_KEY", "")

FEED_LANGUAGE = "en-gb"

app = FastAPI(title="Job RSS Feed Server", version="2.0.0")


# ─── Data Layer ───────────────────────────────────────────────────────────────

def load_jobs() -> list:
    if not CACHE_FILE.exists():
        return []
    with open(CACHE_FILE) as f:
        return json.load(f)


def save_jobs(jobs: list):
    CACHE_FILE.write_text(json.dumps(jobs, indent=2, default=str))


# ─── RSS Builders ─────────────────────────────────────────────────────────────

def build_linkedin_rss(jobs: list, query: str = "") -> str:
    """Build RSS XML from LinkedIn job cache. Compatible with RR's jobserve-rss provider."""
    now = datetime.now(timezone.utc)

    if query:
        q = query.lower()
        jobs = [
            j for j in jobs
            if q in j.get("title", "").lower()
            or q in j.get("company", "").lower()
            or q in j.get("description", "").lower()
        ]

    items = []
    for job in jobs:
        title = job.get("title", "Unknown Position")
        company = job.get("company", "Unknown Company")
        location = job.get("location", "")
        linkedin_url = job.get("linkedin_url", "")
        salary = job.get("salary", "")
        employment_type = job.get("employment_type", "")
        description = job.get("description", "")

        desc_parts = [f"Location: {location}"] if location else []
        if salary and salary != "None":
            desc_parts.append(f"Rate: {salary}")
        if employment_type:
            desc_parts.append(f"Type: {employment_type}")
        if description:
            desc_parts.append(description[:500])

        description_text = "\n".join(desc_parts)
        pub_date = now.strftime("%a, %d %b %Y %H:%M:%S +0000")

        items.append(f"""    <item>
      <title>{escape(f"{title} — {company}")}</title>
      <link>{escape(linkedin_url)}</link>
      <guid isPermaLink="true">{escape(linkedin_url)}</guid>
      <pubDate>{pub_date}</pubDate>
      <description>{escape(description_text)}</description>
    </item>""")

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LinkedIn Job Search — UK</title>
    <description>LinkedIn job listings for IT, Infrastructure, and Operations roles in the UK</description>
    <link>https://www.linkedin.com/jobs/</link>
    <language>{FEED_LANGUAGE}</language>
    <lastBuildDate>{now.strftime("%a, %d %b %Y %H:%M:%S +0000")}</lastBuildDate>
    <atom:link href="" rel="self" type="application/rss+xml"/>
    <ttl>60</ttl>
{chr(10).join(items)}
  </channel>
</rss>"""


async def fetch_jobserve_rss() -> str | None:
    """Fetch and return raw JobServe RSS XML."""
    if not JOBSERVE_RSS_URL:
        return None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                JOBSERVE_RSS_URL,
                headers={"User-Agent": "Reactive Resume RSS Proxy"},
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.text
    except Exception as e:
        print(f"JobServe RSS fetch failed: {e}")
    return None


# ─── REST API Endpoints ───────────────────────────────────────────────────────

@app.get("/feed", response_class=PlainTextResponse)
@app.get("/feed.rss", response_class=PlainTextResponse)
async def get_linkedin_feed(q: str = Query("", description="Filter by keyword")):
    """LinkedIn jobs as RSS feed."""
    jobs = load_jobs()
    rss = build_linkedin_rss(jobs, query=q)
    return Response(content=rss, media_type="application/rss+xml")


@app.get("/feed/jobserve", response_class=PlainTextResponse)
async def get_jobserve_feed():
    """JobServe RSS proxy — forwards the configured JobServe RSS feed."""
    xml = await fetch_jobserve_rss()
    if xml is None:
        return Response(
            content="<?xml version=\"1.0\"?><rss version=\"2.0\"><channel><title>JobServe RSS</title><description>Not configured. Set JOBSERVE_RSS_URL env var.</description></channel></rss>",
            media_type="application/rss+xml",
            status_code=200,
        )
    return Response(content=xml, media_type="application/rss+xml")


@app.post("/api/cache/push")
async def push_cache(request: Request):
    """Accept a LinkedIn job cache push from the local machine."""
    # Optional auth
    if PUSH_API_KEY:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {PUSH_API_KEY}":
            return {"error": "unauthorized"}, 401

    body = await request.json()
    if not isinstance(body, list):
        return {"error": "body must be a JSON array"}, 400

    save_jobs(body)
    return {"status": "ok", "count": len(body), "cached_at": datetime.now(timezone.utc).isoformat()}


@app.get("/health")
async def health():
    jobs = load_jobs()
    return {
        "status": "ok",
        "linkedin_jobs": len(jobs),
        "jobserve_rss_configured": bool(JOBSERVE_RSS_URL),
        "feeds": {
            "linkedin": "/feed",
            "jobserve": "/feed/jobserve",
        },
    }


@app.get("/stats")
async def stats():
    jobs = load_jobs()
    companies = {}
    for j in jobs:
        c = j.get("company", "Unknown")
        companies[c] = companies.get(c, 0) + 1
    return {
        "total_jobs": len(jobs),
        "unique_companies": len(companies),
        "top_companies": dict(sorted(companies.items(), key=lambda x: -x[1])[:10]),
        "cache_file": str(CACHE_FILE),
    }


@app.get("/")
async def root():
    jobs = load_jobs()
    return {
        "service": "Job RSS Feed Server",
        "version": "2.0",
        "feeds": {
            "/feed": "LinkedIn jobs RSS (?q=keywords to filter)",
            "/feed/jobserve": "JobServe RSS proxy",
        },
        "management": {
            "POST /api/cache/push": "Push LinkedIn job cache (JSON array)",
            "GET /health": "Health check",
            "GET /stats": "Job statistics",
        },
        "linkedin_jobs_cached": len(jobs),
        "jobserve_configured": bool(JOBSERVE_RSS_URL),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", PORT))
    print(f"🚀 Job RSS Feed Server v2")
    print(f"   LinkedIn:  http://{HOST}:{port}/feed")
    print(f"   JobServe:  http://{HOST}:{port}/feed/jobserve")
    print(f"   Push API:  POST http://{HOST}:{port}/api/cache/push")
    print(f"   Health:    http://{HOST}:{port}/health")
    print(f"   Cache:     {CACHE_FILE}")
    print(f"   Jobs:      {len(load_jobs())}")
    print()

    uvicorn.run(app, host=HOST, port=port, log_level="info")
