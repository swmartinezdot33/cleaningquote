/**
 * Quick test script to fetch GHL objects
 * Run with: node test-ghl-objects.js
 * 
 * Make sure to set ADMIN_PASSWORD in your .env or pass it as an env var
 */

const fetch = require('node-fetch');

async function testGHLObjects() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'your-admin-password';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  console.log('🔍 Fetching GHL objects...');
  console.log('URL:', `${baseUrl}/api/admin/ghl-objects-debug`);
  
  try {
    const response = await fetch(`${baseUrl}/api/admin/ghl-objects-debug`, {
      method: 'GET',
      headers: {
        'x-admin-password': adminPassword,
      },
    });

    const data = await response.json();
    
    console.log('\n📊 RESULTS:\n');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.detailedSchemas) {
      console.log('\n✅ Found schemas:');
      data.detailedSchemas.forEach((schema) => {
        console.log(`\n📋 Schema: ${schema.schemaKey} (${schema.name})`);
        console.log(`   Fields (${schema.fieldCount}):`);
        schema.fields.forEach((field) => {
          console.log(`   - ${field.key || field.name || field.id} (${field.type})`);
          if (field.key !== field.name && field.name) {
            console.log(`     Name: ${field.name}`);
          }
          if (field.id) {
            console.log(`     ID: ${field.id}`);
          }
        });
      });
    }
    
    if (data.quoteObjects && data.quoteObjects.length > 0) {
      console.log('\n🎯 Quote-related objects found:');
      data.quoteObjects.forEach((obj) => {
        console.log(`   - Key: ${obj.key}, Name: ${obj.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGHLObjects();
