# GHL Custom Field Mapping Guide

## Current Status
- **Mapped:** 4 out of 16 questions (25%)
- **Unmapped:** 12 questions

## Already Mapped ✅
1. `serviceType` → `contact.type_of_cleaning_service_needed`
2. `frequency` → `contact.cleaning_frequency_selected`
3. `fullBaths` → `contact.how_many_full_baths`
4. `halfBaths` → `contact.half_bath_number`

## Fields That Need Mapping

### Core Fields (Native GHL - No Mapping Needed)
These are automatically handled by GHL:
- `firstName` → Native field
- `lastName` → Native field
- `email` → Native field
- `phone` → Native field
- `address` → Native field (maps to `address1`)

### Fields Needing Custom Field Mappings

1. **squareFeet** - "About how big is your home?"
   - Type: select
   - Suggested GHL field: Look for fields with "square" or "sqft" or "footage"

2. **bedrooms** - "How many bedrooms in the home?"
   - Type: number
   - I see you have: `contact.how_many_bedrooms_in_the_home` (MULTIPLE_OPTIONS)
   - Suggested: `contact.how_many_bedrooms_in_the_home` (but it's MULTIPLE_OPTIONS, might need TEXT or NUMERICAL)

3. **people** - "How many people live in the home?"
   - Type: number
   - Suggested: Create a new field or find existing "people" field

4. **sheddingPets** - "How many shedding pets live in the home?"
   - Type: number
   - Suggested: Create a new field or find existing "pets" field

5. **condition** - "How would you describe the current condition of the home?"
   - Type: select
   - Suggested: Create a new field or find existing "condition" field

6. **hasPreviousService** - "Have you had cleaning service before?"
   - Type: select
   - Suggested: Create a new field

7. **cleanedWithin3Months** - "Has your home been professionally cleaned within the last 3 months?"
   - Type: select
   - Suggested: Create a new field

## How to Map Fields

### Option 1: Use Survey Builder UI (Recommended)
1. Go to `/admin/survey-builder`
2. Click "Edit" on each question
3. In the "GHL Field Mapping" field, enter the GHL custom field key
4. Format: `contact.field_key_name` (e.g., `contact.square_footage`)

### Option 2: Use API to Update Mappings
You can use the `/api/admin/survey-questions` endpoint to update mappings programmatically.

## Finding Available GHL Custom Fields

Run this command to see all available GHL custom fields:
```bash
curl -s http://localhost:3000/api/admin/ghl-custom-fields \
  -H "x-admin-password: YOUR_PASSWORD" | python3 -m json.tool
```

Look for fields that match your survey questions, or create new ones in GHL.

## Testing Mappings

After mapping, test with:
```bash
node test-field-mappings.mjs
```

Then verify the contact in GHL to ensure data is being populated correctly.
