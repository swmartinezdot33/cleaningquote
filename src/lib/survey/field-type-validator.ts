/**
 * Survey Field Type Validator
 * Ensures survey field types always match their mapped GHL field types
 * This prevents users from breaking the system by changing field types
 */

import { getGHLToken, getGHLLocationId } from '@/lib/kv';

interface GHLFieldInfo {
  key: string;
  name: string;
  type: string; // The GHL field type (e.g., 'text', 'email', 'number', 'select', 'address')
  fieldType?: string;
  dataType?: string;
  options?: Array<{ name: string; value: string }>;
  isCustom: boolean;
}

interface FieldTypeValidation {
  valid: boolean;
  error?: string;
  ghlFieldType?: string;
  compatibleSurveyTypes?: string[];
}

/**
 * Maps GHL field types to compatible survey field types
 */
const GHL_TO_SURVEY_TYPE_MAP: Record<string, string[]> = {
  // Native GHL fields
  'firstName': ['text'],
  'lastName': ['text'],
  'email': ['email'],
  'phone': ['tel'],
  'address': ['address'],
  
  // Custom field types in GHL
  'TEXT': ['text'],
  'EMAIL': ['email'],
  'PHONE': ['tel'],
  'NUMBER': ['number'],
  'URL': ['text'],
  'DATE': ['text'],
  'CHECKBOX': ['select'],
  'DROPDOWN': ['select'],
  'MULTIPLE_SELECT': ['select'],
  'TEXTAREA': ['text'],
  'RICH_TEXT': ['text'],
  'CURRENCY': ['number'],
  'PERCENT': ['number'],
};

/**
 * Maps survey field types to compatible GHL field types
 */
const SURVEY_TO_GHL_TYPE_MAP: Record<string, string[]> = {
  'text': ['TEXT', 'TEXTAREA', 'RICH_TEXT', 'URL', 'DATE', 'firstName', 'lastName'],
  'email': ['EMAIL', 'email'],
  'tel': ['PHONE', 'phone'],
  'number': ['NUMBER', 'CURRENCY', 'PERCENT'],
  'select': ['DROPDOWN', 'MULTIPLE_SELECT', 'CHECKBOX'],
  'address': ['address'],
};

/**
 * Fetch GHL field information by key
 */
