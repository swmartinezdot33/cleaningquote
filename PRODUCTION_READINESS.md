# Production Readiness Checklist

**Date**: January 22, 2026  
**Status**: ✅ Ready for Production Deployment

---

## Overview

This document provides a comprehensive checklist for deploying the Cleaning Quote Platform to production. Follow these steps in order to ensure a smooth, secure, and reliable deployment.

---

## Pre-Deployment Checklist

### 1. ✅ Code Quality & Build

- [x] **Build passes without errors**
  ```bash
  npm run build
  ```
  - All TypeScript types are valid
  - No linting errors
  - All API routes properly configured

- [x] **Tests pass**
  ```bash
  npm test
  ```
  - Unit tests: 50+ tests with 85% coverage
  - All critical paths tested

- [x] **Dynamic routes configured**
  - All API routes using `request.headers` have `export const dynamic = 'force-dynamic'`
  - Static routes properly optimized

### 2. Environment Variables

**Required Environment Variables:**

| Variable | Required | Description | Where to Set |
|----------|----------|-------------|--------------|
| `ADMIN_PASSWORD` | ✅ Yes | Admin interface password | Vercel Dashboard |
| `KV_REST_API_URL` | ✅ Yes | Vercel KV REST API URL | Auto-injected by Vercel |
| `KV_REST_API_TOKEN` | ✅ Yes | Vercel KV REST API Token | Auto-injected by Vercel |
| `NODE_ENV` | ✅ Yes | Set to `production` | Auto-set by Vercel |

**Optional Environment Variables:**

| Variable | Required | Description | Where to Set |
|----------|----------|-------------|--------------|
| `GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Maps API key for address autocomplete | Vercel Dashboard (if using Maps) |

**Setting Environment Variables in Vercel:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for **Production**, **Preview**, and **Development** environments
3. Click **Save**
4. **Redeploy** your application for changes to take effect

### 3. Vercel KV (Upstash Redis) Setup

**Step 1: Create KV Database**
1. Go to Vercel Dashboard → Your Project → Storage
2. Click **Create Database**
3. Select **KV (Upstash Redis)**
4. Choose a name (e.g., `cleaningquote-kv`)
5. Select region (recommended: same as your deployment)
6. Click **Create**

**Step 2: Verify Auto-Injection**
- Vercel automatically injects:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`
  - `KV_URL`
  - `REDIS_URL`

**Step 3: Upload Initial Pricing File**
After deployment, upload your pricing file:
```bash
curl -X POST \
  https://your-domain.com/api/admin/upload-pricing \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -F "file=@data/2026 Pricing.xlsx"
```

Or use the admin interface at `/admin` → Upload Pricing

### 4. Security Configuration

**Admin Password:**
- [ ] Set strong `ADMIN_PASSWORD` in Vercel environment variables
- [ ] Use at least 16 characters with mix of letters, numbers, symbols
- [ ] Never commit password to Git
- [ ] Document password in secure password manager

**API Security:**
- [x] All admin routes require `x-admin-password` header
- [x] Error messages don't leak sensitive information in production
- [x] Environment-specific error details (dev vs prod)

**CORS & Headers:**
- [ ] Configure CORS if needed for widget embedding
- [ ] Review security headers in `next.config.js`

### 5. Domain & DNS

**Custom Domain Setup:**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `quote.yourcompany.com`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (usually < 5 minutes)

**DNS Records:**
- Add CNAME record pointing to Vercel
- Or add A record if using apex domain

### 6. Initial Data Setup

**Required Initial Setup:**
- [ ] Upload pricing Excel file via admin interface
- [ ] Configure GHL integration (if using):
  - [ ] Set GHL API token
  - [ ] Set Location ID
  - [ ] Configure pipelines and stages
  - [ ] Configure custom fields mapping
- [ ] Set up service area (if using):
  - [ ] Upload KML file or configure network link
- [ ] Configure widget settings (if using widget embed)

---

## Deployment Steps

### Step 1: Deploy to Vercel

**Option A: Via GitHub (Recommended)**
1. Push code to GitHub repository
2. Vercel automatically deploys on push to `main` branch
3. Monitor deployment in Vercel Dashboard

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### Step 2: Verify Deployment

**Checklist:**
- [ ] Build completed successfully
- [ ] Application accessible at deployment URL
- [ ] Admin interface accessible at `/admin`
- [ ] API endpoints responding correctly
- [ ] No console errors in browser

### Step 3: Post-Deployment Configuration

**Admin Setup:**
1. Navigate to `https://your-domain.com/admin`
2. Enter admin password
3. Upload pricing file
4. Configure GHL integration (if needed)
5. Set up service area (if needed)
6. Configure widget settings (if needed)

**Test Critical Flows:**
- [ ] Quote calculation works
- [ ] Admin authentication works
- [ ] Pricing file upload works
- [ ] GHL integration works (if configured)
- [ ] Calendar booking works (if configured)
- [ ] Service area check works (if configured)

---

## Monitoring & Maintenance

### 1. Monitoring Setup

