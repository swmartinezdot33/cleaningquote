import { NextRequest, NextResponse } from 'next/server';
import { getContactById } from '@/lib/ghl/client';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * POST - Verify mappings by checking a GHL contact
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Fetch contact from GHL
    const contact = await getContactById(contactId);
    
    // Get survey questions to see expected mappings
    const surveyQuestions = await getSurveyQuestions();
    const questionsWithMappings = surveyQuestions.filter(
      q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== ''
    );

    // Check which mapped fields are present in the contact
    const customFields = contact.customFields || {};
    const mappingResults = questionsWithMappings.map(q => {
      const mapping = q.ghlFieldMapping!.trim();
      // Strip prefix if present
      const fieldKey = mapping.replace(/^(contact|opportunity)\./, '');
      const valueInGHL = customFields[fieldKey];
      
      return {
        questionId: q.id,
        questionLabel: q.label,
        ghlFieldMapping: mapping,
        fieldKey: fieldKey,
        found: !!valueInGHL,
        value: valueInGHL || null,
      };
    });

    const foundCount = mappingResults.filter(r => r.found).length;
    const missingCount = mappingResults.filter(r => !r.found).length;

    return NextResponse.json({
      success: true,
      contactId: contactId,
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
      summary: {
        totalMappings: questionsWithMappings.length,
        found: foundCount,
        missing: missingCount,
        successRate: questionsWithMappings.length > 0 
          ? Math.round((foundCount / questionsWithMappings.length) * 100) 
          : 0,
      },
      mappingResults: mappingResults,
      allCustomFields: customFields,
    });
  } catch (error) {
    console.error('Error verifying mappings:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify mappings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
