# Quick Reference - E2E Testing & Verification

## 📌 Most Important Files

| File | Purpose | When to Use |
|------|---------|------------|
| `HOW_TO_RUN_E2E_TEST.md` | Step-by-step test instructions | **START HERE** when running tests |
| `SURVEY_BUILDER_RESILIENCE.md` | Why survey changes are safe | When concerned about breaking things |
| `test-e2e-comprehensive.mjs` | Automated verification script | After getting a quote ID |
| `FINAL_SUMMARY.md` | Executive overview | Quick reference of what was done |

## ✅ The Fix - 1 Minute Summary

**What was broken:** Appointments failed with "locationId should not exist"
**What was fixed:** Removed locationId from appointment API call
**File changed:** `src/lib/ghl/client.ts` line 428
**Commit:** `f43b4d5`
**Status:** ✅ FIXED AND TESTED

## 🚀 Quick Test - 5 Minutes

```bash
# Terminal 1
npm run dev

# Terminal 2 - Visit in browser (copy-paste this URL)
http://localhost:3003/?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=testid

# Fill form → Copy Quote ID → Book Appointment → Verify no error ✅
```

## 🔍 Verification Checklist - 2 Minutes Per Item

After submitting a quote, verify in GHL:

- [ ] **Contact** - Search by email, verify all fields + UTM parameters
- [ ] **Quote** - Search custom objects, verify service_address field populated
- [ ] **Opportunity** - Check contact opportunities section
- [ ] **Notes** - Check contact notes section
- [ ] **Tags** - "Quote Request" tag present
- [ ] **Appointment** - Calendar shows appointment, no errors

## 🤖 Automated Test - 30 Seconds

```bash
node test-e2e-comprehensive.mjs QT-260124-A9F2X
```

Expected output:
```
Score: 8/8 (100%)
🎉 All checks passed!
```

## ⚠️ Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| locationId error on appointment | **FIXED** - Update to latest commit `f43b4d5` |
| Service address not in quote | Check field `service_address` in custom object |
| UTM parameters missing | Check URL has parameters before form submission |
| Contact not found | Search by exact email used in form |
| Automated test fails | Run: `node test-e2e-comprehensive.mjs QUOTE_ID` with YOUR quote ID |

## 📊 Survey Builder Safety

**CAN CHANGE:**
- ✅ Question labels
- ✅ Option labels  
- ✅ Question order
- ✅ GHL field mappings

**CANNOT CHANGE:**
- ❌ Question IDs (system blocks)
- ❌ Core field IDs (protected)

**RISKY:**
- ⚠️ Option values (affects pricing)

See `SURVEY_BUILDER_RESILIENCE.md` for details.

## 📚 Documentation Structure

```
HOW_TO_RUN_E2E_TEST.md
├─ Step 1-12: Exact testing procedure
├─ Expected results
└─ Troubleshooting

COMPREHENSIVE_E2E_TEST_PLAN.md
├─ Full data verification
├─ GHL API expectations
└─ Pass/fail criteria

SURVEY_BUILDER_RESILIENCE.md
├─ Why system is safe
├─ What can/cannot change
├─ Best practices
└─ FAQ

FINAL_SUMMARY.md
├─ What was fixed
├─ What was added
└─ Production readiness
```

## 🎯 Testing Workflow

```
Fill Form with UTM params
        ↓
Get Quote ID
        ↓
Verify in GHL (6 checks)
        ↓
Book Appointment
        ↓
Verify No Errors
        ↓
Run Automated Test
        ↓
Review Report (8/8 ✅)
```

## 🔐 Data Flow Verified

```
Form Submission
    ↓ (with Question IDs + data)
Backend /api/quote
    ↓
Load Survey Questions (IDs stable)
    ↓
Map to GHL fields (using IDs, not labels)
    ↓
Create Contact ✅
Create Quote ✅
Create Opportunity ✅
Add Note ✅
Create Association ✅
    ↓
User Books Appointment
    ↓
Create Appointment (NO locationId!) ✅
    ↓
Complete
```

## 📞 Support Decision Tree

```
Appointment error?
├─ "locationId should not exist"? → FIXED ✅ (upgrade code)
├─ "Not authorized"? → Check GHL token/permissions
└─ Other? → Check server logs with: npm run dev

Data not in GHL?
├─ Contact missing? → Check email address used
├─ Quote missing? → Check service_address field
├─ UTM missing? → Check URL parameters
└─ Other? → Run: node test-e2e-comprehensive.mjs QUOTE_ID

Survey won't submit?
├─ Changed question labels? → Not the issue (resilient)
├─ Changed option values? → Check values in code
└─ Changed question type? → Test carefully
```

## ✨ All Features Working

- ✅ Real contact creation
- ✅ Quote with human-readable ID
- ✅ Service address stored
- ✅ All fields mapped
- ✅ UTM tracking
- ✅ Appointment booking (NO errors!)
- ✅ Tags applied
- ✅ Survey resilience
- ✅ Data pipeline complete

## 🎉 Status

Everything is **READY FOR PRODUCTION TESTING** with real customer data.

---

**Last Updated:** 2026-01-24  
**Latest Commit:** `9ece586`  
**Status:** ✅ All systems operational
