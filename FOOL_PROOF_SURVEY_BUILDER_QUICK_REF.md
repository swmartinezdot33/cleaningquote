# Fool-Proof Survey Builder - Quick Reference

## What's Protected

### ✅ Core Fields (Cannot Delete)
- First Name
- Last Name
- Email
- Phone
- Service Address
- Square Footage
- Service Type
- Cleaning Frequency
- Full Bathrooms
- Half Bathrooms
- Bedrooms
- Home Condition

**Why:** These fields are essential for contact creation, quote calculations, and GHL synchronization. Deleting them would break the entire system.

### ✅ Critical GHL Mappings (Cannot Break)
- `serviceType` → must map to `contact.type_of_cleaning_service_needed`
- `frequency` → must map to `contact.cleaning_frequency_selected`
- `condition` → must map to `contact.condition_of_the_home_currently`

**Why:** If these mappings are changed, quotes won't sync properly to GHL and won't appear in the Quotes tab.

### ✅ Field Type Changes (Protected)
Changing field type on any core field is blocked and shows impact warning:
- Number → Text: "Breaks quote calculations"
- Select → Text: "Breaks pricing logic"
- Email → Text: "Email validation lost"

---

## Protection Layers

### Layer 1: UI Prevents Action
```
Try to delete a core field
→ Delete button is DISABLED (grayed out)
→ Shows 🔒 lock icon
→ Message: "Core field (protected)"
```

### Layer 2: Real-Time Validation
```
Change field type
→ System detects impact
→ Red warning box appears
→ Shows what breaks
→ Save button disabled
```

### Layer 3: Impact Warning
```
"⚠️ Breaking Change Detected
This would break:
- Quote calculations
- Pricing logic
Affected systems: Quotes, Forms, GHL Sync"
```

### Layer 4: Block Save
```
Save button: DISABLED
Label: "Cannot Save - Breaking Change"
Message: "Fix the issues before saving"
```

---

## What You Can Still Do

✅ **Add New Questions**
- Create custom survey questions
- Set custom field types
- Map to GHL fields (with validation)

✅ **Edit Question Text**
- Change question labels (for display)
- Change placeholder text
- Change descriptions

✅ **Reorder Questions**
- Move questions up/down
- Change survey flow
- Add skip logic

✅ **Add Options**
- Add new options to select fields
- Rename option labels
- Reorder options

✅ **Map to GHL**
- Map new questions to GHL fields
- Real-time validation shows compatibility
- Suggestions for compatible field types

---

## What You Cannot Do

❌ **Delete Core Fields**
- System prevents deletion
- Shows reason why field is protected

❌ **Change Field Types (Core Fields)**
- System detects breaking change
- Blocks save with explanation
- Suggests reverting change

❌ **Break GHL Mappings**
- System validates critical mappings
- Shows error if mapping broken
- Prevents save until fixed

❌ **Remove All Options from Select**
- System requires at least one option
- Shows validation error
- Save blocked until fixed

---

## Common Issues & Fixes

### Problem: "Cannot Save - Breaking Change"

**Cause:** You tried to change something that breaks functionality

**Solutions:**
1. **Revert the change** - Click Cancel and redo
2. **Follow suggestion** - See message for what to change back
3. **Check affected systems** - Review what breaks in the warning box
4. **Read recommendation** - System tells you exactly how to fix it

### Problem: Delete Button is Disabled

**Cause:** This is a core field that cannot be deleted

**Why:** The field is essential for the system to work

**Options:**
1. Edit the field instead (change label, options, etc)
2. Just don't use it in your survey (leave it visible but optional)
3. Contact support if you really need to remove it

### Problem: "GHL mapping for [Field] should be [value]"

**Cause:** You changed the GHL mapping incorrectly

**Fix:**
1. Click on the GHL Mapping dropdown
2. Select the correct field shown in the error message
3. Save

