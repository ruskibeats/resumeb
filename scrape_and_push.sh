#!/bin/bash
# Scrape LinkedIn jobs locally → push cache to pi.dev RSS server via API
# Run via: ./scrape_and_push.sh
# Or via cron: 0 */6 * * * <path>/scrape_and_push.sh

set -euo pipefail

PROJECT_DIR="/Users/russellbatchelor/projects/linkedin_scraper"
FEED_DIR="/Users/russellbatchelor/projects/Russell Batchelor CV/pi.dev/linkedin-feed"
PUSH_URL="http://192.168.0.178:9099/api/cache/push"

echo "=== LinkedIn Feed Sync: $(date) ==="

cd "$PROJECT_DIR"

echo "🔄 Running scraper..."
python3 scrape.py --output "$FEED_DIR/jobs_cache.json" --headless false

echo "📤 Pushing to pi.dev via API..."
curl -s -X POST "$PUSH_URL" \
  -H "Content-Type: application/json" \
  -d @"$FEED_DIR/jobs_cache.json" | python3 -m json.tool

echo "✅ Sync complete at $(date)"
