/**
 * GHL OAuth session handling
 * Session cookie contains locationId, companyId, userId from GHL install.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret-change-in-production';
const ALGORITHM = 'HS256';
export const GHL_SESSION_COOKIE = 'ghl_session';
const COOKIE_NAME = GHL_SESSION_COOKIE;
const SESSION_EXPIRY = '7d'; // 7 days

export interface GHLSession {
  locationId: string;
  companyId: string;
  userId: string;
}

/**
 * Create a signed session JWT for the given GHL install data.
 */
export async function createSessionToken(data: GHLSession): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(secret);
}

/**
 * Verify session token and return payload.
 */
export async function verifySessionToken(token: string): Promise<GHLSession | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });
    const { locationId, companyId, userId } = payload;
    if (typeof locationId !== 'string' || !locationId) return null;
    return {
      locationId,
      companyId: typeof companyId === 'string' ? companyId : '',
      userId: typeof userId === 'string' ? userId : '',
    };
  } catch {
    return null;
  }
}

/**
 * Get current GHL session from cookie (for server components / route handlers).
 */
export async function getSession(): Promise<GHLSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Set session cookie with the given token.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
