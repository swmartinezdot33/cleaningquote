# Admin Interface Setup Guide

## Overview

The admin interface at `/admin` allows you to manage pricing data in two ways:
1. **Upload Excel File** - Upload your pricing Excel file which will be automatically parsed
2. **Manual Configuration** - Manually add, edit, or delete pricing rows through the UI

## Setting Up the Admin Password

The admin interface requires a password for authentication. **You create this password yourself** - it's not provided by any service.

### Step 1: Choose a Secure Password

Create a strong password that you'll remember. Examples:
- Use a combination of letters, numbers, and special characters
- At least 8 characters long (longer is better)
- Don't use common words or personal information

**Examples of good passwords:**
- `CleanPricing2026!`
- `Admin@RaleighCleaning`
- `MySecureP@ssw0rd`

### Step 2: Set the Password in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`cleaningquote`)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** Your chosen password
   - **Environment:** Select all environments (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy Your Application

After adding the environment variable, you need to redeploy:

**Option 1: Using Vercel Dashboard**
- Go to your project's **Deployments** tab
- Click the three dots (⋯) on the latest deployment
- Select **Redeploy**

**Option 2: Using Git**
- Make a small change and push to your repository
- Vercel will automatically redeploy

**Option 3: Using Vercel CLI**
```bash
npx vercel --prod
```

## Using the Admin Interface

### Via Web UI

1. Navigate to `https://quote.raleighcleaningcompany.com/admin` (or your domain)
2. Enter your password in the login form
3. Click **Login** (or press Enter)
4. The password will be saved in your browser's sessionStorage for the current session

**Note:** The password is stored in sessionStorage, which means it will be cleared when you close your browser tab. You'll need to log in again for each new session.

## Security Best Practices

1. **Keep it secret** - Never share your password or commit it to Git
2. **Use a strong password** - At least 8 characters with mixed case, numbers, and symbols
3. **Change if compromised** - If you suspect the password is compromised, change it immediately
4. **Don't reuse passwords** - Use a unique password for this admin interface

## Troubleshooting

### "Unauthorized" Error

- Verify `ADMIN_PASSWORD` is set in Vercel environment variables
- Make sure you've redeployed after adding the environment variable
- Check that the password you're entering matches exactly (case-sensitive)
- Clear your browser's sessionStorage and try again

### Password Not Working After Deploy

- Ensure the environment variable is set for the correct environment (Production, Preview, Development)
- Verify you've redeployed the application after setting the variable
- Check Vercel's deployment logs for any errors
- Make sure there are no extra spaces in the password

## Change Your Password

1. Choose a new password
2. Update the `ADMIN_PASSWORD` environment variable in Vercel
3. Redeploy your application
4. Log in again with the new password
5. The old password will no longer work

## Optional: Making It Public

If you don't want password protection (not recommended for production):

- Simply don't set the `ADMIN_PASSWORD` environment variable
- The admin interface will be accessible to anyone with the URL
- **Warning:** This means anyone can modify or delete your pricing data
