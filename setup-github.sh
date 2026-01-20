#!/bin/bash

# Setup script for GitHub and Vercel deployment
# Usage: ./setup-github.sh [repo-name] [visibility]
# Example: ./setup-github.sh cleaningquote public

set -e

REPO_NAME=${1:-"cleaningquote"}
VISIBILITY=${2:-"public"}

echo "🚀 Setting up GitHub repository..."

# Check if already has remote
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' already exists. Skipping remote setup."
    echo "Current remote URL: $(git remote get-url origin)"
else
    # Create GitHub repository
    echo "Creating GitHub repository: $REPO_NAME ($VISIBILITY)..."
    gh repo create "$REPO_NAME" --$VISIBILITY --source=. --remote=origin --push
    
    echo "✅ GitHub repository created and pushed!"
    echo "📍 Repository URL: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
fi

echo ""
echo "📦 Next steps for Vercel:"
echo "1. Go to https://vercel.com"
echo "2. Click 'Add New Project'"
echo "3. Import your GitHub repository: $REPO_NAME"
echo "4. Vercel will auto-detect Next.js settings"
echo "5. Make sure to add your Excel file (data/2026 Pricing.xlsx) before deploying"
echo ""
echo "Or use Vercel CLI:"
echo "  vercel login"
echo "  vercel --prod"
