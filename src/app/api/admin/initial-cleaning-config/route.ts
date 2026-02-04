import { NextRequest, NextResponse } from 'next/server';
import { getInitialCleaningConfig, setInitialCleaningConfig } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET /api/admin/initial-cleaning-config
 * Retrieve Initial Cleaning configuration
 */
export async function GET() {
  try {
    const config = await getInitialCleaningConfig();

    if (!config) {
      return NextResponse.json({
        multiplier: 1.5,
        requiredConditions: ['poor'],
        recommendedConditions: ['fair'],
        sheddingPetsMultiplier: 1.1,
        peopleMultiplier: 1.05,
      });
    }

    const configWithDefaults = {
      ...config,
      sheddingPetsMultiplier: config.sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: config.peopleMultiplier ?? 1.05,
    };
    return NextResponse.json(configWithDefaults);
  } catch (error) {
    console.error('Error fetching Initial Cleaning config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Initial Cleaning configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/initial-cleaning-config
 * Save Initial Cleaning configuration
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { multiplier, requiredConditions, recommendedConditions, sheddingPetsMultiplier, peopleMultiplier } = body;

    // Validate multiplier
    if (typeof multiplier !== 'number' || multiplier < 1.0 || multiplier > 3.0) {
      return NextResponse.json(
        { error: 'Multiplier must be between 1.0 and 3.0' },
        { status: 400 }
      );
    }

    // Validate shedding pets multiplier
    if (sheddingPetsMultiplier !== undefined && (typeof sheddingPetsMultiplier !== 'number' || sheddingPetsMultiplier < 1.0 || sheddingPetsMultiplier > 2.0)) {
      return NextResponse.json(
        { error: 'Shedding pets multiplier must be between 1.0 and 2.0' },
        { status: 400 }
      );
    }

    // Validate people multiplier
    if (peopleMultiplier !== undefined && (typeof peopleMultiplier !== 'number' || peopleMultiplier < 1.0 || peopleMultiplier > 2.0)) {
      return NextResponse.json(
        { error: 'People multiplier must be between 1.0 and 2.0' },
        { status: 400 }
      );
    }

    // Validate conditions
    if (!Array.isArray(requiredConditions) || !Array.isArray(recommendedConditions)) {
      return NextResponse.json(
        { error: 'Conditions must be arrays' },
        { status: 400 }
      );
    }

    const config = {
      multiplier,
      requiredConditions: requiredConditions.map((c: string) => c.toLowerCase()),
      recommendedConditions: recommendedConditions.map((c: string) => c.toLowerCase()),
      sheddingPetsMultiplier: sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: peopleMultiplier ?? 1.05,
    };

    await setInitialCleaningConfig(config);

    console.log('Initial Cleaning config saved:', config);

    return NextResponse.json({
      success: true,
      message: 'Initial Cleaning configuration saved successfully',
      config,
    });
  } catch (error) {
    console.error('Error saving Initial Cleaning config:', error);
    return NextResponse.json(
      { error: 'Failed to save Initial Cleaning configuration' },
      { status: 500 }
    );
  }
}
