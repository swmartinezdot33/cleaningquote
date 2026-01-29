/**
 * Survey Manager
 * Handles all survey CRUD operations with KV as single source of truth
 */

import { kv } from '@vercel/kv';
import { SurveyQuestion, DEFAULT_SURVEY_QUESTIONS, validateSurveyQuestion } from './schema';
import { validateFieldTypeCompatibility } from './field-type-validator';

const SURVEY_QUESTIONS_KEY = 'survey:questions:v2';

/**
 * Initialize surveys - creates defaults if none exist
 */
export async function initializeSurvey(): Promise<SurveyQuestion[]> {
  try {
    const existing = await kv.get<SurveyQuestion[]>(SURVEY_QUESTIONS_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing.sort((a, b) => a.order - b.order);
    }

    // No questions exist, create defaults
    await kv.set(SURVEY_QUESTIONS_KEY, DEFAULT_SURVEY_QUESTIONS);
    return DEFAULT_SURVEY_QUESTIONS;
  } catch (error) {
    console.error('Error initializing survey:', error);
    throw error;
  }
}

/**
 * Get all survey questions - single source of truth
 */
export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  try {
    const questions = await kv.get<SurveyQuestion[]>(SURVEY_QUESTIONS_KEY);
    if (!questions || !Array.isArray(questions)) {
      // Check for old key for backward compatibility
      const oldQuestions = await kv.get<SurveyQuestion[]>('survey:questions');
      if (oldQuestions && Array.isArray(oldQuestions) && oldQuestions.length > 0) {
        // Migrate old data to new key
        await kv.set(SURVEY_QUESTIONS_KEY, oldQuestions);
        return oldQuestions.sort((a, b) => a.order - b.order);
      }
      return await initializeSurvey();
    }
    
    // CRITICAL: Restore isCoreField for core questions if missing
    // This ensures core fields are always protected, even if flag was lost during save
    const coreFieldIds = ['firstName', 'lastName', 'email', 'phone', 'address', 'squareFeet'];
    let needsSave = false;
    const restoredQuestions = questions.map(q => {
      const shouldBeCore = coreFieldIds.includes(q.id);
      if (shouldBeCore && !q.isCoreField) {
        needsSave = true;
        return { ...q, isCoreField: true };
      }
      return q;
    });
    
    // If we restored any isCoreField flags, save them
    if (needsSave) {
      console.log('🔒 Restored isCoreField flags for core questions');
      await kv.set(SURVEY_QUESTIONS_KEY, restoredQuestions);
    }
    
    // Log questions with mappings for debugging (only when mappings exist)
    const questionsWithMappings = restoredQuestions.filter(q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '');
    if (questionsWithMappings.length > 0) {
      console.log('📋 Loaded survey questions with GHL mappings:', {
        totalQuestions: restoredQuestions.length,
        questionsWithMappings: questionsWithMappings.length,
        mappings: questionsWithMappings.map(q => ({
          id: q.id,
          sanitizedId: q.id.replace(/\./g, '_'),
          label: q.label,
          ghlFieldMapping: q.ghlFieldMapping,
        })),
      });
    }
    // Note: No warning if mappings don't exist - this is expected and normal
    
    return restoredQuestions.sort((a, b) => a.order - b.order);
  } catch (error) {
    // If KV fails (e.g., in local dev without KV configured), return defaults
    console.warn('KV storage not available, returning default questions:', error instanceof Error ? error.message : 'unknown error');
    return DEFAULT_SURVEY_QUESTIONS.sort((a, b) => a.order - b.order);
  }
}

/**
 * Save survey questions - overwrites all questions
 */
