import { NextRequest, NextResponse } from 'next/server';
import { createTag } from '@/lib/ghl/client';

function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * POST - Create a new tag in GHL
 */
export async function POST(request: NextRequest) {
  const authResponse = authenticate(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    console.log('[GHL Tags Create] Creating tag:', name.trim());
    const tag = await createTag(name.trim());
    console.log('[GHL Tags Create] Tag created:', tag);

    return NextResponse.json({
      success: true,
      tag,
      message: 'Tag created successfully',
    });
  } catch (error) {
    console.error('[GHL Tags Create] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Failed to create tag in GHL',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
