import { NextRequest, NextResponse } from 'next/server';
import { storeGHLToken, storeGHLLocationId, ghlTokenExists, getGHLToken, getGHLLocationId } from '@/lib/kv';
import { testGHLConnection } from '@/lib/ghl/client';

/**
 * Authenticate request with admin password
 */
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
 * GET - Retrieve GHL token status and connection info
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const tokenExists = await ghlTokenExists().catch(() => false);

    if (!tokenExists) {
      return NextResponse.json({
        configured: false,
        message: 'GHL API token not configured',
      });
    }

    // Test connection
    const testResult = await testGHLConnection().catch(() => ({ success: false }));
    const isConnected = testResult.success;

    // Return masked token (last 4 chars) and locationId
    try {
      const token = await getGHLToken();
      const maskedToken = token ? `****${token.slice(-4)}` : 'Unknown';
      const locationId = await getGHLLocationId().catch(() => null);

      return NextResponse.json({
        configured: true,
        connected: isConnected,
        maskedToken,
        locationId,
        status: isConnected ? 'Connected' : 'Not Connected',
      });
    } catch {
      return NextResponse.json({
        configured: true,
        connected: false,
        status: 'Error retrieving token',
      });
    }
  } catch (error) {
    console.error('Error getting GHL settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to get GHL settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save GHL API token
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { token, locationId } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      );
    }

    if (token.length < 20) {
      return NextResponse.json(
        { error: 'Token appears to be invalid (too short)' },
        { status: 400 }
      );
    }

    // Save locationId if provided (optional for location-level tokens)
    if (locationId && typeof locationId === 'string' && locationId.trim()) {
      await storeGHLLocationId(locationId.trim());
    }

    // Test connection with the new token before saving
    let testResult;
    try {
      testResult = await testGHLConnection(token);
    } catch (error) {
      console.error('Token test error:', error);
      testResult = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed unexpectedly' 
      };
    }

    if (!testResult.success) {
      console.error('Token validation failed:', testResult.error);
      return NextResponse.json(
        { 
          error: 'Invalid GHL API token - connection test failed',
          details: testResult.error || 'Please check your token and ensure it has the required scopes'
        },
        { status: 400 }
      );
    }

    // Save token
    await storeGHLToken(token);

    return NextResponse.json({
      success: true,
      message: 'GHL API token saved successfully',
      configured: true,
      connected: true,
    });
  } catch (error) {
    console.error('Error saving GHL token:', error);
    return NextResponse.json(
      {
        error: 'Failed to save GHL token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /test - Test GHL connection
 */
export async function PUT(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const tokenExists = await ghlTokenExists().catch(() => false);

    if (!tokenExists) {
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    const testResult = await testGHLConnection();

    return NextResponse.json({
      success: testResult.success,
      connected: testResult.success,
      message: testResult.success ? 'Connected to GHL successfully' : (testResult.error || 'Failed to connect to GHL'),
      error: testResult.error,
    });
  } catch (error) {
    console.error('Error testing GHL connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test GHL connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
