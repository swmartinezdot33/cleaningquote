# ⚡ Quick Test Guide - Quote Association

## 🚀 Fastest Test (2 minutes)

### 1. Start Server
```bash
npm run dev
```

### 2. Run Test Script
```bash
./test-quote-flow.sh
```

### 3. Check Server Logs
Look for these in your terminal:
- ✅ `Contact created in GHL: [id]`
- ✅ `Quote custom object created in GHL: [id]`
- ✅ `Successfully associated custom object [id] with contact [id]`

### 4. Verify in GHL
1. Go to GHL → Contacts
2. Find test contact
3. Check if quote appears in related records

---

## 🔍 If Association Fails

### Quick Debug Steps:

1. **Get the IDs from server logs:**
   - Contact ID: Look for `Contact created in GHL: [CONTACT_ID]`
   - Quote Record ID: Look for `Quote custom object created in GHL: [QUOTE_ID]`

2. **Test Association Manually:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/test-association \
     -H "Content-Type: application/json" \
     -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
     -d '{
       "quoteRecordId": "PASTE_QUOTE_ID_HERE",
       "contactId": "PASTE_CONTACT_ID_HERE"
     }'
   ```

3. **Check Response:**
   - If success: Association works, check why it's not working in main flow
   - If fails: Note which `targetKey` format works (if any)

---

## 🎯 Most Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Association fails silently | Check server logs for `❌ Failed to associate` |
| Wrong targetKey format | Test with `/api/admin/test-association` to find correct format |
| Quote not created | Check GHL custom object exists and field names match |
| Contact not created | Check GHL token and location ID |

---

## 📋 Verification Checklist

After each test, verify:
- [ ] Contact exists in GHL
- [ ] Quote custom object exists in GHL
- [ ] Quote is linked to contact (check contact's related records)
- [ ] No errors in server logs

---

## 🛠️ Enable Verbose Logging

Add to `src/lib/ghl/client.ts` around line 1050:

```typescript
console.log('🔍 FULL DEBUG:', {
  objectId: objectIdForAssociation,
  schemaKey: schemaKeyForAssociation,
  recordId: customObject.id,
  contactId: data.contactId,
});
```

---

## ⏱️ Time Estimates

- **Full test**: 2-3 minutes
- **Debug specific issue**: 5-10 minutes
- **Fix and verify**: 5-15 minutes

---

## 🆘 Still Stuck?

1. Check server logs for exact error
2. Test association manually with test endpoint
3. Verify custom object schema in GHL
4. Check API token scopes in GHL
