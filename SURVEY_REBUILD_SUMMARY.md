# Survey System Complete Rebuild

## The Problem We Solved

The original survey system was a **complete mess**:
- Hardcoded defaults in `page.tsx` (180+ lines)
- Hardcoded defaults in `survey-builder/page.tsx` (150+ lines) 
- Cached data in Vercel KV
- Band-aid "mandatory fixes" in the API that overrode user changes
- When users deleted/reordered questions in admin, form still showed old questions
- No validation - corrupted data could be saved
- Core fields mixed with custom fields with no protection
- Multiple sources of truth causing conflicts

## The Solution: Unified Survey System

We completely rebuilt the survey system with **ONE source of truth**:

### 1. Unified Survey Schema (`src/lib/survey/schema.ts`)
- Single definition of all 16 default survey questions
- Proper TypeScript interfaces with validation
- Core fields marked as protected (can't be deleted)
- DEFAULT_SURVEY_QUESTIONS array is the only hardcoded source

### 2. Survey Manager (`src/lib/survey/manager.ts`)
CRUD operations with Vercel KV as the single source of truth:
- `getSurveyQuestions()` - Get all questions (sorted by order)
- `saveSurveyQuestions()` - Save full question list
- `addQuestion()` - Add a new custom question
- `updateQuestion()` - Update a question by ID
- `deleteQuestion()` - Remove a question (with core field protection)
- `reorderQuestions()` - Update question order
- `resetToDefaults()` - Reset to original 16 questions
- `getQuestion()` - Get single question by ID

All functions include:
- Full validation
- Error handling
- KV serialization/deserialization

### 3. Clean Survey API (`src/app/api/surveys/questions/route.ts`)
RESTful API for all survey operations:

**GET** `/api/surveys/questions`
- Returns all questions sorted by order
- No cache headers (always fresh data)
- No transformations, no fixes - just returns what's in KV

**POST** `/api/surveys/questions`
Supports multiple actions via `action` parameter:
- `action: "reset"` - Reset to defaults
- `action: "add"` - Add new question
- `action: "update"` - Update existing question
- `action: "delete"` - Delete question by ID
- `action: "reorder"` - Reorder questions
- (default) - Bulk save all questions

All operations return validated, sorted questions.

### 4. Clean Frontend (`src/app/page.tsx`)
Completely rewritten quote form:
- **No hardcoded defaults** - all questions come from API
- Starts with empty array, fetches on mount
- Single `loadSurveyQuestions()` function that:
  - Fetches from `/api/surveys/questions`
  - Trusts the data completely (no re-fixing)
  - Sets questions and generates schema
- No band-aid field validations
- Uses unified survey schema import

### 5. New Admin Survey Builder (`src/app/admin/survey-builder/page.tsx`)
Complete rewrite using CRUD API:
- **Add Question** → `POST action: "add"`
- **Edit Question** → `POST action: "update"`
- **Delete Question** → `POST action: "delete"` (with core field protection)
- **Reorder** → Move up/down, auto-saves via `POST action: "reorder"`
- Full form validation
- Visual feedback (loading, success, error states)
- Edit panel for question details
- Proper option management for select types

### 6. Backward Compatible Old API
`/api/survey-questions` endpoint:
- Still works for backward compatibility
- Now uses new unified manager internally
- Removed all band-aid fixes
- Returns clean data from KV

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Users & Admin                    │
├─────────────────────────────────────────┤
│  Frontend: page.tsx (Quote Form)         │
│  Frontend: survey-builder/page.tsx (Admin) │
├─────────────────────────────────────────┤
│  API Routes                               │
│  ├─ /api/surveys/questions (NEW)         │
│  └─ /api/survey-questions (legacy)       │
├─────────────────────────────────────────┤
│  Manager: survey/manager.ts              │
│  ├─ getSurveyQuestions()                 │
│  ├─ saveSurveyQuestions()                │
│  ├─ addQuestion()                        │
│  ├─ updateQuestion()                     │
│  ├─ deleteQuestion()                     │
│  ├─ reorderQuestions()                   │
│  └─ resetToDefaults()                    │
├─────────────────────────────────────────┤
│  Schema: survey/schema.ts                │
│  ├─ SurveyQuestion interface             │
│  ├─ SurveyQuestionOption interface       │
│  ├─ DEFAULT_SURVEY_QUESTIONS             │
│  └─ validateSurveyQuestion()             │
├─────────────────────────────────────────┤
│  Vercel KV Storage                       │
│  └─ survey:questions:v2                  │
└─────────────────────────────────────────┘
```

## Key Improvements

✅ **Single Source of Truth**
- Questions live only in KV via the manager
- No hardcoded defaults in components
- No conflicting cached versions

✅ **Proper Validation**
- All questions validated before saving
- Corrupt data can't be saved
- Clear error messages

✅ **Core Field Protection**
- firstName, lastName, email, phone, address, squareFeet cannot be deleted
- Type changes trigger warnings
- Admin can't accidentally break the form

✅ **Working Add/Edit/Delete/Reorder**
- Add question: Creates new custom question
- Edit question: Updates label, type, options, etc.
- Delete question: Removes custom question
- Reorder: Move questions up/down, auto-saves
- **All operations immediately sync to the form**

✅ **No More Band-Aid Fixes**
- Removed mandatory field override logic
- Removed hardcoded "fixes" in API
- Removed cache-busting hacks
- API returns clean data, frontend trusts it

✅ **Better Error Handling**
- Clear validation errors
- User-friendly messages
- No silent failures

## Data Flow

### Quote Form Load
1. Component mounts
2. `loadSurveyQuestions()` fetches from `/api/surveys/questions`
3. API calls `getSurveyQuestions()` from manager
4. Manager retrieves from KV (validates in schema)
5. API returns sorted, validated questions
6. Frontend sets questions state, generates schema
7. Form renders with exact questions in KV

### Admin Adds Question
1. Admin enters question details
2. Clicks "Save Question"
3. `POST /api/surveys/questions` with `action: "add"`
4. API calls `addQuestion()` from manager
5. Manager validates question
6. Manager saves to KV
7. Manager returns updated question list
8. Admin UI updates with new question
9. **Next time anyone loads the form, new question appears**

### Admin Deletes Question
1. Admin clicks delete on custom question
2. `POST /api/surveys/questions` with `action: "delete"`
3. Manager prevents deletion if core field
4. Manager removes from KV
5. Manager returns updated list
6. Admin UI updates
7. **Question no longer appears in form**

### Admin Reorders Questions
1. Admin clicks up/down on question
2. `POST /api/surveys/questions` with `action: "reorder"`
3. Manager updates order for all questions
4. Manager saves to KV
5. Manager returns sorted list
6. **Next form load shows new order**

## Testing the Rebuild

To test the complete workflow:

1. **Load the form**
   - Visit `/` 
   - Should show all 16 questions in correct order

2. **Add a custom question**
   - Go to `/admin/survey-builder`
   - Login with admin password
   - Click "Add Question"
   - Fill in details, Save
   - Reload the form → new question should appear

3. **Edit a question**
   - In survey builder, click edit on any question
   - Change label/type/options
   - Save
   - Reload form → changes should appear

4. **Delete a custom question**
   - Click delete on custom question
   - Confirm deletion
   - Reload form → question gone

5. **Reorder questions**
   - Use up/down arrows to reorder
   - Reload form → order should match

6. **Try to delete core field**
   - Try clicking delete on "firstName"
   - Should show error: "Cannot delete core field"
   - Button should be disabled

## Migration from Old System

If you had customizations in the old system:

1. They're still in KV under the old key
2. Run `/api/admin/migration/reset-survey-questions` to reset to defaults
3. Rebuild your customizations using the new admin panel
4. The new system is much better - you'll want the old customizations gone anyway!

## Files Changed

**Created:**
- `src/lib/survey/schema.ts` - Unified schema with validation
- `src/lib/survey/manager.ts` - CRUD manager with KV operations
- `src/app/api/surveys/questions/route.ts` - New unified API

**Completely Rewritten:**
- `src/app/page.tsx` - Removed 200+ lines of hardcoded defaults
- `src/app/admin/survey-builder/page.tsx` - Complete rebuild with CRUD API

**Updated:**
- `src/lib/kv.ts` - Marked old functions as deprecated
- `src/app/api/survey-questions/route.ts` - Now uses new manager

**Deleted:**
- All hardcoded question arrays
- All band-aid validation logic
- All mandatory field "fixes"

## Future Improvements

The new system makes these much easier:
- **Field-level permissions** - Mark fields as read-only, conditional, etc.
- **Dynamic validation** - Custom rules per question
- **Better UI** - Drag-and-drop reordering, inline editing
- **Analytics** - Track which questions are used
- **Versioning** - Keep history of survey versions
- **Multi-language** - Easy to add translations

## Conclusion

The survey system is now **clean, maintainable, and working correctly**. 

- ✅ One source of truth
- ✅ Proper validation
- ✅ Working admin panel
- ✅ No more conflicts or band-aids
- ✅ Ready for future improvements

The form will now behave exactly as users configure it in the admin panel, every single time.
