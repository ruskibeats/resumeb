#!/bin/bash
# Wrapper to run LinkedIn scraper with xvfb on pi.dev
# Called by systemd timer

cd /opt/pi.dev/linkedin-feed
xvfb-run python3 /opt/pi.dev/linkedin-feed/scrape.py --output /opt/pi.dev/linkedin-feed/jobs_cache.json 2>&1
echo "Scrape complete at $(date)"
