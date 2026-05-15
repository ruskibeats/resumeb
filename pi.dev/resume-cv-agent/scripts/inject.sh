#!/bin/bash
# Inject a CV JSON file into Reactive Resume
# Usage: ./inject.sh <path-to-json>

set -euo pipefail

API_KEY="${REACTIVE_RESUME_API_KEY:-}"
BASE_URL="http://192.168.0.178:3000/api/openapi"

if [ -z "$API_KEY" ]; then
  echo "Missing REACTIVE_RESUME_API_KEY"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-json>"
  echo "Example: $0 /opt/pi.dev/cvs/CV_FINAL.json"
  exit 1
fi

JSON_FILE="$1"

if [ ! -f "$JSON_FILE" ]; then
  echo "❌ File not found: $JSON_FILE"
  exit 1
fi

echo "📄 Injecting: $JSON_FILE"
RESULT=$(curl -s -w "\n%{http_code}" "$BASE_URL/resumes/import" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json
with open('$JSON_FILE') as f:
    data = json.load(f)
print(json.dumps({'data': data}))
")")

HTTP_CODE=$(echo "$RESULT" | tail -1)
RESPONSE=$(echo "$RESULT" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  RESUME_ID=$(echo "$RESPONSE" | tr -d '"')
  echo "✅ Injected! Resume ID: $RESUME_ID"
  echo "🔗 http://192.168.0.178:3000/builder/$RESUME_ID"
else
  echo "❌ Failed (HTTP $HTTP_CODE): $RESPONSE"
  exit 1
fi
