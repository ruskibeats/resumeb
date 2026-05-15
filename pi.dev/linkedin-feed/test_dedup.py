#!/usr/bin/env python3
"""Test the deduplicate function with 5-day aging."""
import sys
sys.path.insert(0, '/opt/pi.dev/linkedin-feed')
from scrape import deduplicate

test_jobs = [
    {"linkedin_url": "https://linkedin.com/jobs/1", "posted_date": "3 days ago", "title": "Fresh 3d"},
    {"linkedin_url": "https://linkedin.com/jobs/2", "posted_date": "30+ days ago", "title": "Stale 30d"},
    {"linkedin_url": "https://linkedin.com/jobs/3", "posted_date": "5 hours ago", "title": "Fresh hours"},
    {"linkedin_url": "https://linkedin.com/jobs/4", "posted_date": "2 months ago", "title": "Stale months"},
    {"linkedin_url": "https://linkedin.com/jobs/5", "posted_date": "", "scraped_at": "2026-04-20T12:00:00", "title": "Stale scraped"},
    {"linkedin_url": "https://linkedin.com/jobs/6", "title": "No date kept"},
]

result = deduplicate(test_jobs)
for j in result:
    print(f'  KEPT: {j["title"]}')
print(f"\nTotal: {len(result)} kept out of {len(test_jobs)}")
