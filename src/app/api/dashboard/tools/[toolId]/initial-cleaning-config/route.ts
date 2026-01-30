import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getKV, toolKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'admin:initial-cleaning-config';

interface InitialCleaningConfig {
  multiplier: number;
  requiredConditions: string[];
  recommendedConditions: string[];
  sheddingPetsMultiplier?: number;
  peopleMultiplier?: number;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const kv = getKV();
    const config = await kv.get<InitialCleaningConfig>(toolKey(auth.tool.id, KEY));
    if (!config) {
      return NextResponse.json({
        multiplier: 1.5,
        requiredConditions: ['poor'],
        recommendedConditions: ['fair'],
        sheddingPetsMultiplier: 1.1,
        peopleMultiplier: 1.05,
      });
    }
    return NextResponse.json({
      ...config,
      sheddingPetsMultiplier: config.sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: config.peopleMultiplier ?? 1.05,
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
    const { multiplier, requiredConditions, recommendedConditions, sheddingPetsMultiplier, peopleMultiplier } = body;

    if (typeof multiplier !== 'number' || multiplier < 1.0 || multiplier > 3.0) {
      return NextResponse.json({ error: 'Multiplier must be between 1.0 and 3.0' }, { status: 400 });
    }
    if (sheddingPetsMultiplier !== undefined && (typeof sheddingPetsMultiplier !== 'number' || sheddingPetsMultiplier < 1.0 || sheddingPetsMultiplier > 2.0)) {
      return NextResponse.json({ error: 'Shedding pets multiplier must be between 1.0 and 2.0' }, { status: 400 });
    }
    if (peopleMultiplier !== undefined && (typeof peopleMultiplier !== 'number' || peopleMultiplier < 1.0 || peopleMultiplier > 2.0)) {
      return NextResponse.json({ error: 'People multiplier must be between 1.0 and 2.0' }, { status: 400 });
    }
    if (!Array.isArray(requiredConditions) || !Array.isArray(recommendedConditions)) {
      return NextResponse.json({ error: 'Conditions must be arrays' }, { status: 400 });
    }

    const config: InitialCleaningConfig = {
      multiplier,
      requiredConditions: requiredConditions.map((c: string) => String(c).toLowerCase()),
      recommendedConditions: recommendedConditions.map((c: string) => String(c).toLowerCase()),
      sheddingPetsMultiplier: sheddingPetsMultiplier ?? 1.1,
      peopleMultiplier: peopleMultiplier ?? 1.05,
    };

    const kv = getKV();
    await kv.set(toolKey(auth.tool.id, KEY), config);
    return NextResponse.json({ success: true, message: 'Initial Cleaning configuration saved', config });
  } catch (e) {
    console.error('POST dashboard initial-cleaning-config:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save config' },
      { status: 500 }
    );
  }
}
