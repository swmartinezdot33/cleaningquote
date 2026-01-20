import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs } from '@/lib/pricing/types';
import { createOrUpdateContact, createOpportunity, createNote } from '@/lib/ghl/client';
import { ghlTokenExists } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs: QuoteInputs = {
      squareFeet: Number(body.squareFeet),
      people: Number(body.people),
      pets: Number(body.pets),
      sheddingPets: Number(body.sheddingPets),
    };

    const result = await calcQuote(inputs);

    if (result.outOfLimits || !result.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message || 'Unable to calculate quote.',
      });
    }

    // At this point, TypeScript knows ranges is defined
    const summaryText = generateSummaryText({ ...result, ranges: result.ranges });
    const smsText = generateSmsText({ ...result, ranges: result.ranges });

    // Attempt GHL integration (non-blocking)
    let ghlContactId: string | undefined;
    const hasGHLToken = await ghlTokenExists().catch(() => false);
    
    if (hasGHLToken) {
      try {
        // Create/update contact in GHL
        const contact = await createOrUpdateContact({
          firstName: body.firstName || 'Unknown',
          lastName: body.lastName || 'Customer',
          email: body.email,
          phone: body.phone,
          source: 'Website Quote Form',
          tags: [
            'Quote Request',
            body.serviceType || 'Unknown Service',
            body.frequency || 'Unknown Frequency',
          ].filter(Boolean),
        });

        ghlContactId = contact.id;

        // Create opportunity with quote value
        const opportunityValue = result.ranges
          ? Math.round(
              (result.ranges.weekly.high +
                result.ranges.biWeekly.high +
                result.ranges.fourWeek.high) /
                3
            )
          : 0;

        const opportunityName = `Cleaning Quote - ${body.serviceType || 'General'} - ${body.frequency || 'TBD'}`;

        await createOpportunity({
          contactId: ghlContactId,
          name: opportunityName,
          value: opportunityValue,
          status: 'open',
          customFields: {
            squareFeet: String(body.squareFeet),
            beds: String(body.bedrooms || 0),
            baths: String((body.fullBaths || 0) + (body.halfBaths || 0) * 0.5),
            condition: body.condition || 'Unknown',
          },
        });

        // Create note with detailed quote information
        const noteBody = `Quote Generated from Website Form\n\n${summaryText}`;

        await createNote({
          contactId: ghlContactId,
          body: noteBody,
        });

        console.log('Successfully synced quote to GHL for contact:', ghlContactId);
      } catch (ghlError) {
        console.warn('GHL integration failed (quote still delivered):', ghlError);
        // Don't throw - we still want to deliver the quote to the customer
      }
    }

    return NextResponse.json({
      outOfLimits: false,
      multiplier: result.multiplier,
      inputs: result.inputs,
      ranges: result.ranges,
      summaryText,
      smsText,
      ghlContactId,
    });
  } catch (error) {
    console.error('Error calculating quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Failed to calculate quote. Please check the pricing data file.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
