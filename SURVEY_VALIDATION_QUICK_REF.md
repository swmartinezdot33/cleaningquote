# QUICK REFERENCE: Survey Builder Field Type Validation

## What It Does
Prevents users from creating incompatible field type mappings between survey fields and GHL fields.

## How to Use It

### As a User (Admin):
1. Open Survey Builder
2. Edit a question
3. Select a GHL field to map
4. **UI automatically validates the field type**
5. See green ✓ for valid or red ✗ for invalid
6. If invalid, change your survey field type to a compatible one
7. Save the question

### As a Developer:

**Check compatibility:**
```typescript
import { validateFieldTypeCompatibility } from '@/lib/survey/field-type-validator';

const validation = await validateFieldTypeCompatibility('email', 'custom_field_123');
if (!validation.valid) {
  console.error(validation.error);
  // Show compatible types to user
  console.log(validation.compatibleSurveyTypes);
}
```

**Get compatible types:**
```typescript
import { getCompatibleSurveyTypes } from '@/lib/survey/field-type-validator';

const types = await getCompatibleSurveyTypes('custom_field_123');
// Returns: ['email', 'text']
```

**Use the API:**
```javascript
// Validate single field
fetch('/api/admin/field-type-validator?surveyFieldType=email&ghlFieldMapping=custom_123')

// Batch validate
fetch('/api/admin/field-type-validator', {
  method: 'POST',
  body: JSON.stringify({
    action: 'validate-all',
    questions: [/* array of question objects */]
  })
})
```

## Type Mappings Quick Reference

| GHL Field Type | Survey Types | Example |
|---|---|---|
| EMAIL | email, text | Email address field |
| TEXT | text | Name, description |
| PHONE | tel, text | Phone numbers |
| NUMBER | number | Age, count |
| DROPDOWN | select | Status, category |
| ADDRESS | address | Service address |

## Common Scenarios

| Scenario | Result | Fix |
|---|---|---|
| Email field mapped to email survey type | ✅ Valid | No action needed |
| Email field mapped to text survey type | ✅ Valid | Text is compatible with email |
| Email field mapped to number survey type | ❌ Invalid | Change to email or text |
| Number field mapped to number survey type | ✅ Valid | No action needed |
| Dropdown mapped to select survey type | ✅ Valid | No action needed |

## Error Messages

**"Survey field type 'X' is incompatible with GHL field type 'Y'. Compatible types: Z"**
- Your field type doesn't match the GHL field
- Change your field type to one of the compatible types

**"GHL field 'X' not found. Please check that the field exists in GHL."**
- The GHL field you're trying to map no longer exists
- Remove the mapping or choose a different GHL field

## Troubleshooting

**Q: I get a type mismatch error**
A: Change your survey field type to one of the compatible types shown in the error message

**Q: My field won't save**
A: You likely have an incompatible type mapping. Check the error message for compatible types.

**Q: I want to change a field type**
A: The system will automatically validate it against the mapped GHL field type

**Q: Can I unmap a field?**
A: Yes, select "No mapping" to remove the mapping and allow any survey field type

## Files to Know

- **Validation Logic:** `src/lib/survey/field-type-validator.ts`
- **API Endpoint:** `src/app/api/admin/field-type-validator/route.ts`
- **Survey Manager:** `src/lib/survey/manager.ts` (has validation hooks)
- **Survey UI:** `src/app/admin/survey-builder/page.tsx` (shows validation)

## Safety Features

✅ Client-side validation (real-time feedback)
✅ Server-side validation (double check on save)
✅ Clear error messages (tells you how to fix it)
✅ Prevents invalid saves (data integrity)
✅ Audit logging (tracks validation attempts)

---

**Bottom Line:** The survey builder now validates field types automatically to prevent breaking the system. You get real-time feedback and clear instructions on how to fix any issues.