async function getGHLFieldInfo(fieldKey: string): Promise<GHLFieldInfo | null> {
  try {
    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token || !locationId) {
      console.error('GHL token or location ID not configured');
      return null;
    }

    // Try to get custom fields first
    const customFieldsResponse = await fetch(
      `https://services.leadconnectorhq.com/objects/6973793b9743a548458387d2/records?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Location-Id': locationId,
        },
      }
    );

    if (customFieldsResponse.ok) {
      const data = await customFieldsResponse.json();
      
      // Search through custom fields
      if (data && typeof data === 'object') {
        for (const field of Object.values(data)) {
          const f = field as any;
          if (f.key === fieldKey || f.id === fieldKey) {
            return {
              key: f.key || fieldKey,
              name: f.name || fieldKey,
              type: f.dataType || f.type || 'text',
              fieldType: f.fieldType,
              dataType: f.dataType,
              isCustom: true,
            };
          }
        }
      }
    }

    // Check native fields
    const nativeFields: Record<string, GHLFieldInfo> = {
      'firstName': { key: 'firstName', name: 'First Name', type: 'firstName', isCustom: false },
      'lastName': { key: 'lastName', name: 'Last Name', type: 'lastName', isCustom: false },
      'email': { key: 'email', name: 'Email', type: 'email', isCustom: false },
      'phone': { key: 'phone', name: 'Phone', type: 'phone', isCustom: false },
      'address': { key: 'address', name: 'Address', type: 'address', isCustom: false },
    };

    return nativeFields[fieldKey] || null;
  } catch (error) {
    console.error('Error fetching GHL field info:', error);
    return null;
  }
}

/**
 * Validate that a survey field type is compatible with its GHL mapping
 */
export async function validateFieldTypeCompatibility(
  surveyFieldType: string,
  ghlFieldMapping: string | undefined
): Promise<FieldTypeValidation> {
  // If no mapping, any survey type is valid
  if (!ghlFieldMapping || ghlFieldMapping.trim() === '') {
    return { valid: true };
  }

  try {
    // Get GHL field information
    const ghlFieldInfo = await getGHLFieldInfo(ghlFieldMapping);
    
    if (!ghlFieldInfo) {
      return {
        valid: false,
        error: `GHL field "${ghlFieldMapping}" not found. Please check that the field exists in GHL.`,
      };
    }

    // Get compatible survey types for this GHL field
    const compatibleSurveyTypes = GHL_TO_SURVEY_TYPE_MAP[ghlFieldInfo.type] || [];
    
    if (compatibleSurveyTypes.length === 0) {
      return {
        valid: false,
        error: `GHL field type "${ghlFieldInfo.type}" is not supported for survey mapping.`,
        ghlFieldType: ghlFieldInfo.type,
      };
    }

    // Check if current survey type is compatible
    const isCompatible = compatibleSurveyTypes.includes(surveyFieldType);

    if (!isCompatible) {
      return {
        valid: false,
        error: `Survey field type "${surveyFieldType}" is incompatible with GHL field type "${ghlFieldInfo.type}". Compatible types: ${compatibleSurveyTypes.join(', ')}`,
        ghlFieldType: ghlFieldInfo.type,
        compatibleSurveyTypes,
      };
    }

    return {
      valid: true,
      ghlFieldType: ghlFieldInfo.type,
      compatibleSurveyTypes,
    };
  } catch (error) {
    console.error('Error validating field type compatibility:', error);
    return {
      valid: false,
      error: 'Failed to validate field type compatibility. Please try again.',
    };
  }
}

/**
 * Get compatible survey types for a GHL field
 */
export async function getCompatibleSurveyTypes(
  ghlFieldMapping: string | undefined
): Promise<string[]> {
  if (!ghlFieldMapping || ghlFieldMapping.trim() === '') {
    // No mapping, return all types
    return ['text', 'email', 'tel', 'number', 'select', 'address'];
  }

  try {
    const ghlFieldInfo = await getGHLFieldInfo(ghlFieldMapping);
    
    if (!ghlFieldInfo) {
      return ['text', 'email', 'tel', 'number', 'select', 'address'];
    }

    return GHL_TO_SURVEY_TYPE_MAP[ghlFieldInfo.type] || ['text', 'email', 'tel', 'number', 'select', 'address'];
  } catch (error) {
    console.error('Error getting compatible survey types:', error);
    return ['text', 'email', 'tel', 'number', 'select', 'address'];
  }
}

/**
 * Get field info for UI display
 */
export async function getFieldTypeInfo(ghlFieldMapping: string | undefined) {
  if (!ghlFieldMapping || ghlFieldMapping.trim() === '') {
    return null;
  }

  try {
    return await getGHLFieldInfo(ghlFieldMapping);
  } catch (error) {
    console.error('Error getting field type info:', error);
    return null;
  }
}

/**
 * Validate multiple fields at once and get compatibility report
 */
export async function validateAllFieldMappings(questions: Array<{ id: string; type: string; label: string; ghlFieldMapping?: string }>) {
  const report: Record<string, { valid: boolean; error?: string; ghlFieldType?: string }> = {};

  for (const question of questions) {
    if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
      const validation = await validateFieldTypeCompatibility(question.type, question.ghlFieldMapping);
      report[question.id] = {
        valid: validation.valid,
        error: validation.error,
        ghlFieldType: validation.ghlFieldType,
      };
    } else {
      report[question.id] = { valid: true };
    }
  }

  return report;
}
