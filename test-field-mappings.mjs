#!/usr/bin/env node

/**
 * Test script to verify GHL custom field mappings are working
 * This will:
 * 1. Check current field mappings
 * 2. Create a test quote with sample data
 * 3. Verify the data was sent to GHL correctly
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testFieldMappings() {
  console.log('🔍 Testing GHL Custom Field Mappings...\n');

  try {
    // Step 1: Check current mappings (requires admin password)
    console.log('Step 1: Checking current field mappings...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'CleanPricing2026!';
    
    const mappingsResponse = await fetch(`${BASE_URL}/api/admin/test-field-mappings`, {
      headers: {
        'x-admin-password': adminPassword,
      },
    });

    if (!mappingsResponse.ok) {
      console.error('❌ Failed to fetch mappings:', await mappingsResponse.text());
      return;
    }

    const mappingsData = await mappingsResponse.json();
    console.log('\n📊 Field Mappings Summary:');
    console.log(`   Total Questions: ${mappingsData.summary.totalQuestions}`);
    console.log(`   Questions with Mappings: ${mappingsData.summary.questionsWithMappings}`);
    console.log(`   Questions without Mappings: ${mappingsData.summary.questionsWithoutMappings}`);
    console.log(`   Mapping Coverage: ${mappingsData.summary.mappingPercentage}%\n`);

    if (mappingsData.questionsWithMappings.length > 0) {
      console.log('✅ Mappings Found:');
      mappingsData.questionsWithMappings.forEach((q) => {
        console.log(`   - ${q.label} (${q.id}) → ${q.ghlFieldMapping}`);
      });
    } else {
      console.log('⚠️  No field mappings configured yet!');
      console.log('   Please configure mappings in the Survey Builder UI.\n');
      return;
    }

    // Step 2: Create a test quote
    console.log('\n\nStep 2: Creating test quote with sample data...');
    const testData = {
      firstName: 'Test',
      lastName: 'Mapping',
      email: `test-mapping-${Date.now()}@example.com`,
      phone: '+15551234567',
      address: '123 Test Street, Raleigh, NC 27601',
      squareFeet: 'Less Than 1500',
      serviceType: 'general',
      frequency: 'bi-weekly',
      bedrooms: 3,
      fullBaths: 2,
      halfBaths: 1,
      people: 2,
      sheddingPets: 1,
      condition: 'good',
      hasPreviousService: 'yes',
      cleanedWithin3Months: 'yes',
    };

    console.log('   Sending test data:', JSON.stringify(testData, null, 2));

    const quoteResponse = await fetch(`${BASE_URL}/api/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('❌ Failed to create quote:', errorText);
      return;
    }

    const quoteData = await quoteResponse.json();
    console.log('\n✅ Quote created successfully!');
    console.log(`   Quote ID: ${quoteData.quoteId}`);
    console.log(`   Contact ID: ${quoteData.ghlContactId || 'Not available'}`);

    // Step 3: Verify data in GHL (if contactId is available)
    if (quoteData.ghlContactId) {
      console.log('\n\nStep 3: Verifying data in GHL...');
      console.log(`   Contact ID: ${quoteData.ghlContactId}`);
      console.log('   ✅ Contact created in GHL');
      console.log('   📝 Check the contact in GHL to verify custom fields were mapped correctly.');
      console.log(`   🔗 You can view the quote at: ${BASE_URL}/quote/${quoteData.quoteId}`);
    } else {
      console.log('\n⚠️  Contact ID not available - cannot verify GHL data');
      console.log('   This might indicate an issue with contact creation.');
    }

    console.log('\n\n✅ Test complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Check the GHL contact to verify custom fields were populated');
    console.log('   2. Check server logs for detailed mapping information');
    console.log('   3. If fields are missing, verify the field keys match your GHL custom fields');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFieldMappings();
