#!/usr/bin/env bash
# Run the appointment E2E in local dev: create a quote via API, then run Playwright.
#
# Prereqs: GHL (token, location, calendars) and pricing in KV. Run from project root.
#
# Usage:
#   ./scripts/test-appointment-e2e-local.sh
#   PLAYWRIGHT_BASE_URL=http://localhost:3001 ./scripts/test-appointment-e2e-local.sh
#
set -e

BASE="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"

# Resolve port: try 3000, then 3001 if 3000 redirects to /login or doesn't return JSON
if [[ "$BASE" == "http://localhost:3000" ]]; then
  FS=$(curl -s --connect-timeout 2 -w "%{http_code}" -o /tmp/fs.json "http://localhost:3000/api/form-settings" 2>/dev/null || true)
  if [[ "$FS" != "200" ]] || ! grep -q "formSettings" /tmp/fs.json 2>/dev/null; then
    FS1=$(curl -s --connect-timeout 2 -w "%{http_code}" -o /tmp/fs.json "http://localhost:3001/api/form-settings" 2>/dev/null || true)
    if [[ "$FS1" == "200" ]] && grep -q "formSettings" /tmp/fs.json 2>/dev/null; then
      BASE="http://localhost:3001"
    fi
  fi
fi

echo "Using base: $BASE"

# 1) Dev server (must return JSON from form-settings)
FS_BODY=$(curl -sf --connect-timeout 3 "$BASE/api/form-settings" 2>/dev/null) || true
if [[ -z "$FS_BODY" ]] || ! echo "$FS_BODY" | grep -q "formSettings"; then
  echo "Dev server at $BASE not returning JSON (or not running). Run: npm run dev"
  exit 1
fi

# 2) Create quote (minimal valid payload)
QUOTE_JSON=$(curl -sf -X POST "$BASE/api/quote" -H "Content-Type: application/json" -d '{
  "firstName": "E2E",
  "lastName": "Test",
  "email": "e2e-test@example.com",
  "phone": "+15555551234",
  "serviceType": "general",
  "frequency": "bi-weekly",
  "squareFeet": "2000",
  "bedrooms": 3,
  "fullBaths": 2,
  "halfBaths": 0,
  "people": 2,
  "pets": 0,
  "sheddingPets": 0,
  "condition": "average",
  "hasPreviousService": "false",
  "cleanedWithin3Months": "no"
}' 2>/dev/null) || true

if [[ -z "$QUOTE_JSON" ]]; then
  echo "Quote API request failed (no response). Check dev server and /api/quote."
  exit 1
fi

QUOTE_ID=$(echo "$QUOTE_JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    q = d.get('quoteId') or d.get('quoteID')
    if q:
        print(q)
    else:
        print('', file=sys.stderr)
        print('Quote API did not return quoteId.', file=sys.stderr)
        if d.get('outOfLimits'):
            print('outOfLimits:', d.get('message',''), file=sys.stderr)
        if d.get('error'):
            print('error:', d.get('error'), file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('', file=sys.stderr)
    print('Parse error:', e, file=sys.stderr)
    sys.exit(1)
" 2>/dev/null) || {
  echo "Quote creation failed. Response:"
  echo "$QUOTE_JSON" | python3 -m json.tool 2>/dev/null || echo "$QUOTE_JSON"
  exit 1
}

echo "Created quote: $QUOTE_ID"

# 3) Run Playwright (reuse existing dev server)
# ALLOW_GHL_CONFIG_ERROR=1: pass when UI flow works but GHL returns 403 (token/location); use a
# proper GHL token+location to test full success.
export PLAYWRIGHT_BASE_URL="$BASE"
export PLAYWRIGHT_REUSE_SERVER=1
export TEST_QUOTE_ID="$QUOTE_ID"
export ALLOW_GHL_CONFIG_ERROR="${ALLOW_GHL_CONFIG_ERROR:-1}"
npx playwright test e2e/appointment-from-ui.spec.ts --reporter=list