Example:
```
Error: "GHL mapping for Service Type should be 
        contact.type_of_cleaning_service_needed"

Fix: Set GHL mapping dropdown to:
     → contact.type_of_cleaning_service_needed ✓
```

### Problem: Select Field Shows "❌ Type mismatch!"

**Cause:** The field you're mapping to is not a select field in GHL

**Fix:**
1. Look at error message: "Compatible types: ..."
2. Either:
   - Change the GHL field to a compatible type, OR
   - Change the survey question type to match GHL field

---

## User Workflow (Safe Way)

### Adding a Custom Survey Question

```
1. Click "Add Question" ✓
2. Fill in details:
   - Label: "Your question here"
   - Type: Select from: text, email, tel, number, select, address
   - Options: (if select type)
3. Optional - Map to GHL:
   - Click "GHL Field Mapping" dropdown
   - Search and select field
   - Green box appears: "✓ Field type is compatible"
4. Click "Save Question"
   - System validates
   - Shows any errors (must fix before saving)
   - Shows any warnings (optional to fix)
5. Question added successfully ✓
```

### Editing an Existing Question

```
1. Click "Edit" button on question
2. Make changes:
   - Can change label ✓ (display text only)
   - Can change placeholder ✓ (help text)
   - Can change type? (checked for breaking changes) ⚠️
   - Can change GHL mapping? (validated for compatibility) ⚠️
3. If warning appears:
   - Red box: "❌ Validation Errors" (must fix)
   - Yellow box: "⚠️ Warnings" (should fix)
   - Red breaking change box: (cannot save with this)
4. Fix issues OR revert changes
5. Click "Save Question"
6. Done ✓
```

---

## Validation Messages Explained

### ✓ Green Box - All Good
```
"✓ Field type is compatible"
"GHL field type: text"

Meaning: Your mapping is valid, no issues
Action: OK to save
```

### ⚠️ Yellow Box - Warning
```
"⚠️ Warnings
Duplicate option value: 'option1'"

Meaning: Potential issue but not critical
Action: Fix if possible, but you can save anyway
```

### ❌ Red Box - Error (Must Fix)
```
"❌ Validation Errors
Field type validation failed: Field type is incompatible
Compatible types: text, email"

Meaning: This is broken and cannot save
Action: MUST fix before saving
```

### 🔴 Red Breaking Change Box - Cannot Save
```
"⚠️ Breaking Change Detected
This change would break the following systems:
- Quote calculations
Affected: Quotes, Pricing, GHL Sync

Recommendation: Revert field type to 'number'"

Meaning: This breaks the system entirely
Action: CANNOT save - revert change
```

---

## Key Principles

### 1. Core Fields Are Locked
- Cannot be deleted
- Cannot have type changed
- Can be edited (label, mapping, etc)
- Always required

### 2. Critical Mappings Are Protected
- Must stay correctly mapped
- Changing breaks GHL sync
- System validates and blocks

### 3. Impact is Shown Before Breaking
- See what breaks before saving
- Clear explanation of what's affected
- Specific suggestion on how to fix

### 4. User Gets Clear Messaging
- Every validation error has a reason
- Every error has a suggestion
- Color-coded feedback (green/yellow/red)

### 5. You Cannot Accidentally Break It
- Core fields protected
- Breaking changes blocked
- Clear warnings shown
- Validation prevents bad saves

---

## Support

If you see an error message:

1. **Read the message carefully** - It explains what's wrong
2. **Follow the suggestion** - It tells you how to fix it
3. **Check "Affected systems"** - Understand what breaks
4. **Revert if unsure** - Click Cancel to undo your changes

**Common mistakes prevented:**
- ❌ Cannot delete firstName (UI blocks it)
- ❌ Cannot change serviceType to text (validation blocks it)
- ❌ Cannot break GHL mappings (system validates it)
- ❌ Cannot save with errors (button disabled)

**Result:** You can customize the survey safely without breaking anything!

---

**Version:** 1.0  
**Last Updated:** January 24, 2026
