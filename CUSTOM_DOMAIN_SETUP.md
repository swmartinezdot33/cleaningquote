# Custom Domain Setup: quote.raleighcleaningcompany.com

## Current Status

The domain `quote.raleighcleaningcompany.com` appears to be assigned to another Vercel project. Here's how to set it up:

## Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your project:**
   - Visit: https://vercel.com/ultimateagent/cleaningquote
   - Click on "Settings" → "Domains"

2. **Add the custom domain:**
   - Click "Add Domain"
   - Enter: `quote.raleighcleaningcompany.com`
   - Click "Add"

3. **If domain is already assigned:**
   - If you see an error that it's assigned to another project:
     - Go to that other project's domain settings
     - Remove the domain from that project
     - Then add it to this project

## Option 2: DNS Configuration Required

After adding the domain in Vercel, you'll need to configure DNS:

### DNS Records to Add:

1. **CNAME Record (Recommended):**
   ```
   Type: CNAME
   Name: quote
   Value: cname.vercel-dns.com
   TTL: 3600 (or your provider's default)
   ```

2. **Or A Record (Alternative):**
   ```
   Type: A
   Name: quote
   Value: 76.76.21.21
   TTL: 3600
   ```

### Where to Add DNS Records:

- Go to your domain registrar (where you manage `raleighcleaningcompany.com`)
- Navigate to DNS management
- Add the CNAME or A record above
- Wait for DNS propagation (usually 5-60 minutes)

## Option 3: Verify Current Assignment

If the domain was automatically detected, it might already be configured. Check:

```bash
# Check current project domains
npx vercel inspect https://cleaningquote.vercel.app --logs

# Or visit the dashboard
https://vercel.com/ultimateagent/cleaningquote/settings/domains
```

## SSL Certificate

Vercel will automatically provision an SSL certificate once:
- The domain is added to the project
- DNS records are correctly configured and propagated
- This usually takes a few minutes to a few hours

## Verification

After setup, verify:
- Visit: https://quote.raleighcleaningcompany.com
- Should redirect to or show your cleaning quote app
- Check SSL is active (green padlock in browser)

## Project Info

- **Project ID:** prj_1ORU0b8HFpGt1MQ8JUxQQHLnpz1b
- **Project Name:** cleaningquote
- **Current Production URL:** https://cleaningquote.vercel.app
- **Target Domain:** quote.raleighcleaningcompany.com
