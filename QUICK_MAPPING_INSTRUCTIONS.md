# Quick Mapping Instructions

## Recommended Mappings for Remaining Fields

Here are the recommended GHL custom field mappings for your 7 unmapped questions:

### 1. Square Feet
- **Question:** "About how big is your home?" (squareFeet)
- **GHL Field:** `contact.square_footage_of_the_home`
- **Type:** TEXT

### 2. Bedrooms
- **Question:** "How many bedrooms in the home?" (bedrooms)
- **GHL Field:** `contact.bedrooms`
- **Type:** TEXT

### 3. People
- **Question:** "How many people live in the home?" (people)
- **GHL Field:** `contact.people_living_in_the_home`
- **Type:** NUMERICAL

### 4. Shedding Pets
- **Question:** "How many shedding pets live in the home?" (sheddingPets)
- **GHL Field:** `contact.shedding_pets_in_the_home`
- **Type:** NUMERICAL

### 5. Condition
- **Question:** "How would you describe the current condition of the home?" (condition)
- **GHL Field:** `contact.how_would_you_describe_the_current_condition_of_the_home`
- **Type:** MULTIPLE_OPTIONS

### 6. Has Previous Service
- **Question:** "Have you had cleaning service before?" (hasPreviousService)
- **GHL Field:** `contact.have_you_used_a_professional_cleaning_company_in_the_past`
- **Type:** SINGLE_OPTIONS

### 7. Cleaned Within 3 Months
- **Question:** "Has your home been professionally cleaned within the last 3 months?" (cleanedWithin3Months)
- **GHL Field:** `contact.if_you_have_used_a_professional_cleaning_company_in_the_past_how_long_has_it_been_since_your_house_has_been_cleaned`
- **Type:** SINGLE_OPTIONS

## How to Map (Using Survey Builder UI)

1. Go to: `http://localhost:3000/admin/survey-builder`
2. For each unmapped question above:
   - Click the **Edit** button (pencil icon) on the question
   - Find the **"GHL Field Mapping"** field
   - Enter the GHL field key exactly as shown above (e.g., `contact.square_footage_of_the_home`)
   - Click **Save**

## After Mapping

Test your mappings:
```bash
node test-field-mappings.mjs
```

This will:
- Show you the mapping coverage
- Create a test quote
- Verify data is being sent to GHL

## Current Status

✅ **Already Mapped (4 fields):**
- serviceType → contact.type_of_cleaning_service_needed
- frequency → contact.cleaning_frequency_selected
- fullBaths → contact.how_many_full_baths
- halfBaths → contact.half_bath_number

⏳ **Needs Mapping (7 fields):** See list above

🔒 **Core Fields (5 fields - No mapping needed):**
- firstName, lastName, email, phone, address (these are native GHL fields)
