# Deployment Guide

## GitHub Repository Setup

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `cleaningquote` (or your preferred name)
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

### Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/cleaningquote.git

# Push to GitHub
git push -u origin main
```

If you prefer SSH:
```bash
git remote add origin git@github.com:YOUR_USERNAME/cleaningquote.git
git push -u origin main
```

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your GitHub repository (`cleaningquote`)
5. Vercel will automatically detect Next.js settings
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts. For production deployment:
   ```bash
   vercel --prod
   ```

### Important: Add Excel File to Vercel

Since the Excel file is required for the app to function:

**Option A: Upload via Vercel Dashboard**
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables" or "Files"
3. Upload the Excel file (if supported)

**Option B: Use Vercel CLI**
```bash
# You may need to commit the Excel file to git for this to work
git add data/2026\ Pricing.xlsx
git commit -m "Add pricing data file"
git push
```

**Option C: Use Vercel File System (Recommended)**
The file will be deployed with your codebase if you commit it to git. Make sure:
- The file is at `./data/2026 Pricing.xlsx`
- It's not in `.gitignore`

**Note:** If the file contains sensitive pricing data, consider:
- Using Vercel Environment Variables (not suitable for binary files)
- Using a cloud storage service (S3, Cloudinary) and fetching via API
- Using Vercel's serverless file system during build time

### Environment Variables

If you need any environment variables in the future, add them in:
- Vercel Dashboard → Project Settings → Environment Variables

### Build Settings

Vercel will automatically detect Next.js and use:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

These are already configured in `vercel.json` for clarity.

## Post-Deployment

1. Test your deployment URL
2. Verify the Excel file is accessible at runtime
3. Test the quote calculation functionality
4. Monitor logs in Vercel Dashboard if issues arise

## Troubleshooting

### Excel file not found
- Ensure the file is committed to git (or uploaded via Vercel)
- Check the file path matches exactly: `./data/2026 Pricing.xlsx`
- Verify file permissions

### Build errors
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation passes locally first

### Runtime errors
- Check Vercel function logs
- Verify the Excel file is readable
- Ensure file paths are correct for serverless environment
