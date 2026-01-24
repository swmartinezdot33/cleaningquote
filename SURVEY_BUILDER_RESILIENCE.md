# Survey Builder Resilience & Field Mapping

## Overview

The survey system is designed to be resilient to changes made by administrators in the Survey Builder UI. This document explains how it works and what happens when you modify questions.

## How It Works

### Question ID vs Question Label

Each survey question has TWO important properties:

1. **Question ID** (e.g., `firstName`, `serviceType`, `frequency`)
   - Stable identifier
   - Used internally for form field mapping
   - **NEVER changes** even when you update the question
   - Used in the request body when form is submitted
   - Used to look up GHL field mappings

2. **Question Label** (e.g., "What's your first name?", "Type of Cleaning Service")
   - Human-readable text displayed in the form
   - CAN be changed in Survey Builder
   - Does NOT affect form functionality

### Data Flow

```
User fills form
    ↓
Form sends data with QUESTION IDs as keys (e.g., { firstName: "John", serviceType: "deep" })
    ↓
Backend receives request with stable question IDs
    ↓
Backend loads latest survey questions from KV
    ↓
Backend looks up GHL field mappings using question IDs
    ↓
Data is mapped to GHL using admin-configured mappings
    ↓
All data reaches GHL correctly
```

## What You Can Change (Safe Operations)

### ✅ Change Question Label
**Safe!** The question ID stays the same.

```
Before: id: 'firstName', label: "What's your first name?"
Change to: id: 'firstName', label: "Tell us your first name"
Result: ✓ Form works, data maps correctly
```

### ✅ Change Option Labels
**Safe!** Only the display text changes, values stay the same.

```
Before: { value: 'deep', label: 'One Time Deep Clean' }
Change to: { value: 'deep', label: 'Deep Clean Service' }
Result: ✓ Form works, data maps correctly
```

### ✅ Reorder Questions
**Safe!** The question IDs don't change, just their order.

```
Before: firstName (order: 0), email (order: 1)
Change to: email (order: 0), firstName (order: 1)
Result: ✓ Form displays in new order, data maps correctly
```

### ✅ Add New Custom Question
**Safe!** New questions don't break existing functionality.

```
Add new question: id: 'businessType', type: 'select', ...
Result: ✓ New field available, existing fields work
```

### ✅ Map Question to GHL Field
**Safe!** Mappings are stored separately and don't affect question ID.

```
Set ghlFieldMapping: 'contact.custom_field_xyz' for 'bedrooms'
Result: ✓ Bedrooms data now goes to that GHL custom field
```

## What You Should NOT Change (Breaking Operations)

### ❌ Change Core Question ID
**BLOCKED!** The system prevents deletion or modification of core field IDs.

Core fields:
- `firstName`
- `lastName`
- `email`
- `phone`
- `address`
- `squareFeet`

Attempting to change these will result in an error.

### ❌ Change Option Value (for select questions)
**RISKY!** If you change the value, new submissions will use new value, old quotes used old value.

```
Before: { value: 'deep', label: '...' }
Change to: { value: 'deep-clean', label: '...' }
Result: ⚠️ New submissions use 'deep-clean', old quotes have 'deep'
         Quote pricing logic needs to handle both values
```

### ❌ Change Question Type
**RISKY!** Changing from one type to another can break existing form logic.

Example: Changing `squareFeet` from select to text would break square footage validation and pricing calculation.

## Example: Rename a Question

**Scenario:** You want to rename "How many people live in the home?" to "How many occupants?"

### Steps:
1. Go to Admin → Survey Builder
2. Find the question with ID `people`
3. Change label to "How many occupants?"
4. Click Save

### Result:
✓ Form now displays "How many occupants?"
✓ Data still maps correctly using ID: `people`
✓ Existing GHL field mappings still work
✓ Quote calculations still work
✓ All historical data is preserved

## Technical Implementation

### Code Protection

The system has built-in protections:

```typescript
// Line 201 in src/lib/survey/manager.ts
const updated = { 
  ...question, 
  ...updates, 
  id, // Force ID to stay the same - NEVER allow it to change
};

// Line 205-208: Core fields are protected
isCoreField: question.isCoreField !== undefined ? question.isCoreField : 
  (id === 'firstName' || id === 'lastName' || id === 'email' || 
   id === 'phone' || id === 'address' || id === 'squareFeet'),
```

### Field Mapping Lookup

When processing a form submission:

```typescript
// Line 271-281 in src/app/api/quote/route.ts
surveyQuestions.forEach((question: SurveyQuestion) => {
  if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
    // Map ORIGINAL question ID to admin-set mapping
    fieldIdToMapping.set(question.id, question.ghlFieldMapping.trim());
    
    // Also map SANITIZED version (dots replaced with underscores)
    const sanitizedId = question.id.replace(/\./g, '_');
    fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping.trim());
  }
});
```

This means:
1. Form always sends data with question IDs (stable)
2. Backend loads CURRENT question definitions with mappings
3. Mappings are looked up by question ID
4. Data is correctly mapped even if labels changed

## Best Practices

### DO:
- ✅ Change question labels freely
- ✅ Reorder questions
- ✅ Add new custom questions
- ✅ Change option labels
- ✅ Update GHL field mappings
- ✅ Test with new labels to ensure they're clear

### DON'T:
- ❌ Attempt to change core field IDs (system blocks this)
- ❌ Change question IDs of non-core fields (breaks mapping)
- ❌ Delete questions without understanding impact
- ❌ Change question types without testing
- ⚠️ Change option values (consider implications for pricing)

## Validation Checklist

After making Survey Builder changes:

- [ ] All form fields display correctly
- [ ] Labels are clear and professional
- [ ] Submit form with test data
- [ ] Verify data reaches GHL:
  - [ ] Contact created with correct info
  - [ ] Quote object has all fields
  - [ ] GHL custom field mappings work
- [ ] Verify quote calculation is correct
- [ ] Verify appointment booking works

## Troubleshooting

### "Question ID is required" error
- You're trying to create a question without an ID
- Fix: Make sure the ID field is filled in before saving

### "Cannot delete core field" error
- You're trying to delete a core field (firstName, lastName, email, phone, address, squareFeet)
- Fix: Core fields cannot be deleted. You can disable them by removing mappings, but they must exist.

### Data not mapping to GHL custom field
- The GHL field mapping might be incorrect
- Fix: In Survey Builder, click "Select GHL Field" and choose from the list
- Verify the mapping in the confirmation message

### Quote calculation seems off
- A question label changed but option values stayed the same
- Fix: Check that option values haven't changed, as pricing logic depends on values, not labels

## FAQ

**Q: If I change a question label, will old quotes break?**
A: No. Old quotes have the original data stored in GHL. The question ID (which never changes) ensures the mapping remains consistent.

**Q: Can I have multiple questions with the same ID?**
A: No. Question IDs must be unique. The system enforces this.

**Q: What if I need to split one question into two?**
A: Create a new question with a new ID. The old question stays for backwards compatibility with existing quotes.

**Q: Can I make a question optional?**
A: Yes. In the Survey Builder, toggle the "Required" checkbox. The form will allow skipping it.

**Q: How do I stop collecting a certain field?**
A: Don't delete the question (it breaks things). Instead, remove its GHL field mapping. The form will still ask it but the data won't go to GHL.