export async function saveSurveyQuestions(questions: SurveyQuestion[]): Promise<SurveyQuestion[]> {
  try {
    // Validate all questions
    const validationErrors: string[] = [];
    questions.forEach((q, idx) => {
      const validation = validateSurveyQuestion(q);
      if (!validation.valid) {
        validationErrors.push(`Question ${idx} (${q.id}): ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);
    }

    // Sort by order before saving
    const sorted = [...questions].sort((a, b) => a.order - b.order);

    // Log questions with GHL mappings before saving (only when mappings exist)
    const questionsWithMappings = sorted.filter(q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '');
    if (questionsWithMappings.length > 0) {
      console.log('💾 Saving survey questions with GHL mappings:', {
        totalQuestions: sorted.length,
        questionsWithMappings: questionsWithMappings.length,
        mappings: questionsWithMappings.map(q => ({
          id: q.id,
          sanitizedId: q.id.replace(/\./g, '_'),
          label: q.label,
          ghlFieldMapping: q.ghlFieldMapping,
        })),
      });
    }
    // Note: No warning if mappings don't exist - this is expected and normal

    // Ensure all fields are preserved (including ghlFieldMapping and isCoreField)
    // CRITICAL: Restore isCoreField for core questions if it's missing
    const coreFieldIds = ['firstName', 'lastName', 'email', 'phone', 'address', 'squareFeet'];
    const questionsToSave = sorted.map(q => ({
      ...q,
      // Explicitly preserve ghlFieldMapping even if it's undefined
      ghlFieldMapping: q.ghlFieldMapping,
      // CRITICAL: Preserve isCoreField, or restore it if missing for core fields
      // This ensures core fields are always protected from deletion
      isCoreField: q.isCoreField !== undefined ? q.isCoreField : coreFieldIds.includes(q.id),
    }));

    // Save to KV
    await kv.set(SURVEY_QUESTIONS_KEY, questionsToSave);

    return sorted;
  } catch (error) {
    console.error('Error saving survey questions:', error);
    throw error;
  }
}

/**
 * Add a new question
 */
export async function addQuestion(question: SurveyQuestion): Promise<SurveyQuestion[]> {
  try {
    const validation = validateSurveyQuestion(question);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Validate field type compatibility with GHL mapping
    if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
      const typeValidation = await validateFieldTypeCompatibility(question.type, question.ghlFieldMapping);
      if (!typeValidation.valid) {
        throw new Error(`Field type validation failed: ${typeValidation.error}`);
      }
      console.log('✅ Field type validated for new mapping:', {
        id: question.id,
        surveyType: question.type,
        ghlField: question.ghlFieldMapping,
        ghlFieldType: typeValidation.ghlFieldType,
      });
    }

    const questions = await getSurveyQuestions();

    // Check for duplicate ID
    if (questions.some(q => q.id === question.id)) {
      throw new Error(`Question with ID "${question.id}" already exists`);
    }

    // If no order specified, add to end
    if (question.order === undefined || question.order === null) {
      question.order = Math.max(...questions.map(q => q.order), -1) + 1;
    }

    questions.push(question);
    return saveSurveyQuestions(questions);
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
}

/**
 * Update a question by ID
 */
export async function updateQuestion(id: string, updates: Partial<SurveyQuestion>): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions();
    const index = questions.findIndex(q => q.id === id);

    if (index === -1) {
      throw new Error(`Question with ID "${id}" not found`);
    }

    // If trying to change a core field's type, warn but allow
    const question = questions[index];
    if (question.isCoreField && updates.type && updates.type !== question.type) {
      console.warn(`⚠️ Warning: Changing type of core field "${id}" from ${question.type} to ${updates.type}`);
    }

    // Validate field type compatibility with GHL mapping
    if (updates.type || updates.ghlFieldMapping) {
      const newType = updates.type || question.type;
      const newMapping = updates.ghlFieldMapping !== undefined ? updates.ghlFieldMapping : question.ghlFieldMapping;
      
      if (newMapping && newMapping.trim() !== '') {
        const validation = await validateFieldTypeCompatibility(newType, newMapping);
        if (!validation.valid) {
          throw new Error(`Field type validation failed: ${validation.error}`);
        }
        console.log('✅ Field type validated for mapping:', {
          id,
          surveyType: newType,
          ghlField: newMapping,
          ghlFieldType: validation.ghlFieldType,
        });
      }
    }

    // Merge updates - explicitly preserve ghlFieldMapping and isCoreField
    const updated = { 
      ...question, 
      ...updates, 
      id, // Force ID to stay the same
      // Explicitly handle ghlFieldMapping - if it's in updates (even if undefined), use it
      // This allows clearing a mapping by setting it to undefined
      ...(updates.hasOwnProperty('ghlFieldMapping') ? { ghlFieldMapping: updates.ghlFieldMapping } : {}),
      // CRITICAL: Always preserve isCoreField from original question - never allow it to be changed
      // Core fields are: firstName, lastName, email, phone, address, squareFeet
      isCoreField: question.isCoreField !== undefined ? question.isCoreField : 
        (id === 'firstName' || id === 'lastName' || id === 'email' || id === 'phone' || id === 'address' || id === 'squareFeet'),
    };

    // Validate
    const validation = validateSurveyQuestion(updated);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📝 Updating question with GHL mapping:', {
      id: updated.id,
      label: updated.label,
      ghlFieldMapping: updated.ghlFieldMapping,
      hasMapping: !!updated.ghlFieldMapping,
    });

    questions[index] = updated;
    return saveSurveyQuestions(questions);
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

/**
 * Delete a question by ID
 */
export async function deleteQuestion(id: string): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions();
    const question = questions.find(q => q.id === id);

    if (!question) {
      throw new Error(`Question with ID "${id}" not found`);
    }

    // Prevent deletion of core fields
    if (question.isCoreField) {
      throw new Error(`Cannot delete core field "${id}". Core fields are required for the survey to function.`);
    }

    const filtered = questions.filter(q => q.id !== id);
    return saveSurveyQuestions(filtered);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

/**
 * Reorder questions
 */
export async function reorderQuestions(orders: Array<{ id: string; order: number }>): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions();

    // Update order for each question
    orders.forEach(({ id, order }) => {
      const q = questions.find(qu => qu.id === id);
      if (q) {
        q.order = order;
      }
    });

    return saveSurveyQuestions(questions);
  } catch (error) {
    console.error('Error reordering questions:', error);
    throw error;
  }
}

/**
 * Reset to defaults
 */
export async function resetToDefaults(): Promise<SurveyQuestion[]> {
  try {
    await kv.set(SURVEY_QUESTIONS_KEY, DEFAULT_SURVEY_QUESTIONS);
    return DEFAULT_SURVEY_QUESTIONS;
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    throw error;
  }
}

/**
 * Get a single question by ID
 */
export async function getQuestion(id: string): Promise<SurveyQuestion | null> {
  try {
    const questions = await getSurveyQuestions();
    return questions.find(q => q.id === id) || null;
  } catch (error) {
    console.error('Error getting question:', error);
    throw error;
  }
}

/**
 * Infer canonical service type key from option value/label so we can look up by "move-in" etc.
 * Survey Builder may use long values like "Move-In/Move-Out Basic Clean"; app uses canonical keys.
 */
function inferCanonicalServiceKeys(value: string, label: string): string[] {
  const keys: string[] = [];
  const v = (value || '').toLowerCase().trim();
  const l = (label || '').toLowerCase();
  const combined = `${v} ${l}`;
  // Exact canonical values first
  if (v === 'initial') return ['initial'];
  if (v === 'general') return ['general'];
  if (v === 'deep') return ['deep'];
  if (v === 'move-in') return ['move-in'];
  if (v === 'move-out') return ['move-out'];
  // Infer from wording: move-out (deep) vs move-in (basic) — only one per option
  if (combined.includes('move-out') || combined.includes('move out') || (combined.includes('deep') && combined.includes('move'))) keys.push('move-out');
  else if (combined.includes('move-in') || combined.includes('move in') || (combined.includes('basic') && combined.includes('move'))) keys.push('move-in');
  if (combined.includes('initial deep') || (combined.includes('initial') && combined.includes('deep') && !combined.includes('general'))) keys.push('initial');
  if (combined.includes('initial general') || (combined.includes('initial') && combined.includes('general'))) keys.push('general');
  if (combined.includes('one time deep') || combined.includes('one time clean') || (combined.includes('deep') && !combined.includes('move') && !combined.includes('initial'))) keys.push('deep');
  return [...new Set(keys)];
}

/**
 * Get display labels for serviceType and frequency from stored survey (single source of truth).
 * Used by quote API and quote summary so all labels come from Survey Builder, not hardcoded.
 * Maps both exact option values and canonical keys (move-in, four-week, etc.) so UI always shows Survey labels.
 */
export function getSurveyDisplayLabels(questions: SurveyQuestion[]): {
  serviceTypeLabels: Record<string, string>;
  frequencyLabels: Record<string, string>;
} {
  const serviceTypeLabels: Record<string, string> = {};
  const frequencyLabels: Record<string, string> = {};
  const serviceTypeQuestion = questions.find(q => q.id === 'serviceType');
  const frequencyQuestion = questions.find(q => q.id === 'frequency');
  if (serviceTypeQuestion?.options) {
    for (const opt of serviceTypeQuestion.options) {
      if (opt.value?.trim()) {
        const v = opt.value.trim();
        const label = opt.label || opt.value;
        serviceTypeLabels[v] = label;
        serviceTypeLabels[v.toLowerCase()] = label;
        for (const key of inferCanonicalServiceKeys(v, opt.label || v)) {
          serviceTypeLabels[key] = label;
        }
      }
    }
  }
  if (frequencyQuestion?.options) {
    for (const opt of frequencyQuestion.options) {
      if (opt.value?.trim()) {
        const v = opt.value.trim();
        const label = opt.label || opt.value;
        frequencyLabels[v] = label;
        frequencyLabels[v.toLowerCase()] = label;
        if (v.toLowerCase() === 'bi-weekly') frequencyLabels['biweekly'] = label;
        if (v.toLowerCase() === 'four-week' || v.toLowerCase() === 'monthly' || v.toLowerCase() === 'every-4-weeks') {
          frequencyLabels['four-week'] = frequencyLabels['monthly'] = frequencyLabels['every-4-weeks'] = label;
        }
        if (v.toLowerCase() === 'weekly') frequencyLabels['weekly'] = label;
      }
    }
  }
  return { serviceTypeLabels, frequencyLabels };
}
