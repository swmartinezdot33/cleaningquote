import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getInitialCleaningConfig, setInitialCleaningConfig } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const config = await getInitialCleaningConfig(auth.tool.id);
    if (!config) {
      return NextResponse.json({
        multiplier: 1.5,
        requiredConditions: ['poor'],
        recommendedConditions: ['fair'],
        sheddingPetsMultiplier: 1.1,
        peopleMultiplier: 1.05,
        peopleMultiplierBase: 4,
        sheddingPetsMultiplierBase: 0,
      });
    }
    return NextResponse.json({
      ...config,
      sheddingPetsMultiplier: config.sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: config.peopleMultiplier ?? 1.05,
      peopleMultiplierBase: config.peopleMultiplierBase ?? 4,
      sheddingPetsMultiplierBase: config.sheddingPetsMultiplierBase ?? 0,
    });
  } catch (e) {
    console.error('GET dashboard initial-cleaning-config:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      multiplier,
      requiredConditions,
      recommendedConditions,
      sheddingPetsMultiplier,
      peopleMultiplier,
      peopleMultiplierBase,
      sheddingPetsMultiplierBase,
    } = body;

    if (typeof multiplier !== 'number' || multiplier < 1.0 || multiplier > 3.0) {
      return NextResponse.json({ error: 'Multiplier must be between 1.0 and 3.0' }, { status: 400 });
    }
    if (sheddingPetsMultiplier !== undefined && (typeof sheddingPetsMultiplier !== 'number' || sheddingPetsMultiplier < 1.0 || sheddingPetsMultiplier > 2.0)) {
      return NextResponse.json({ error: 'Shedding pets multiplier must be between 1.0 and 2.0' }, { status: 400 });
    }
    if (peopleMultiplier !== undefined && (typeof peopleMultiplier !== 'number' || peopleMultiplier < 1.0 || peopleMultiplier > 2.0)) {
      return NextResponse.json({ error: 'People multiplier must be between 1.0 and 2.0' }, { status: 400 });
    }
    if (peopleMultiplierBase !== undefined && (typeof peopleMultiplierBase !== 'number' || peopleMultiplierBase < 0 || peopleMultiplierBase > 20)) {
      return NextResponse.json({ error: 'People multiplier base must be between 0 and 20' }, { status: 400 });
    }
    if (sheddingPetsMultiplierBase !== undefined && (typeof sheddingPetsMultiplierBase !== 'number' || sheddingPetsMultiplierBase < 0 || sheddingPetsMultiplierBase > 10)) {
      return NextResponse.json({ error: 'Shedding pets multiplier base must be between 0 and 10' }, { status: 400 });
    }
    if (!Array.isArray(requiredConditions) || !Array.isArray(recommendedConditions)) {
      return NextResponse.json({ error: 'Conditions must be arrays' }, { status: 400 });
    }

    const config = {
      multiplier,
      requiredConditions: requiredConditions.map((c: string) => String(c).toLowerCase()),
      recommendedConditions: recommendedConditions.map((c: string) => String(c).toLowerCase()),
      sheddingPetsMultiplier: sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: peopleMultiplier ?? 1.05,
      peopleMultiplierBase: peopleMultiplierBase ?? 4,
      sheddingPetsMultiplierBase: sheddingPetsMultiplierBase ?? 0,
    };

    await setInitialCleaningConfig(config, auth.tool.id);
    return NextResponse.json({ success: true, message: 'Initial Cleaning configuration saved', config });
  } catch (e) {
    console.error('POST dashboard initial-cleaning-config:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}
