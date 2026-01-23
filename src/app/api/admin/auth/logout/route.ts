import { NextRequest, NextResponse } from 'next/server';
import { revokeAuthToken } from '@/lib/security/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/auth/logout
 * 
 * Revoke current session token
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await revokeAuthToken(token);
    }

    // Clear cookie
    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      {
        status: 200,
        headers: {
          'Set-Cookie': 'admin_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
        },
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
