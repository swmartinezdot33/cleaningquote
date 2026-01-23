#!/bin/bash

echo "🧪 Testing Quote Flow..."
echo ""

# Test 1: Contact Creation
echo "1️⃣ Testing contact creation..."
TIMESTAMP=$(date +%s)
CONTACT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/contacts/create-or-update \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"test${TIMESTAMP}@example.com\",
    \"phone\": \"555-123-4567\",
    \"address\": \"123 Test St\",
    \"city\": \"Raleigh\",
    \"state\": \"NC\",
    \"postalCode\": \"27601\"
  }")

echo "Contact Response:"
echo "$CONTACT_RESPONSE" | jq '.' 2>/dev/null || echo "$CONTACT_RESPONSE"
echo ""

# Extract contact ID if available
CONTACT_ID=$(echo "$CONTACT_RESPONSE" | grep -o '"ghlContactId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$CONTACT_ID" ]; then
  echo "✅ Contact ID: $CONTACT_ID"
else
  echo "⚠️ No contact ID in response"
fi
echo ""

# Test 2: Quote Creation
echo "2️⃣ Testing quote creation..."
QUOTE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"test${TIMESTAMP}@example.com\",
    \"phone\": \"555-123-4567\",
    \"address\": \"123 Test St\",
    \"city\": \"Raleigh\",
    \"state\": \"NC\",
    \"postalCode\": \"27601\",
    \"squareFeet\": \"1500-2000\",
    \"serviceType\": \"general\",
    \"frequency\": \"weekly\",
    \"fullBaths\": \"2\",
    \"halfBaths\": \"1\",
    \"bedrooms\": \"3\",
    \"people\": \"2\",
    \"sheddingPets\": \"1\",
    \"condition\": \"good\",
    \"hasPreviousService\": \"false\",
    \"cleanedWithin3Months\": \"no\"
  }")

echo "Quote Response:"
echo "$QUOTE_RESPONSE" | jq '.' 2>/dev/null || echo "$QUOTE_RESPONSE"
echo ""

# Extract quote ID if available
QUOTE_ID=$(echo "$QUOTE_RESPONSE" | grep -o '"quoteId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$QUOTE_ID" ]; then
  echo "✅ Quote ID: $QUOTE_ID"
  echo "   View quote: http://localhost:3000/quote/$QUOTE_ID"
else
  echo "⚠️ No quote ID in response"
fi
echo ""

echo "✅ Test complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Check server logs for GHL API calls"
echo "   2. Verify contact in GHL dashboard"
echo "   3. Verify quote custom object in GHL"
echo "   4. Check if quote is associated with contact"
echo ""
