# GHL Test Wizard - Quick Reference

## 🚀 Get Started in 30 Seconds

### Step 1: Open Admin Settings
Navigate to your admin panel and click **Settings**

### Step 2: Find the Test Wizard
Scroll down and look for:
- **GHL API Configuration** section
- Expand it (if collapsed)
- Scroll to bottom
- Find **Comprehensive Endpoint Test**

### Step 3: Run the Test
Click the blue **"Test All Endpoints"** button

### Step 4: Review Results
Wait 2-5 seconds and see your results:
- ✅ Green = Working perfectly
- ⚠️ Yellow = No data (normal)
- ❌ Red = Problem that needs fixing

---

## 📊 Understanding Your Results

### Example Success Result
```
Summary: All GHL API endpoints are working!
Passed: 11/11 (100%)
Failed: 0
Warnings: 0
```
**Action**: You're all set! Your GHL integration is working.

### Example with Failures
```
Summary: Some GHL API endpoints failed
Passed: 6/11 (55%)
Failed: 5
Warnings: 0

Failed Endpoints:
❌ Contacts - List: HTTP 401 - Unauthorized
❌ Contacts - Upsert: HTTP 401 - Unauthorized
❌ Opportunities - List: HTTP 401 - Unauthorized
... (more failures)
```
**Action**: Your token is invalid or expired. Follow "Fix Token" steps below.

---

## 🔧 Common Issues & Fixes

### Issue: All endpoints show ❌ HTTP 401

**Problem**: Token is invalid, expired, or missing

**Fix in 3 steps**:
1. Go to **GHL Developer Settings** → Create new Personal Integration Token (PIT)
2. Copy the new token
3. Paste in Admin Settings under **GHL Private Integration Token** → **Save Token**
4. **Run test again**

### Issue: Some endpoints show ❌ HTTP 403

**Problem**: Token missing required permissions

**Fix in 4 steps**:
1. Go to **GHL Developer Settings** → Edit your token
2. Enable these scopes:
   - ✓ contacts.write
   - ✓ opportunities.write
   - ✓ calendars.write
   - ✓ tags.write
3. **Save** and regenerate token
4. Update in Admin Settings and **run test again**

### Issue: Test fails to run

**Problem**: Network or authentication issue

**Fix**:
1. Check your internet connection
2. Verify admin password is correct
3. Wait 5 seconds and try again
4. Refresh the page and try again

---

## ✅ Verification Checklist

After running test, verify:

- [ ] All 11 endpoints show ✅ or ⚠️
- [ ] No red ❌ errors (or only acceptable ones)
- [ ] Success rate shows 90%+ 
- [ ] Summary says "All endpoints working" (or similar)
- [ ] Test takes 2-5 seconds
- [ ] Can run test multiple times without issues

If all checked: **Your GHL integration is ready!**

---

## 📋 What Gets Tested

| # | Endpoint | What It Tests |
|---|----------|---------------|
| 1 | Contacts - List | Can read contacts |
| 2 | Contacts - Upsert | Can create/update contacts |
| 3 | Opportunities - List | Can read opportunities |
| 4 | Opportunities - Create | Can create opportunities |
| 5 | Pipelines - List | Can read sales pipelines |
| 6 | Tags - List | Can read tags |
| 7 | Tags - Create | Can create tags |
| 8 | Calendars - List | Can read calendars |
| 9 | Appointments - Create | Can create appointments |
| 10 | Custom Fields - List | Can read custom fields |
| 11 | Notes - Create | Can create notes |

---

## 🎨 UI Legend

### Status Indicators
| Icon | Color | Meaning | Action |
|------|-------|---------|--------|
| ✅ | Green | Working | None |
| ⚠️ | Yellow | No data | None (normal) |
| ❌ | Red | Error | Fix needed |

### HTTP Codes
| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Working ✅ |
| 404 | Not Found | No data ⚠️ |
| 401 | Unauthorized | Invalid token ❌ |
| 403 | Forbidden | Missing scopes ❌ |

---

## 🎯 Before You Start

Make sure you have:
1. ✅ GHL account with admin access
2. ✅ Access to Admin Settings with password
3. ✅ A valid GHL Personal Integration Token (PIT)
4. ✅ Your GHL Location ID
5. ✅ Required API scopes enabled on token

---

## 💡 Pro Tips

1. **Run regularly**: Test your integration monthly
2. **Keep secure**: Never share your GHL token
3. **Screenshot results**: Save test results for documentation
4. **Check email**: GHL may notify about token expirations
5. **Update permissions**: Add scopes as you enable new features

---

## 📞 Need Help?

**Test shows failures?**
- Review the detailed error message
- Check the "Common Issues" section above
- Verify your GHL token is recent (not expired)

**Can't access test?**
- Make sure you have admin password
- Ensure you're logged into admin settings
- Check browser console for errors

**Token keeps expiring?**
- GHL tokens may have expiration dates
- Generate new token when needed
- Update in Admin Settings

---

## 🔒 Security Notes

- ✅ Test requires admin password
- ✅ Your token is masked in results
- ✅ Results not stored on server
- ✅ No credentials in logs
- ✅ Only you see the results

---

## Next Steps

✅ **All tests pass?**
Your GHL integration is ready to use!

❌ **Some tests fail?**
Follow the fixes in "Common Issues" section

**Continue exploring**
- Survey Builder to map questions to GHL fields
- GHL Configuration to set up contact/opportunity creation
- Service Area to set up tags for in-service customers

---

## Quick Video Summary

1. Admin Settings → Scroll down
2. Find "Comprehensive Endpoint Test"
3. Click "Test All Endpoints"
4. Wait 2-5 seconds
5. Review results
6. If all green/yellow: Done! ✅
7. If red: Follow fix steps above

**That's it!** No more testing individual parts. All endpoints tested at once.

---

For detailed information, see:
- [Full User Guide](./GHL_TEST_WIZARD.md)
- [Troubleshooting Guide](./GHL_TEST_WIZARD.md#troubleshooting-guide)
- [API Documentation](./GHL_CONNECTION_TEST.md)
