/**
 * Survey Schema Versioning System
 * Tracks changes to survey structure and detects breaking changes
 * Allows for rollback if user accidentally breaks the survey
 */

import { SurveyQuestion } from './schema';

export interface SurveySchemaVersion {
  version: number;
  timestamp: number;
  description: string;
  questions: SurveyQuestion[];
  changes: SchemaChange[];
  breakingChanges: BreakingChange[];
}

export interface SchemaChange {
  type: 'added' | 'deleted' | 'modified' | 'reordered';
  questionId: string;
  questionLabel: string;
  details: string;
}

export interface BreakingChange {
  severity: 'critical' | 'high' | 'medium' | 'low';
  questionId: string;
  questionLabel: string;
  issue: string;
  affectedSystemParts: string[];
  recommendation: string;
}

/**
 * Critical fields that must always be present and correctly configured
 * These are the backbone of the entire system
 */
export const CRITICAL_FIELDS = {
  // Identity fields (required for contact creation)
  firstName: {
    id: 'firstName',
    label: 'First Name',
    required: true,
    reason: 'Required to create contact in GHL',
  },
  lastName: {
    id: 'lastName',
    label: 'Last Name',
    required: true,
    reason: 'Required to create contact in GHL',
  },
  email: {
    id: 'email',
    label: 'Email',
    required: true,
    reason: 'Required for contact communication',
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    required: true,
    reason: 'Required for callback booking',
  },
  address: {
    id: 'address',
    label: 'Service Address',
    required: true,
    reason: 'Required to service area check and quote calculations',
  },

  // Quote calculation fields (required for pricing)
  squareFeet: {
    id: 'squareFeet',
    label: 'Square Footage',
    required: true,
    reason: 'Required to calculate quote price',
  },
  serviceType: {
    id: 'serviceType',
    label: 'Service Type',
    required: true,
    reason: 'Required to determine pricing tier',
  },
  frequency: {
    id: 'frequency',
    label: 'Cleaning Frequency',
    required: true,
    reason: 'Required to calculate recurring service pricing',
  },

  // Room count fields (required for pricing calculation)
  fullBaths: {
    id: 'fullBaths',
    label: 'Full Bathrooms',
    required: true,
    reason: 'Required to calculate detailed pricing',
  },
  halfBaths: {
    id: 'halfBaths',
    label: 'Half Bathrooms',
    required: true,
    reason: 'Required to calculate detailed pricing',
  },
  bedrooms: {
    id: 'bedrooms',
    label: 'Bedrooms',
    required: true,
    reason: 'Required to calculate detailed pricing',
  },

  // Home condition fields (required for pricing)
  condition: {
    id: 'condition',
    label: 'Home Condition',
    required: true,
    reason: 'Required to adjust pricing multipliers',
  },
};

/**
 * Fields with critical GHL mappings that must not be broken
 */
export const CRITICAL_GHL_MAPPINGS = {
  serviceType: {
    fieldId: 'serviceType',
    mustMapTo: 'contact.type_of_cleaning_service_needed',
    reason: 'Used to filter quotes by service type in GHL',
    impact: 'Quotes won\'t appear properly in GHL Quotes tab if broken',
  },
  frequency: {
    fieldId: 'frequency',
    mustMapTo: 'contact.cleaning_frequency_selected',
    reason: 'Used to display cleaning schedule',
    impact: 'Frequency information lost in GHL',
  },
  condition: {
    fieldId: 'condition',
    mustMapTo: 'contact.condition_of_the_home_currently',
    reason: 'Used for follow-up communications',
    impact: 'Follow-up logic breaks without condition data',
  },
};

/**
 * Detect breaking changes in survey schema
 */
