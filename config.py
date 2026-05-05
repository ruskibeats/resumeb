"""
config.py — env-based configuration for the job aggregator.
"""
from __future__ import annotations
import os
from pathlib import Path

# Paths
DATA_DIR = Path(os.environ.get("DATA_DIR", "/opt/pi.dev/linkedin-feed"))

# External sources
JOBSERVE_RSS_URL = os.environ.get(
    "JOBSERVE_RSS_URL", "https://www.jobserve.com/MySearch/9F0E031F4C5C8AB2.rss")

# Timing
AGGREGATION_INTERVAL_MINUTES = int(os.environ.get("AGGREGATION_INTERVAL_MINUTES", "15"))
AGGREGATION_INTERVAL_SECONDS = AGGREGATION_INTERVAL_MINUTES * 60

# Career data
MASTER_CAREER_FILE = Path(os.environ.get("MASTER_CAREER_FILE", "/opt/pi.dev/cvs/MASTER_CAREER_DATA.md"))

# API security
PUSH_API_KEY = os.environ.get("PUSH_API_KEY", "")

# File paths (resolved under DATA_DIR)
JOBS_CACHE_JSON = DATA_DIR / "jobs_cache.json"
MANUAL_JOBS_JSON = DATA_DIR / "manual_jobs.json"
AGGREGATED_JOBS_JSON = DATA_DIR / "aggregated_jobs.json"
AGGREGATED_JOBS_CSV = DATA_DIR / "aggregated_jobs.csv"
AGGREGATOR_STATE_JSON = DATA_DIR / "aggregator_state.json"
FEED_RSS = DATA_DIR / "feed.rss"
DEFAULT_EXPIRY_DAYS = int(os.environ.get("DEFAULT_EXPIRY_DAYS", "3"))
