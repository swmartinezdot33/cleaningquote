#!/usr/bin/env bash
# Create a Vercel Blob store and link it to this project (adds BLOB_READ_WRITE_TOKEN to Vercel env).
# Run from repo root. Requires: npx vercel, logged in (npx vercel whoami).
#
# Usage:
#   ./scripts/setup-blob-store.sh
#
# When prompted:
#   1. "Would you like to link this blob store to cleaningquote?" → type Y and Enter
#   2. "Select environments" (Production, Preview, Development) → press Enter (all are already selected)
# Then run: npx vercel env pull .env.local
# Restart your dev server so image upload works in Survey Builder.

set -e
cd "$(dirname "$0")/.."
STORE_NAME="${1:-cleaningquote-survey-images}"
echo "Creating Vercel Blob store: $STORE_NAME"
echo ""
echo "When prompted:"
echo "  1. Link to cleaningquote? → Y + Enter"
echo "  2. Select environments    → Enter (accept all)"
echo ""
npx vercel blob store add "$STORE_NAME"
echo ""
echo "If you linked the store, pull env to .env.local:"
echo "  npx vercel env pull .env.local"
echo "Then restart your dev server."
