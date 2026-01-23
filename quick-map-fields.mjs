#!/usr/bin/env node

/**
 * Quick script to help map survey questions to GHL custom fields
 * This will show you available GHL fields and suggest mappings
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CleanPricing2026!';

async function getGHLFields() {
  const response = await fetch(`${BASE_URL}/api/admin/ghl-custom-fields`, {
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });
  const data = await response.json();
  return data.fields || [];
}

async function getSurveyQuestions() {
  const response = await fetch(`${BASE_URL}/api/admin/test-field-mappings`, {
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });
  const data = await response.json();
  return data;
}

async function suggestMappings() {
  console.log('🔍 Finding GHL Custom Fields and Suggesting Mappings...\n');

  const [ghlFields, surveyData] = await Promise.all([
    getGHLFields(),
    getSurveyQuestions(),
  ]);

  // Filter to only custom fields (not native)
  const customFields = ghlFields.filter(f => f.fieldType === 'custom');
  
  console.log(`📊 Found ${customFields.length} GHL custom fields\n`);

  // Create a mapping of keywords to help match
  const keywordMap = {
    bedrooms: ['bedroom', 'bed'],
    squareFeet: ['square', 'sqft', 'footage', 'size'],
    people: ['people', 'person', 'residents', 'occupants'],
    sheddingPets: ['pet', 'pets', 'animal', 'animals', 'shedding'],
    condition: ['condition', 'state', 'cleanliness'],
    hasPreviousService: ['previous', 'service', 'before', 'prior'],
    cleanedWithin3Months: ['cleaned', 'professional', '3 months', 'three months'],
  };

  console.log('📋 Unmapped Questions and Suggested GHL Fields:\n');

  surveyData.questionsWithoutMappings.forEach((question) => {
    // Skip core fields (they're native)
    if (['firstName', 'lastName', 'email', 'phone', 'address'].includes(question.id)) {
      return;
    }

    console.log(`\n${question.label} (${question.id})`);
    console.log(`   Type: ${surveyData.allMappings.find(m => m.questionId === question.id)?.questionType || 'unknown'}`);

    // Find matching GHL fields
    const keywords = keywordMap[question.id] || [question.id.toLowerCase()];
    const matches = customFields.filter(field => {
      const fieldKey = field.key.toLowerCase();
      const fieldName = field.name.toLowerCase();
      return keywords.some(keyword => 
        fieldKey.includes(keyword) || fieldName.includes(keyword)
      );
    });

    if (matches.length > 0) {
      console.log(`   ✅ Suggested GHL Fields:`);
      matches.slice(0, 3).forEach(match => {
        console.log(`      - ${match.key} (${match.name}) [${match.type}]`);
      });
    } else {
      console.log(`   ⚠️  No matching GHL field found. You may need to create one in GHL.`);
      console.log(`      Suggested field key: contact.${question.id.replace(/([A-Z])/g, '_$1').toLowerCase()}`);
    }
  });

  console.log('\n\n💡 To map a field:');
  console.log('   1. Go to /admin/survey-builder');
  console.log('   2. Click "Edit" on the question');
  console.log('   3. Enter the GHL field key in "GHL Field Mapping"');
  console.log('   4. Format: contact.field_key_name');
  console.log('\n✅ After mapping, test with: node test-field-mappings.mjs');
}

suggestMappings().catch(console.error);
