#!/usr/bin/env node

/**
 * Verify GHL contact custom fields
 * This script fetches a contact from GHL and shows what custom fields were populated
 */

import { getKV } from './src/lib/kv.js';
import { getContactById } from './src/lib/ghl/client.js';

const contactId = process.argv[2] || 'FKgcBSGLyIcWB7HJew02';

async function verifyContact() {
  console.log(`🔍 Verifying GHL Contact: ${contactId}\n`);

  try {
    const contact = await getContactById(contactId);
    
    console.log('✅ Contact Found in GHL\n');
    console.log('📋 Contact Details:');
    console.log(`   Name: ${contact.firstName} ${contact.lastName}`);
    console.log(`   Email: ${contact.email || 'N/A'}`);
    console.log(`   Phone: ${contact.phone || 'N/A'}`);
    console.log(`   Address: ${contact.address1 || 'N/A'}\n`);

    // Check custom fields
    const customFields = contact.customFields || {};
    const customFieldKeys = Object.keys(customFields);

    if (customFieldKeys.length > 0) {
      console.log('✅ Custom Fields Found:');
      customFieldKeys.forEach((key) => {
        console.log(`   - ${key}: ${customFields[key]}`);
      });
    } else {
      console.log('⚠️  No custom fields found on this contact');
      console.log('   This might indicate:');
      console.log('   1. Mappings are not configured correctly');
      console.log('   2. Field keys don\'t match GHL custom field keys');
      console.log('   3. Data was not sent during contact creation');
    }

    // Check for expected mapped fields
    const expectedMappings = [
      'type_of_cleaning_service_needed',
      'cleaning_frequency_selected',
      'how_many_full_baths',
      'half_bath_number',
    ];

    console.log('\n📊 Mapping Verification:');
    expectedMappings.forEach((field) => {
      if (customFields[field]) {
        console.log(`   ✅ ${field}: ${customFields[field]}`);
      } else {
        console.log(`   ❌ ${field}: NOT FOUND`);
      }
    });

  } catch (error) {
    console.error('❌ Error fetching contact:', error.message);
    console.error('\nThis might indicate:');
    console.error('  1. Contact ID is incorrect');
    console.error('  2. GHL API credentials are not configured');
    console.error('  3. Contact was not created successfully');
  }
}

verifyContact();
