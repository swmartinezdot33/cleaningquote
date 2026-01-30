# Vercel Project Setup

## Quick Setup (Recommended - Dashboard)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com
   - Sign in with your GitHub account (same account as your repo)

2. **Create New Project:**
   - Click "Add New Project" or "Import Project"
   - Select your repository: `swmartinezdot33/cleaningquote`
   - Click "Import"

3. **Configure Project:**
   - Vercel will auto-detect Next.js settings (already configured in `vercel.json`)
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at a URL like: `cleaningquote.vercel.app`

## Alternative: CLI Setup

If you prefer using the command line:

```bash
# Login to Vercel (will open browser)
npx vercel login

# Create and deploy project
npx vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? cleaningquote (or press Enter for default)
# - Directory? ./
# - Override settings? No

# For production deployment:
npx vercel --prod
```

## After Deployment

1. **Verify Excel File:**
   - The Excel file should be included automatically since it's in the repo
   - Test the app at your Vercel URL to ensure pricing calculations work

2. **Environment Variables (if needed later):**
   - Go to Project Settings → Environment Variables
   - Add any required variables

3. **Custom domain (production):**
   - Go to Project Settings → Domains
   - Add `www.cleanquote.io` (and optionally `cleanquote.io` with redirect to www)
   - Configure DNS as Vercel instructs
   - In Environment Variables, set **Production**: `NEXT_PUBLIC_APP_URL` = `https://www.cleanquote.io`

## Troubleshooting

- **Excel file not found:** Make sure `data/2026 Pricing.xlsx` is committed to git
- **Build errors:** Check build logs in Vercel dashboard
- **Runtime errors:** Check function logs in Vercel dashboard
