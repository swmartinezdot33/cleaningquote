#!/usr/bin/env node

/**
 * Map remaining survey questions to GHL custom fields
 * This script will suggest and optionally apply mappings
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CleanPricing2026!';

// Best matches based on field names and types
const RECOMMENDED_MAPPINGS = {
  squareFeet: 'contact.square_footage_of_the_home',
  bedrooms: 'contact.bedrooms', // TEXT field - simpler than MULTIPLE_OPTIONS
  people: 'contact.people_living_in_the_home', // NUMERICAL - perfect match
  sheddingPets: 'contact.shedding_pets_in_the_home', // NUMERICAL - perfect match
  condition: 'contact.how_would_you_describe_the_current_condition_of_the_home',
  hasPreviousService: 'contact.have_you_used_a_professional_cleaning_company_in_the_past',
  cleanedWithin3Months: 'contact.if_you_have_used_a_professional_cleaning_company_in_the_past_how_long_has_it_been_since_your_house_has_been_cleaned',
};

async function getSurveyQuestions() {
  const response = await fetch(`${BASE_URL}/api/admin/test-field-mappings`, {
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });
  return await response.json();
}

async function updateQuestionMapping(questionId, ghlFieldMapping) {
  // First get all questions
  const surveyResponse = await fetch(`${BASE_URL}/api/admin/survey-questions`, {
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });
  const questionsData = await surveyResponse.json();
  
  // Handle both array and object responses
  const questions = Array.isArray(questionsData) ? questionsData : (questionsData.questions || []);

  // Find the question
  const question = questions.find(q => q.id === questionId);
  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  // Update with new mapping
  const updateResponse = await fetch(`${BASE_URL}/api/admin/survey-questions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': ADMIN_PASSWORD,
    },
    body: JSON.stringify({
      ...question,
      ghlFieldMapping,
    }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to update: ${error}`);
  }

  return await updateResponse.json();
}

async function mapFields(apply = false) {
  console.log('🔍 Mapping Remaining Survey Questions to GHL Custom Fields\n');

  const surveyData = await getSurveyQuestions();
  const unmapped = surveyData.questionsWithoutMappings.filter(
    q => !['firstName', 'lastName', 'email', 'phone', 'address'].includes(q.id)
  );

  console.log(`📋 Found ${unmapped.length} unmapped questions\n`);

  for (const question of unmapped) {
    const recommended = RECOMMENDED_MAPPINGS[question.id];
    
    console.log(`\n${question.label} (${question.id})`);
    
    if (recommended) {
      console.log(`   ✅ Recommended: ${recommended}`);
      
      if (apply) {
        try {
          await updateQuestionMapping(question.id, recommended);
          console.log(`   ✅ Mapped successfully!`);
        } catch (error) {
          console.log(`   ❌ Failed to map: ${error.message}`);
        }
      } else {
        console.log(`   💡 Run with --apply to map this field`);
      }
    } else {
      console.log(`   ⚠️  No recommended mapping found`);
      console.log(`   💡 Check GHL for a matching custom field or create a new one`);
    }
  }

  if (!apply) {
    console.log('\n\n💡 To apply all mappings, run:');
    console.log('   node map-remaining-fields.mjs --apply');
  } else {
    console.log('\n\n✅ Mapping complete! Test with:');
    console.log('   node test-field-mappings.mjs');
  }
}

const apply = process.argv.includes('--apply');
mapFields(apply).catch(console.error);
