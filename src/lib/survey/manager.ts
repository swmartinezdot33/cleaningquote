/**
 * Survey Manager
 * Handles all survey CRUD operations. Supabase is the only source of truth for config.
 */

import { isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import { SurveyQuestion, DEFAULT_SURVEY_QUESTIONS, validateSurveyQuestion } from './schema';
import { validateFieldTypeCompatibility } from './field-type-validator';

function requireSupabaseForSurvey(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is required for survey configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}

function restoreCoreFields(questions: SurveyQuestion[]): { questions: SurveyQuestion[]; needsSave: boolean } {
  const coreFieldIds = ['firstName', 'lastName', 'email', 'phone', 'address', 'squareFeet'];
  let needsSave = false;
  const restored = questions.map(q => {
    const shouldBeCore = coreFieldIds.includes(q.id);
    if (shouldBeCore && !q.isCoreField) {
      needsSave = true;
      return { ...q, isCoreField: true };
    }
    return q;
  });
  return { questions: restored, needsSave };
}

/**
 * Initialize surveys - creates defaults if none exist (Supabase only).
 */
export async function initializeSurvey(toolId?: string): Promise<SurveyQuestion[]> {
  requireSupabaseForSurvey();
  const existing = await configStore.getSurveyQuestionsFromConfig(toolId);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return (existing as SurveyQuestion[]).sort((a, b) => (a as SurveyQuestion).order - (b as SurveyQuestion).order);
  }
  await configStore.setSurveyQuestionsInConfig(DEFAULT_SURVEY_QUESTIONS, toolId);
  return DEFAULT_SURVEY_QUESTIONS;
}

/**
 * Get all survey questions (Supabase only).
 */
export async function getSurveyQuestions(toolId?: string): Promise<SurveyQuestion[]> {
  requireSupabaseForSurvey();
  const questions = await configStore.getSurveyQuestionsFromConfig(toolId);
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return await initializeSurvey(toolId);
  }
  const typed = questions as SurveyQuestion[];
  const { questions: restored, needsSave } = restoreCoreFields(typed);
  if (needsSave) {
    await configStore.setSurveyQuestionsInConfig(restored, toolId);
  }
  return restored.sort((a, b) => a.order - b.order);
}

/**
 * Save survey questions - overwrites all questions
 */
export async function saveSurveyQuestions(questions: SurveyQuestion[], toolId?: string): Promise<SurveyQuestion[]> {
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

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const coreFieldIds = ['firstName', 'lastName', 'email', 'phone', 'address', 'squareFeet'];
  const questionsToSave = sorted.map(q => ({
    ...q,
    ghlFieldMapping: q.ghlFieldMapping,
    isCoreField: q.isCoreField !== undefined ? q.isCoreField : coreFieldIds.includes(q.id),
  }));

  requireSupabaseForSurvey();
  await configStore.setSurveyQuestionsInConfig(questionsToSave, toolId);
  return sorted;
}

/**
 * Add a new question
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function addQuestion(question: SurveyQuestion, toolId?: string): Promise<SurveyQuestion[]> {
  try {
    const validation = validateSurveyQuestion(question);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

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

    const questions = await getSurveyQuestions(toolId);

    if (questions.some(q => q.id === question.id)) {
      throw new Error(`Question with ID "${question.id}" already exists`);
    }

    if (question.order === undefined || question.order === null) {
      question.order = Math.max(...questions.map(q => q.order), -1) + 1;
    }

    questions.push(question);
    return saveSurveyQuestions(questions, toolId);
  } catch (error) {
    console.error('Error adding question:', error);
    throw error;
  }
}

/**
 * Update a question by ID
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function updateQuestion(id: string, updates: Partial<SurveyQuestion>, toolId?: string): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions(toolId);
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
    return saveSurveyQuestions(questions, toolId);
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
}

/**
 * Delete a question by ID
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function deleteQuestion(id: string, toolId?: string): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions(toolId);
    const question = questions.find(q => q.id === id);

    if (!question) {
      throw new Error(`Question with ID "${id}" not found`);
    }

    // Prevent deletion of core fields
    if (question.isCoreField) {
      throw new Error(`Cannot delete core field "${id}". Core fields are required for the survey to function.`);
    }

    const filtered = questions.filter(q => q.id !== id);
    return saveSurveyQuestions(filtered, toolId);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
}

/**
 * Reorder questions
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function reorderQuestions(orders: Array<{ id: string; order: number }>, toolId?: string): Promise<SurveyQuestion[]> {
  try {
    const questions = await getSurveyQuestions(toolId);

    orders.forEach(({ id, order }) => {
      const q = questions.find(qu => qu.id === id);
      if (q) {
        q.order = order;
      }
    });

    return saveSurveyQuestions(questions, toolId);
  } catch (error) {
    console.error('Error reordering questions:', error);
    throw error;
  }
}

/**
 * Reset to defaults (Supabase only).
 */
export async function resetToDefaults(toolId?: string): Promise<SurveyQuestion[]> {
  requireSupabaseForSurvey();
  await configStore.setSurveyQuestionsInConfig(DEFAULT_SURVEY_QUESTIONS, toolId);
  return DEFAULT_SURVEY_QUESTIONS;
}

/**
 * Get a single question by ID
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function getQuestion(id: string, toolId?: string): Promise<SurveyQuestion | null> {
  try {
    const questions = await getSurveyQuestions(toolId);
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
