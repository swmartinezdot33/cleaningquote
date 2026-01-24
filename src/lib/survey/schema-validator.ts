/**
 * Survey Schema Validation System
 * Prevents users from making breaking changes to the survey
 * Acts as a gatekeeper for all survey modifications
 */

import { SurveyQuestion } from './schema';
import { 
  CRITICAL_FIELDS, 
  CRITICAL_GHL_MAPPINGS, 
  detectBreakingChanges,
  BreakingChange 
} from './schema-versioning';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  breakingChanges: BreakingChange[];
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'critical' | 'high';
  suggestion: string;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  suggestion: string;
}

/**
 * Validate that a question meets all requirements
 */
export function validateQuestion(
  question: Partial<SurveyQuestion>,
  allQuestions: SurveyQuestion[],
  isUpdate: boolean = false
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const breakingChanges: BreakingChange[] = [];

  // Check for empty/invalid ID
  if (!question.id || question.id.trim() === '') {
    errors.push({
      code: 'MISSING_ID',
      field: 'id',
      message: 'Question ID is required',
      severity: 'critical',
      suggestion: 'Provide a unique ID for this question',
    });
  }

  // Check for empty label
  if (!question.label || question.label.trim() === '') {
    errors.push({
      code: 'MISSING_LABEL',
      field: 'label',
      message: 'Question label is required',
      severity: 'critical',
      suggestion: 'Provide a descriptive label for this question',
    });
  }

  // Check for duplicate ID (excluding the question being updated)
  if (question.id) {
    const duplicate = allQuestions.find(
      q => q.id === question.id && (!isUpdate || q.id !== question.id)
    );
    if (duplicate) {
      errors.push({
        code: 'DUPLICATE_ID',
        field: 'id',
        message: `Question ID "${question.id}" already exists`,
        severity: 'critical',
        suggestion: 'Use a unique ID for this question',
      });
    }
  }

  // Check for missing type
  if (!question.type) {
    errors.push({
      code: 'MISSING_TYPE',
      field: 'type',
      message: 'Question type is required',
      severity: 'critical',
      suggestion: 'Select a question type (text, email, tel, number, select, address)',
    });
  }

  // Validate select questions have options
  if (question.type === 'select') {
    if (!question.options || question.options.length === 0) {
      errors.push({
        code: 'NO_OPTIONS',
        field: 'options',
        message: 'Select questions must have at least one option',
        severity: 'critical',
        suggestion: 'Add at least one option to this select question',
      });
    } else {
      // Check for duplicate option values
      const values = new Set<string>();
      for (const option of question.options) {
        if (values.has(option.value)) {
          warnings.push({
            code: 'DUPLICATE_OPTION_VALUE',
            field: 'options',
            message: `Duplicate option value: "${option.value}"`,
            suggestion: 'Ensure each option has a unique value',
          });
        }
        values.add(option.value);
      }
    }
  }

  // Check if modifying a critical field
  if (question.id && CRITICAL_FIELDS[question.id as keyof typeof CRITICAL_FIELDS]) {
    const criticalField = CRITICAL_FIELDS[question.id as keyof typeof CRITICAL_FIELDS];
    
    // Check if field is being removed (id changed)
    if (isUpdate) {
      const oldQuestion = allQuestions.find(q => q.id === question.id);
      if (oldQuestion && oldQuestion.type !== question.type) {
        errors.push({
          code: 'CRITICAL_FIELD_TYPE_CHANGE',
          field: 'type',
          message: `Cannot change type of critical field "${criticalField.label}"`,
          severity: 'critical',
          suggestion: `Keep the type as "${oldQuestion.type}"`,
        });
      }
    }
  }

  // Validate GHL field mapping compatibility
  if (question.ghlFieldMapping) {
    const criticalMapping = Object.values(CRITICAL_GHL_MAPPINGS).find(
      m => m.fieldId === question.id
    );
    
    if (criticalMapping && question.ghlFieldMapping !== criticalMapping.mustMapTo) {
      errors.push({
        code: 'CRITICAL_GHL_MAPPING_MISMATCH',
        field: 'ghlFieldMapping',
        message: `GHL mapping for "${question.label}" should be "${criticalMapping.mustMapTo}"`,
        severity: 'high',
        suggestion: `Change mapping to "${criticalMapping.mustMapTo}". ${criticalMapping.impact}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    breakingChanges,
  };
}

/**
 * Validate all questions together
 */
export function validateSurveySchema(
  newQuestions: SurveyQuestion[],
  oldQuestions?: SurveyQuestion[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate each question
  for (const question of newQuestions) {
    const result = validateQuestion(question, newQuestions, !!oldQuestions);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  // Check for missing critical fields
  for (const [fieldId, fieldInfo] of Object.entries(CRITICAL_FIELDS)) {
    const found = newQuestions.find(q => q.id === fieldId);
    if (!found) {
      errors.push({
        code: 'MISSING_CRITICAL_FIELD',
        field: fieldId,
        message: `Critical field "${fieldInfo.label}" is missing`,
        severity: 'critical',
        suggestion: `Add back the "${fieldInfo.label}" field. ${fieldInfo.reason}`,
      });
    }
  }

  // Detect breaking changes if old questions provided
  let breakingChanges: BreakingChange[] = [];
  if (oldQuestions) {
    breakingChanges = detectBreakingChanges(oldQuestions, newQuestions);
    
    // Convert breaking changes to errors
    for (const breaking of breakingChanges) {
      if (breaking.severity === 'critical' || breaking.severity === 'high') {
        errors.push({
          code: 'BREAKING_CHANGE',
          field: breaking.questionId,
          message: breaking.issue,
          severity: breaking.severity,
          suggestion: breaking.recommendation,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    breakingChanges,
  };
}

/**
 * Check if a field change would break existing data
 */
export function checkFieldChangeImpact(
  fieldId: string,
  oldQuestion: SurveyQuestion | undefined,
  newQuestion: Partial<SurveyQuestion>
): {
  breaking: boolean;
  impact: string[];
  affectedSystems: string[];
} {
  const impact: string[] = [];
  const affectedSystems: string[] = [];
  let breaking = false;

  if (!oldQuestion) {
    return { breaking, impact, affectedSystems };
  }

  // Type change
  if (oldQuestion.type !== newQuestion.type) {
    breaking = true;
    affectedSystems.push('Form validation', 'Data processing');
    impact.push(`Type changed from "${oldQuestion.type}" to "${newQuestion.type}"`);
  }

  // For select fields, check option changes
  if (oldQuestion.type === 'select' && newQuestion.type === 'select') {
    const oldValues = new Set((oldQuestion.options || []).map(o => o.value));
    const newValues = new Set((newQuestion.options || []).map(o => o.value));
    
    const removed = [...oldValues].filter(v => !newValues.has(v));
    if (removed.length > 0) {
      breaking = true;
      affectedSystems.push('Existing submissions');
      impact.push(`Options removed: ${removed.join(', ')}`);
    }
  }

  // GHL mapping change
  if (oldQuestion.ghlFieldMapping !== newQuestion.ghlFieldMapping) {
    affectedSystems.push('GHL synchronization', 'Data mapping');
    impact.push(
      `GHL mapping changed from "${oldQuestion.ghlFieldMapping || 'none'}" to "${newQuestion.ghlFieldMapping || 'none'}"`
    );
  }

  return {
    breaking,
    impact,
    affectedSystems,
  };
}

/**
 * Suggest corrections for invalid questions
 */
export function suggestCorrections(question: Partial<SurveyQuestion>): Partial<SurveyQuestion> {
  const corrected = { ...question };

  // Auto-generate ID if missing
  if (!corrected.id) {
    corrected.id = `custom_${Date.now()}`;
  }

  // Ensure label exists
  if (!corrected.label) {
    corrected.label = 'New Question';
  }

  // Default to text type
  if (!corrected.type) {
    corrected.type = 'text';
  }

  // Ensure select questions have options
  if (corrected.type === 'select' && (!corrected.options || corrected.options.length === 0)) {
    corrected.options = [{ value: 'option1', label: 'Option 1' }];
  }

  // Ensure required is set
  if (corrected.required === undefined) {
    corrected.required = false;
  }

  return corrected;
}
