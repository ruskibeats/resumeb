#!/bin/bash
# deploy.sh — Stop → edit → build → start Reactive Resume cleanly
# Usage: ./deploy.sh

set -euo pipefail

HOST="root@192.168.0.178"
RR_DIR="/opt/reactive-resume"
LOG="/tmp/rr-deploy.log"

echo "[1/5] Stopping service..."
ssh "$HOST" "systemctl stop reactive-resume" >> $LOG 2>&1
sleep 2

echo "[2/5] Checking .env..."
ssh "$HOST" "test -f $RR_DIR/.env && echo 'OK: .env found' || echo 'WARN: no .env'"

echo "[3/5] Building..."
ssh "$HOST" "cd $RR_DIR && rm -rf .output && npm run build" >> $LOG 2>&1 \
  && echo "      Build succeeded" \
  || { echo "      Build FAILED"; tail -10 $LOG; exit 1; }

echo "[4/5] Starting service..."
ssh "$HOST" "systemctl start reactive-resume"
sleep 5

echo "[5/5] Health check..."
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://192.168.0.178:3000/" --connect-timeout 5 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "      ✅ HTTP 200 — Reactive Resume is up"
    echo ""
    echo "=== Deploy complete ==="
    exit 0
  fi
  echo "      Waiting... ($STATUS)"
  sleep 3
done

echo "      ❌ Failed to start after 5 attempts"
journalctl -u reactive-resume --no-pager -n 15 | ssh "$HOST" "cat > /tmp/rr-crash.log" 2>/dev/null
echo "      Check: $RR_DIR/.output and tail /tmp/rr-crash.log"
exit 1
