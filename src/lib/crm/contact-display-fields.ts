/**
 * CleanQuote contact detail: which GHL custom fields to show and their labels.
 * Each entry can have multiple possible GHL keys (different locations may name differently).
 * Only fields with a value are shown.
 */
export const CLEANQUOTE_CONTACT_DISPLAY_FIELDS: Array<{
  label: string;
  keys: string[];
  group: 'home' | 'quote' | 'lead';
}> = [
  // Home information (from quote flow / GHL contact custom fields)
  { label: 'Type of initial clean', keys: ['type_of_initial_clean', 'initial_clean_type', 'service_type'], group: 'quote' },
  { label: 'Cleaning frequency', keys: ['cleaning_frequency_selected', 'frequency', 'cleaning_frequency'], group: 'quote' },
  { label: 'Quoted cleaning price', keys: ['quoted_cleaning_price', 'quoted_price', 'quote_amount'], group: 'quote' },
  { label: 'Home square feet', keys: ['home_square_feet', 'square_footage', 'square_feet'], group: 'home' },
  { label: 'Full bathrooms', keys: ['full_bathroom_number', 'full_baths', 'full_bath'], group: 'home' },
  { label: 'Half bathrooms', keys: ['half_bath_number', 'half_baths', 'half_bath'], group: 'home' },
  { label: 'Bedrooms', keys: ['bedroom_number', 'bedrooms', 'bedroom'], group: 'home' },
  { label: 'People in home', keys: ['people_living_in_the_home', 'people_in_home', 'people_in_home_count'], group: 'home' },
  { label: 'Shedding pets', keys: ['shedding_pets_in_the_home', 'shedding_pets', 'pets'], group: 'home' },
  { label: 'Condition of home', keys: ['condition_of_the_home_currently', 'current_condition', 'condition'], group: 'home' },
  { label: 'Used professional cleaning before?', keys: ['have_you_used_a_professional_cleaning_company_in_the_past', 'cleaning_service_prior', 'used_cleaning_service'], group: 'home' },
  { label: 'Professionally cleaned in last 6 weeks?', keys: ['has_your_home_been_professionally_cleaned_within_the_last_6_weeks', 'cleaned_in_last_3_months', 'cleaned_in_last_6_weeks'], group: 'home' },
  // Lead
  { label: 'Source', keys: ['source', 'lead_source', 'utm_source'], group: 'lead' },
];

/** Resolve value from customFields using first matching key. */
export function getDisplayValue(customFields: Record<string, string>, field: { keys: string[] }): string | null {
  for (const key of field.keys) {
    const v = customFields[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/** Get only fields that have a value, grouped. */
export function getVisibleDisplayFields(customFields: Record<string, string>) {
  const quote: Array<{ label: string; value: string }> = [];
  const home: Array<{ label: string; value: string }> = [];
  const lead: Array<{ label: string; value: string }> = [];
  for (const field of CLEANQUOTE_CONTACT_DISPLAY_FIELDS) {
    const value = getDisplayValue(customFields, field);
    if (!value) continue;
    const item = { label: field.label, value };
    if (field.group === 'quote') quote.push(item);
    else if (field.group === 'home') home.push(item);
    else lead.push(item);
  }
  return { quote, home, lead };
}
