/**
 * Script to fetch all GHL objects and their schemas
 * Run with: node fetch-ghl-objects.mjs
 */

import { getGHLToken, getGHLLocationId } from './src/lib/kv.ts';
import { makeGHLRequest } from './src/lib/ghl/client.ts';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

async function fetchGHLObjects() {
  try {
    console.log('🔍 Fetching GHL objects...\n');

    const locationId = await getGHLLocationId();
    const token = await getGHLToken();

    if (!locationId) {
      console.error('❌ Location ID not configured');
      process.exit(1);
    }

    if (!token) {
      console.error('❌ GHL token not configured');
      process.exit(1);
    }

    console.log(`📍 Location ID: ${locationId}`);
    console.log(`🔑 Token: ${token.substring(0, 10)}...\n`);

    // Try multiple endpoints to list objects
    const endpointsToTry = [
      `/objects?locationId=${locationId}`,
      `/objects/${locationId}`,
      `/objects`,
      `/v2/locations/${locationId}/objects`,
    ];

    let allObjects = [];
    let successfulEndpoint = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Trying: ${endpoint}`);
        const url = `${GHL_API_BASE}${endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          console.log(`   ❌ ${response.status}: ${responseText.substring(0, 100)}\n`);
          continue;
        }

        const data = JSON.parse(responseText);
        const objects = data.objects || data.data || data.schemas || (Array.isArray(data) ? data : []);
        
        if (objects && objects.length > 0) {
          allObjects = objects;
          successfulEndpoint = endpoint;
          console.log(`   ✅ Success! Found ${objects.length} objects\n`);
          break;
        } else {
          console.log(`   ⚠️  Empty response\n`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    if (allObjects.length === 0) {
      console.log('❌ Could not fetch objects from any endpoint.\n');
      console.log('This might mean:');
      console.log('  - The /objects endpoint requires different authentication');
      console.log('  - Your token lacks the required scope');
      console.log('  - The endpoint format is different\n');
      
      // Try to fetch "quotes" schema directly
      console.log('Trying to fetch "quotes" schema directly...\n');
      await fetchSchemaDirectly('quotes', locationId, token);
      return;
    }

    console.log(`📊 Found ${allObjects.length} objects:\n`);
    allObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name || obj.key || 'Unknown'} (key: ${obj.key || obj.schemaKey || 'N/A'})`);
    });

    // Look for quote-related objects
    const quoteObjects = allObjects.filter((obj) => {
      const key = (obj.key || obj.schemaKey || obj.name || '').toLowerCase();
      return key.includes('quote');
    });

    if (quoteObjects.length > 0) {
      console.log(`\n🎯 Found ${quoteObjects.length} quote-related object(s):\n`);
      quoteObjects.forEach((obj) => {
        console.log(`   - ${obj.name || 'Unknown'} (key: ${obj.key || obj.schemaKey})`);
      });
    }

    // Fetch detailed schemas
    console.log('\n📋 Fetching detailed schemas...\n');
    const detailedSchemas = [];

    for (const obj of allObjects) {
      const schemaKey = obj.key || obj.schemaKey || obj.name || obj.id;
      if (!schemaKey) continue;

      try {
        console.log(`Fetching schema for: ${schemaKey}...`);
        const schema = await fetchSchemaDirectly(schemaKey, locationId, token);
        if (schema) {
          detailedSchemas.push({
            schemaKey,
            name: obj.name,
            fields: schema.fields || schema.properties || [],
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Could not fetch: ${error.message}`);
      }
    }

    // Output results
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 DETAILED RESULTS');
    console.log('='.repeat(80) + '\n');

    const result = {
      success: true,
      locationId,
      successfulEndpoint,
      totalObjects: allObjects.length,
      allObjects: allObjects.map((obj) => ({
        key: obj.key || obj.schemaKey,
        name: obj.name,
        id: obj.id,
      })),
      quoteObjects: quoteObjects.map((obj) => ({
        key: obj.key || obj.schemaKey,
        name: obj.name,
        id: obj.id,
      })),
      detailedSchemas: detailedSchemas.map((schema) => ({
        schemaKey: schema.schemaKey,
        name: schema.name,
        fieldCount: schema.fields.length,
        fields: schema.fields.map((field) => ({
          key: field.key,
          name: field.name,
          id: field.id,
          type: field.type,
          required: field.required,
        })),
      })),
    };

    console.log(JSON.stringify(result, null, 2));

    // Also save to file
    const fs = await import('fs');
    fs.writeFileSync('ghl-objects-debug.json', JSON.stringify(result, null, 2));
    console.log('\n\n✅ Results saved to: ghl-objects-debug.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function fetchSchemaDirectly(schemaKey, locationId, token) {
  const endpoints = [
    `/objects/${schemaKey}?locationId=${locationId}`,
    `/objects/${schemaKey}/${locationId}`,
    `/objects/${schemaKey}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${GHL_API_BASE}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success!`);
        return data;
      }
    } catch (error) {
      // Try next endpoint
    }
  }
  
  return null;
}

fetchGHLObjects();
