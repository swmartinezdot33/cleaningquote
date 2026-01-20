import { NextRequest, NextResponse } from 'next/server';
import { getKV } from '@/lib/kv';

interface InitialCleaningConfig {
  multiplier: number;
  requiredConditions: string[];
  recommendedConditions: string[];
}

const INITIAL_CLEANING_CONFIG_KEY = 'admin:initial-cleaning-config';

/**
 * GET /api/admin/initial-cleaning-config
 * Retrieve Initial Cleaning configuration
 */
export async function GET() {
  try {
    const kv = getKV();
    const config = await kv.get<InitialCleaningConfig>(INITIAL_CLEANING_CONFIG_KEY);

    if (!config) {
      // Return default config if not set
      return NextResponse.json({
        multiplier: 1.5,
        requiredConditions: ['poor'],
        recommendedConditions: ['fair'],
      });
    }

    return NextResponse.json(config);
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
    // Check authentication
    const password = request.headers.get('x-admin-password');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { multiplier, requiredConditions, recommendedConditions } = body;

    // Validate multiplier
    if (typeof multiplier !== 'number' || multiplier < 1.0 || multiplier > 3.0) {
      return NextResponse.json(
        { error: 'Multiplier must be between 1.0 and 3.0' },
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

    const config: InitialCleaningConfig = {
      multiplier,
      requiredConditions: requiredConditions.map((c: string) => c.toLowerCase()),
      recommendedConditions: recommendedConditions.map((c: string) => c.toLowerCase()),
    };

    const kv = getKV();
    await kv.set(INITIAL_CLEANING_CONFIG_KEY, config);

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
