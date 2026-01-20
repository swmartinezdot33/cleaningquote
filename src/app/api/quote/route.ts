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

    const result = calcQuote(inputs);

    if (result.outOfLimits) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message,
      });
    }

    // Generate formatted text
    const summaryText = generateSummaryText(result as typeof result & { ranges: typeof result.ranges });
    const smsText = generateSmsText(result as typeof result & { ranges: typeof result.ranges });

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
    return NextResponse.json(
      { error: 'Failed to calculate quote. Please check the pricing data file.' },
      { status: 500 }
    );
  }
}
