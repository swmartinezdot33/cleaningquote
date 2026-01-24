/**
 * Utility to normalize field values before sending to GHL
 * Ensures all values are properly formatted (no literal "true"/"false" strings)
 */

/**
 * Normalize a field value for GHL API consumption
 * Converts boolean and other values to their proper string representations
 */
export function normalizeFieldValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }

  // If it's a boolean, DON'T convert to "true"/"false" strings
  // Instead, return empty or the appropriate select value
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }

  // Numbers: convert to string
  if (typeof value === 'number') {
    return String(value);
  }

  // Arrays and objects: convert to JSON string
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Fallback: convert to string
  return String(value);
}

/**
 * Convert custom fields object to GHL format with normalized values
 * GHL expects: [{ key: "fieldKey", value: "fieldValue" }, ...]
 */
export function convertCustomFieldsToGHLFormat(
  customFields: Record<string, any>
): Array<{ key: string; value: string }> {
  return Object.entries(customFields)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      value: normalizeFieldValue(value),
    }));
}

/**
 * Sanitize custom fields for GHL
 * Removes empty values and normalizes remaining values
 */
export function sanitizeCustomFields(customFields: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(customFields)) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = normalizeFieldValue(value);
    }
  }

  return sanitized;
}
