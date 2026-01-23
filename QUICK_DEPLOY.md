# Quick Deployment Guide

**For:** First-time production deployment  
**Time:** 15-30 minutes  
**Prerequisites:** Vercel account, GitHub repository

---

## Step-by-Step Deployment

### 1. Prepare Your Code (5 min)

```bash
# Ensure everything is committed
git status

# Push to GitHub
git add .
git commit -m "Production ready"
git push origin main
```

### 2. Connect to Vercel (5 min)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import your `cleaningquote` repository
5. Vercel auto-detects Next.js settings ✅
6. Click **"Deploy"**

**Wait 2-3 minutes for build to complete**

### 3. Set Up Vercel KV (5 min)

1. In Vercel Dashboard → Your Project → **Storage** tab
2. Click **"Create Database"**
3. Select **"KV (Upstash Redis)"**
4. Name it: `cleaningquote-kv`
5. Select region (same as deployment)
6. Click **"Create"**

✅ Vercel automatically injects KV environment variables

### 4. Configure Environment Variables (5 min)

1. Go to **Settings** → **Environment Variables**
2. Add:

   **Variable:** `ADMIN_PASSWORD`  
   **Value:** `YourStrongPassword123!` (use a strong password)  
   **Environments:** ✅ Production, ✅ Preview, ✅ Development

3. Click **"Save"**

**Optional:** Add `GOOGLE_MAPS_API_KEY` if using Maps

### 5. Redeploy (2 min)

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

**Wait for deployment to complete**

### 6. Initial Setup (5 min)

1. Visit your deployment URL: `https://your-project.vercel.app`
2. Go to `/admin`: `https://your-project.vercel.app/admin`
3. Enter your admin password
4. Upload pricing file:
   - Click **"Upload Pricing"**
   - Select your `2026 Pricing.xlsx` file
   - Click **"Upload"**

### 7. Test (3 min)

- [ ] Visit main page: `/`
- [ ] Test quote calculation
- [ ] Verify admin interface works
- [ ] Check pricing file uploaded successfully

---

## Post-Deployment

### Set Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `quote.yourcompany.com`)
3. Follow DNS instructions
4. Wait for SSL (usually < 5 minutes)

### Configure GHL Integration (If Using)

1. Go to `/admin` → **GHL Settings**
2. Enter GHL API token
3. Enter Location ID
4. Configure pipelines and stages
5. Test connection

---

## Troubleshooting

**Build fails?**
- Check build logs in Vercel Dashboard
- Verify `npm run build` works locally

**Admin password not working?**
- Verify `ADMIN_PASSWORD` is set in Vercel
- Redeploy after adding variable

**KV not working?**
- Verify KV database is connected
- Check environment variables are injected
- Redeploy

**Pricing file not found?**
- Upload via admin interface
- Verify file is in KV storage

---

## Success Checklist

- [ ] Application deployed successfully
- [ ] Build completed without errors
- [ ] Admin interface accessible
- [ ] Pricing file uploaded
- [ ] Quote calculation works
- [ ] Custom domain configured (if applicable)
- [ ] GHL integration configured (if applicable)

---

## Next Steps

1. **Monitor:** Check Vercel Dashboard for errors
2. **Test:** Verify all features work
3. **Document:** Save deployment URL and credentials
4. **Backup:** Ensure code is in Git
5. **Review:** Read `PRODUCTION_READINESS.md` for full checklist

---

## Quick Commands

```bash
# Deploy via CLI (alternative)
npm i -g vercel
vercel login
vercel --prod

# Check logs
vercel logs

# View deployments
vercel ls
```

---

**That's it! Your application is now live.** 🚀

For detailed information, see:
- `PRODUCTION_READINESS.md` - Full production checklist
- `ENVIRONMENT_VARIABLES.md` - Environment variable reference
- `DEPLOYMENT.md` - Detailed deployment guide
