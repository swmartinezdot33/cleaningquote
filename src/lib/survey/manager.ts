/**
 * Survey Manager
 * Handles all survey CRUD operations with KV as single source of truth
 */

import { kv } from '@vercel/kv';
import { SurveyQuestion, DEFAULT_SURVEY_QUESTIONS, validateSurveyQuestion } from './schema';

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
      return await initializeSurvey();
    }
    return questions.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error getting survey questions:', error);
    throw error;
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

    // Save to KV
    await kv.set(SURVEY_QUESTIONS_KEY, sorted);

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

    // Merge updates
    const updated = { ...question, ...updates, id }; // Force ID to stay the same

    // Validate
    const validation = validateSurveyQuestion(updated);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

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
