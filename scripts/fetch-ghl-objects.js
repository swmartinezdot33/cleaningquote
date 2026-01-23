/**
 * Script to fetch all GHL objects and their schemas
 * Run with: npm run fetch-ghl-objects
 * 
 * This script uses the existing GHL client to fetch objects
 */

require('dotenv').config({ path: '.env.local' });

async function fetchGHLObjects() {
  try {
    // Import the functions we need
    const { getGHLToken, getGHLLocationId } = require('../src/lib/kv.ts');
    const { makeGHLRequest } = require('../src/lib/ghl/client.ts');

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

    const GHL_API_BASE = 'https://services.leadconnectorhq.com';

    // Try multiple endpoints to list objects
    const endpointsToTry = [
      `/objects?locationId=${locationId}`,
      `/objects/${locationId}`,
      `/objects`,
    ];

    let allObjects = [];
    let successfulEndpoint = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Trying: ${endpoint}`);
        const response = await makeGHLRequest(endpoint, 'GET');
        const objects = response.objects || response.data || response.schemas || 
                       (Array.isArray(response) ? response : []);
        
        if (objects && objects.length > 0) {
          allObjects = objects;
          successfulEndpoint = endpoint;
          console.log(`   ✅ Success! Found ${objects.length} objects\n`);
          break;
        }
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }

    if (allObjects.length === 0) {
      console.log('⚠️  Could not list objects. Trying to fetch "quotes" schema directly...\n');
      // Try direct fetch
      try {
        const schema = await makeGHLRequest(`/objects/quotes?locationId=${locationId}`, 'GET');
        console.log('✅ Successfully fetched "quotes" schema directly!\n');
        console.log(JSON.stringify(schema, null, 2));
        return;
      } catch (error) {
        console.log(`❌ Could not fetch "quotes" schema: ${error.message}\n`);
        return;
      }
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

    // Fetch detailed schemas for quote objects
    if (quoteObjects.length > 0) {
      console.log('\n📋 Fetching detailed schemas for quote objects...\n');
      
      for (const obj of quoteObjects) {
        const schemaKey = obj.key || obj.schemaKey;
        try {
          console.log(`Fetching schema for: ${schemaKey}...`);
          const schema = await makeGHLRequest(`/objects/${schemaKey}?locationId=${locationId}`, 'GET');
          
          console.log(`\n✅ Schema for "${schemaKey}":\n`);
          console.log(JSON.stringify({
            schemaKey,
            name: obj.name,
            fields: (schema.fields || schema.properties || []).map(f => ({
              key: f.key,
              name: f.name,
              id: f.id,
              type: f.type,
            })),
          }, null, 2));
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fetchGHLObjects();
