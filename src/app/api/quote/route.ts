import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs } from '@/lib/pricing/types';

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

    return NextResponse.json({
      outOfLimits: false,
      multiplier: result.multiplier,
      inputs: result.inputs,
      ranges: result.ranges,
      summaryText,
      smsText,
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
