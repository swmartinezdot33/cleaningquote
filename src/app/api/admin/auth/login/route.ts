import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, getClientIP } from '@/lib/security/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/auth/login
 * 
 * Authenticate admin user and return JWT token
 * Includes rate limiting to prevent brute force attacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIP(request);
    const result = await authenticateAdmin(password, ipAddress);

    if (!result.success) {
      const response: any = { error: result.error };
      
      if (result.retryAfter) {
        response.retryAfter = result.retryAfter;
        response.message = `Too many login attempts. Please try again in ${Math.ceil(result.retryAfter / 60)} minutes.`;
      }

      return NextResponse.json(response, { 
        status: 401,
        headers: result.retryAfter ? {
          'Retry-After': result.retryAfter.toString(),
        } : undefined,
      });
    }

    // Return token in response body (client should store securely)
    return NextResponse.json({
      success: true,
      token: result.token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    }, {
      status: 200,
      // Also set as HTTP-only cookie for additional security
      headers: {
        'Set-Cookie': `admin_token=${result.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}; Path=/`,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
