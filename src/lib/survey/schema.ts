/**
 * Unified Survey Question Schema
 * Single source of truth for all survey questions
 * This replaces hardcoded defaults and all band-aids
 */

export interface SurveyQuestionOption {
  value: string;
  label: string;
  skipToQuestionId?: string; // If this option selected, skip to this question ID
}

export interface SurveyQuestion {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'address';
  placeholder?: string;
  required: boolean;
  options?: SurveyQuestionOption[];
  order: number;
  ghlFieldMapping?: string;
  // Track if this is a core field that shouldn't be deleted
  isCoreField?: boolean;
  // Skip logic: if no option has skipToQuestionId, go to next question by default
  // Only applies to select type questions
}

/**
 * Default survey questions - these are the ONLY defaults
 * The admin can customize these, and that customization is stored in KV
 * All code paths use KV data, never these hardcoded values
 */
export const DEFAULT_SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'firstName',
    label: "What's your first name?",
    type: 'text',
    placeholder: 'John',
    required: true,
    order: 0,
    isCoreField: true,
  },
  {
    id: 'lastName',
    label: "What's your last name?",
    type: 'text',
    placeholder: 'Doe',
    required: true,
    order: 1,
    isCoreField: true,
  },
  {
    id: 'email',
    label: "What's your email address?",
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    order: 2,
    isCoreField: true,
  },
  {
    id: 'phone',
    label: "What's your phone number?",
    type: 'tel',
    placeholder: '(555) 123-4567',
    required: true,
    order: 3,
    isCoreField: true,
  },
  {
    id: 'address',
    label: "What's your service address?",
    type: 'address',
    placeholder: 'Enter your address',
    required: true,
    order: 4,
    isCoreField: true,
  },
  {
    id: 'squareFeet',
    label: 'About how big is your home?',
    type: 'select',
    options: [
      { value: '0-1500', label: 'Under 1,500 sq ft' },
      { value: '1500-2000', label: '1,500 - 2,000 sq ft' },
      { value: '2000-2500', label: '2,000 - 2,500 sq ft' },
      { value: '2500-3000', label: '2,500 - 3,000 sq ft' },
      { value: '3000-3500', label: '3,000 - 3,500 sq ft' },
      { value: '3500-4000', label: '3,500 - 4,000 sq ft' },
      { value: '4000-4500', label: '4,000 - 4,500 sq ft' },
      { value: '4500-5000', label: '4,500 - 5,000 sq ft' },
      { value: '5000-6000', label: '5,000 - 6,000 sq ft' },
      { value: '6000-7000', label: '6,000 - 7,000 sq ft' },
      { value: '7000-8000', label: '7,000 - 8,000 sq ft' },
      { value: '8000+', label: 'Over 8,000 sq ft' },
    ],
    required: true,
    order: 5,
    isCoreField: true,
  },
  {
    id: 'serviceType',
    label: 'Type of Cleaning Service Needed',
    type: 'select',
    options: [
      { value: 'initial', label: 'Initial Deep Cleaning for RECURRING Services (First deep clean to reach maintenance standards for Weekly, Bi-Weekly, or Every 4 Week Services)', skipToQuestionId: 'frequency' },
      { value: 'general', label: 'Initial General Clean for RECURRING Services (For switching services—good condition homes for Weekly, Bi-Weekly, or Every 4 Week Services)', skipToQuestionId: 'frequency' },
      { value: 'deep', label: 'One Time Deep Clean (Very thorough—wet wipe everything)', skipToQuestionId: 'fullBaths' },
      { value: 'move-in', label: 'Move In/Move Out Basic clean', skipToQuestionId: 'fullBaths' },
      { value: 'move-out', label: 'Move In/Move Out Deep clean', skipToQuestionId: 'fullBaths' },
    ],
    required: true,
    order: 6,
  },
  {
    id: 'frequency',
    label: 'How often would you like your home cleaned?',
    type: 'select',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'bi-weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
      { value: 'four-week', label: 'Every 4 Weeks' },
      { value: 'one-time', label: 'One Time Clean (Deep Clean or Move Out/Move In only)' },
    ],
    required: true,
    order: 7,
  },
  {
    id: 'fullBaths',
    label: 'How many full baths?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 8,
  },
  {
    id: 'halfBaths',
    label: 'How many half baths?',
    type: 'number',
    placeholder: '1',
    required: true,
    order: 9,
  },
  {
    id: 'bedrooms',
    label: 'How many bedrooms in the home?',
    type: 'number',
    placeholder: '3',
    required: true,
    order: 10,
  },
  {
    id: 'people',
    label: 'How many people live in the home?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 11,
  },
  {
    id: 'sheddingPets',
    label: 'How many shedding pets live in the home?',
    type: 'number',
    placeholder: '1',
    required: true,
    order: 12,
  },
  {
    id: 'condition',
    label: 'How would you describe the current condition of the home?',
    type: 'select',
    options: [
      { value: 'excellent', label: 'Excellent - Well maintained' },
      { value: 'good', label: 'Good - Generally clean' },
      { value: 'average', label: 'Average - Needs regular cleaning' },
      { value: 'poor', label: 'Poor - Needs deep cleaning' },
      { value: 'very-poor', label: 'Very Poor - Heavily soiled' },
    ],
    required: true,
    order: 13,
  },
  {
    id: 'hasPreviousService',
    label: 'Have you had cleaning service before?',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes, I currently have or recently had service' },
      { value: 'false', label: 'No, this is my first time' },
      { value: 'switching', label: 'Yes, but I\'m switching providers (not happy with previous service)' },
    ],
    required: true,
    order: 14,
  },
  {
    id: 'cleanedWithin3Months',
    label: 'Has your home been professionally cleaned within the last 3 months?',
    type: 'select',
    options: [
      { value: 'yes', label: 'Yes, within the last 3 months' },
      { value: 'no', label: 'No, not within the last 3 months' },
      { value: 'unsure', label: 'Not sure / Cannot remember' },
    ],
    required: true,
    order: 15,
  },
];

/**
 * Validate a survey question
 */
export function validateSurveyQuestion(question: Partial<SurveyQuestion>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.id) errors.push('Question ID is required');
  if (!question.label) errors.push('Question label is required');
  if (!question.type) errors.push('Question type is required');
  if (question.required === undefined) errors.push('Required flag is required');
  if (question.order === undefined) errors.push('Order is required');

  if (question.type === 'select' && (!question.options || question.options.length === 0)) {
    errors.push('Select questions must have at least one option');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