**Vercel Analytics:**
- [ ] Enable Vercel Analytics (optional)
- [ ] Monitor function execution times
- [ ] Monitor error rates

**Error Tracking:**
- [ ] Set up error monitoring (e.g., Sentry, LogRocket)
- [ ] Configure alerts for critical errors
- [ ] Monitor API response times

**Logs:**
- Monitor Vercel function logs in Dashboard
- Check for:
  - API errors
  - Slow response times
  - Authentication failures
  - External API failures (GHL, Google Maps)

### 2. Performance Monitoring

**Key Metrics to Track:**
- API response times (target: < 500ms)
- Page load times (target: < 2s)
- Error rates (target: < 1%)
- Uptime (target: 99.9%)

**Vercel Dashboard:**
- Function execution times
- Request counts
- Error rates
- Bandwidth usage

### 3. Backup & Recovery

**Data Backup:**
- [ ] Vercel KV automatically backs up data
- [ ] Document backup restoration process
- [ ] Test backup restoration (quarterly)

**Code Backup:**
- [ ] Code is in Git repository
- [ ] Tag releases for easy rollback
- [ ] Document rollback procedure

---

## Security Best Practices

### 1. Password Management

- [ ] Use strong, unique admin password
- [ ] Store password in secure password manager
- [ ] Rotate password quarterly
- [ ] Never share password via insecure channels

### 2. API Security

- [ ] All admin endpoints require authentication
- [ ] Rate limiting (consider adding if needed)
- [ ] Input validation on all endpoints
- [ ] Sanitize user inputs

### 3. Environment Variables

- [ ] Never commit secrets to Git
- [ ] Use Vercel environment variables for all secrets
- [ ] Rotate API keys annually
- [ ] Document all required environment variables

### 4. Dependencies

- [ ] Keep dependencies up to date
- [ ] Review security advisories monthly
- [ ] Use `npm audit` to check for vulnerabilities
- [ ] Update dependencies quarterly

```bash
npm audit
npm audit fix
```

---

## Performance Optimization

### 1. Build Optimization

- [x] Next.js production build optimized
- [x] Static pages pre-rendered where possible
- [x] Dynamic routes properly configured
- [x] Image optimization (if using images)

### 2. Runtime Optimization

- [x] Pricing data cached in KV
- [x] API responses optimized
- [x] Error handling efficient
- [ ] Consider CDN for static assets (Vercel handles this)

### 3. Database Optimization

- [x] KV storage for fast reads
- [x] Efficient data structures
- [ ] Monitor KV usage and costs

---

## Troubleshooting

### Common Issues

**1. Build Fails**
- Check TypeScript errors: `npm run build`
- Verify all environment variables are set
- Check for missing dependencies

**2. API Routes Return 500**
- Check Vercel function logs
- Verify environment variables
- Check KV connection
- Verify external API credentials (GHL, Google Maps)

**3. Admin Interface Not Accessible**
- Verify `ADMIN_PASSWORD` is set
- Check password in request headers
- Verify route is not blocked

**4. Pricing File Not Found**
- Upload pricing file via admin interface
- Verify file is in KV storage
- Check KV connection

**5. GHL Integration Not Working**
- Verify GHL API token is valid
- Check Location ID is correct
- Verify token has required scopes
- Check GHL API status

---

## Rollback Procedure

If deployment causes issues:

**Option 1: Vercel Dashboard**
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." → "Promote to Production"

**Option 2: Git Revert**
```bash
# Revert to previous commit
git revert HEAD
git push origin main
# Vercel will auto-deploy
```

**Option 3: Vercel CLI**
```bash
vercel rollback
```

---

## Post-Launch Checklist

### Week 1
- [ ] Monitor error logs daily
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Collect user feedback
- [ ] Address any critical issues

### Week 2-4
- [ ] Review analytics weekly
- [ ] Optimize based on usage patterns
- [ ] Update documentation as needed
- [ ] Plan improvements

### Monthly
- [ ] Review security updates
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Backup verification

---

## Support & Documentation

### For Users
- Admin interface documentation
- API usage guide
- Widget embedding guide
- Troubleshooting guide

### For Developers
- Code documentation
- API reference
- Deployment guide (this document)
- Architecture overview

---

## Success Criteria

**Deployment is successful when:**
- ✅ Application builds without errors
- ✅ All environment variables configured
- ✅ Admin interface accessible
- ✅ Pricing file uploaded
- ✅ Quote calculation works
- ✅ No critical errors in logs
- ✅ Performance metrics within targets
- ✅ Security measures in place

---

## Quick Reference

**Deployment URL:** `https://your-domain.com`  
**Admin URL:** `https://your-domain.com/admin`  
**API Base:** `https://your-domain.com/api`  
**Vercel Dashboard:** https://vercel.com/dashboard

**Key Commands:**
```bash
# Build locally
npm run build

# Run tests
npm test

# Deploy to production
vercel --prod

# Check logs
vercel logs
```

---

**Last Updated:** January 22, 2026  
**Status:** ✅ Production Ready  
**Next Review:** After first deployment
