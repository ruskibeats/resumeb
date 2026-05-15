#!/usr/bin/env python3
"""
LinkedIn Job Scraper → RSS Feed Cache

Scrapes LinkedIn for jobs matching configured searches and saves results
as a JSON cache. The HTTP server serves this cache as RSS XML.

Run manually:   python3 scrape.py
Run via cron:   */6 * * * * cd /opt/pi.dev/linkedin-feed && python3 scrape.py
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add the linkedin-feed directory to path
sys.path.insert(0, str(Path(__file__).parent))

from linkedin_scraper import BrowserManager, JobSearchScraper

# Configuration
SESSION_FILE = Path(__file__).parent / "session.json"
CACHE_FILE = Path(__file__).parent / "jobs_cache.json"
HEADLESS = True  # LinkedIn may block headless; set to False if issues

# Search configurations
SEARCHES = [
    {
        "keywords": "IT Operations Manager",
        "location": "United Kingdom",
        "limit": 20,
        "max_pages": 5,
    },
    {
        "keywords": "Project OR Programme Manager Infrastructure OR Operations Director Contract OR Part Time",
        "location": "United Kingdom",
        "limit": 20,
        "max_pages": 5,
    },
]


def load_cache() -> list:
    """Load existing job cache."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            return json.load(f)
    return []


def save_cache(jobs: list):
    """Save jobs to cache file."""
    with open(CACHE_FILE, "w") as f:
        json.dump(jobs, f, indent=2, default=str)
    print(f"💾 Saved {len(jobs)} jobs to cache")


def deduplicate(jobs: list) -> list:
    """Remove duplicate jobs by URL."""
    seen = set()
    unique = []
    for job in jobs:
        key = job.get("linkedin_url", "")
        if key and key not in seen:
            seen.add(key)
            unique.append(job)
    return unique


async def scrape_search(browser, search_config: dict) -> list:
    """Run a single job search and return results."""
    scraper = JobSearchScraper(browser.page)
    keywords = search_config["keywords"]
    location = search_config["location"]
    limit = search_config.get("limit", 20)
    max_pages = search_config.get("max_pages", 5)

    print(f"\n🔍 Searching: {keywords} in {location}")

    try:
        job_urls = await scraper.search(
            keywords=keywords,
            location=location,
            limit=limit,
            max_pages=max_pages,
        )

        if not job_urls:
            print(f"  ⚠️  No jobs found")
            return []

        print(f"  ✅ Found {len(job_urls)} job URLs")

        # Scrape details for each job
        from linkedin_scraper import JobScraper

        job_scraper = JobScraper(browser.page)
        results = []

        for i, url in enumerate(job_urls[:limit]):
            try:
                job = await job_scraper.scrape(url)
                results.append(
                    {
                        "title": job.job_title or "",
                        "company": job.company or "",
                        "location": job.location or "",
                        "linkedin_url": job.linkedin_url,
                        "posted_date": job.posted_date or "",
                        "employment_type": job.employment_type or "",
                        "salary": job.salary or "",
                        "applicant_count": job.applicant_count or "",
                        "description": job.job_description or "",
                        "scraped_at": datetime.utcnow().isoformat(),
                    }
                )
                print(f"  ✓ {i+1}/{len(job_urls)}: {job.job_title[:50]} @ {job.company[:30]}")
            except Exception as e:
                print(f"  ✗ {i+1}/{len(job_urls)}: scrape failed - {type(e).__name__}")

        return results

    except Exception as e:
        print(f"  ❌ Search failed: {type(e).__name__}: {e}")
        return []


async def main():
    print("=" * 60)
    print(f"LinkedIn Job Scraper — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    if not SESSION_FILE.exists():
        print(f"❌ Session file not found: {SESSION_FILE}")
        print("   Copy session.json from the original linkedin_scraper project")
        sys.exit(1)

    print(f"📂 Session: {SESSION_FILE}")
    print(f"📂 Cache:   {CACHE_FILE}")

    # Load existing cache
    existing_jobs = load_cache()
    print(f"📊 Existing cache: {len(existing_jobs)} jobs")

    async with BrowserManager(headless=HEADLESS) as browser:
        # Load LinkedIn session
        await browser.load_session(str(SESSION_FILE))
        print("✅ Session loaded")

        # Run all searches
        all_new_jobs = []
        for search in SEARCHES:
            jobs = await scrape_search(browser, search)
            all_new_jobs.extend(jobs)

    # Merge with existing cache (deduplicate by URL)
    merged = deduplicate(existing_jobs + all_new_jobs)
    print(f"\n📊 Total after merge: {len(merged)} jobs ({len(all_new_jobs)} new)")

    # Save cache
    save_cache(merged)
    print("✅ Done")


if __name__ == "__main__":
    asyncio.run(main())