export function detectBreakingChanges(
  oldQuestions: SurveyQuestion[],
  newQuestions: SurveyQuestion[]
): BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];
  const oldMap = new Map(oldQuestions.map(q => [q.id, q]));
  const newMap = new Map(newQuestions.map(q => [q.id, q]));

  // Check for deleted critical fields
  for (const [fieldId, fieldInfo] of Object.entries(CRITICAL_FIELDS)) {
    if (oldMap.has(fieldId) && !newMap.has(fieldId)) {
      breakingChanges.push({
        severity: 'critical',
        questionId: fieldId,
        questionLabel: fieldInfo.label,
        issue: `Critical field "${fieldInfo.label}" was deleted`,
        affectedSystemParts: [
          'Quote calculations',
          'Contact creation',
          'Service area check',
        ],
        recommendation: `Restore the "${fieldInfo.label}" field immediately. ${fieldInfo.reason}`,
      });
    }
  }

  // Check for broken GHL mappings
  for (const [fieldId, mappingInfo] of Object.entries(CRITICAL_GHL_MAPPINGS)) {
    const newQuestion = newMap.get(fieldId);
    if (newQuestion && newQuestion.ghlFieldMapping && newQuestion.ghlFieldMapping !== mappingInfo.mustMapTo) {
      breakingChanges.push({
        severity: 'high',
        questionId: fieldId,
        questionLabel: mappingInfo.fieldId,
        issue: `GHL mapping changed from "${mappingInfo.mustMapTo}" to "${newQuestion.ghlFieldMapping}"`,
        affectedSystemParts: ['GHL synchronization', 'Quote display in GHL'],
        recommendation: `Change GHL mapping back to "${mappingInfo.mustMapTo}". ${mappingInfo.impact}`,
      });
    }
  }

  // Check for type changes on critical fields
  for (const [fieldId, fieldInfo] of Object.entries(CRITICAL_FIELDS)) {
    const oldQuestion = oldMap.get(fieldId);
    const newQuestion = newMap.get(fieldId);
    
    if (oldQuestion && newQuestion && oldQuestion.type !== newQuestion.type) {
      breakingChanges.push({
        severity: 'high',
        questionId: fieldId,
        questionLabel: fieldInfo.label,
        issue: `Field type changed from "${oldQuestion.type}" to "${newQuestion.type}"`,
        affectedSystemParts: ['Form validation', 'Data processing', 'Quote calculations'],
        recommendation: `Change field type back to "${oldQuestion.type}"`,
      });
    }
  }

  // Check for deleted options in select fields
  for (const newQuestion of newQuestions) {
    const oldQuestion = oldMap.get(newQuestion.id);
    if (
      oldQuestion &&
      newQuestion.type === 'select' &&
      oldQuestion.type === 'select' &&
      oldQuestion.options &&
      newQuestion.options
    ) {
      const oldOptions = new Set(oldQuestion.options.map(o => o.value));
      const newOptions = new Set(newQuestion.options.map(o => o.value));
      
      // Check if critical options were removed
      const missingOptions = [...oldOptions].filter(opt => !newOptions.has(opt));
      
      if (newQuestion.id === 'serviceType' && missingOptions.length > 0) {
        breakingChanges.push({
          severity: 'high',
          questionId: newQuestion.id,
          questionLabel: newQuestion.label,
          issue: `Service type options were removed: ${missingOptions.join(', ')}`,
          affectedSystemParts: [
            'Quote pricing calculation',
            'Existing quotes might not match',
          ],
          recommendation: `Restore removed options: ${missingOptions.join(', ')}`,
        });
      }
    }
  }

  return breakingChanges;
}

/**
 * Compare two versions and generate a change summary
 */
export function compareVersions(
  oldVersion: SurveySchemaVersion,
  newVersion: SurveySchemaVersion
): {
  totalChanges: number;
  changesPerType: Record<string, number>;
  breakingChanges: BreakingChange[];
  summary: string;
} {
  const breakingChanges = newVersion.breakingChanges || [];
  
  const changesPerType = {
    added: 0,
    deleted: 0,
    modified: 0,
    reordered: 0,
  };

  for (const change of newVersion.changes || []) {
    changesPerType[change.type]++;
  }

  const totalChanges = newVersion.changes?.length || 0;

  let summary = `Survey updated from v${oldVersion.version} to v${newVersion.version}. `;
  if (totalChanges > 0) {
    summary += `${totalChanges} changes detected. `;
  }
  if (breakingChanges.length > 0) {
    summary += `⚠️ ${breakingChanges.length} breaking change(s) detected!`;
  } else {
    summary += '✓ No breaking changes.';
  }

  return {
    totalChanges,
    changesPerType,
    breakingChanges,
    summary,
  };
}
