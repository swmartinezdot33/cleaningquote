/**
 * Secure Authentication System
 * 
 * Implements JWT-based authentication with secure session management
 * to replace plain password in headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { getKV } from '@/lib/kv';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'fallback-secret-change-in-production';
const JWT_ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '24h'; // 24 hours
const SESSION_KEY_PREFIX = 'session:';

// Rate limiting storage
const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Create a JWT token for authenticated admin session
 */
export async function createAuthToken(adminPassword: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({ 
    type: 'admin',
    authenticated: true,
    timestamp: Date.now()
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);

  // Store session in KV for revocation capability
  try {
    const kv = getKV();
    const sessionKey = `${SESSION_KEY_PREFIX}${token.substring(0, 20)}`;
    // Vercel KV uses set with expiration in seconds
    await kv.set(sessionKey, 'active', { ex: 24 * 60 * 60 }); // 24 hours
  } catch (error) {
    // If KV not available, continue without session storage
    console.warn('Could not store session in KV:', error);
  }

  return token;
}

/**
 * Verify JWT token and check session validity
 */
export async function verifyAuthToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALGORITHM],
    });

    // Check if session is revoked
    try {
      const kv = getKV();
      const sessionKey = `${SESSION_KEY_PREFIX}${token.substring(0, 20)}`;
      const sessionStatus = await kv.get(sessionKey);
      if (sessionStatus !== 'active') {
        return { valid: false };
      }
    } catch (error) {
      // If KV not available, continue without session check
      console.warn('Could not check session in KV:', error);
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Revoke a session token
 */
export async function revokeAuthToken(token: string): Promise<void> {
  try {
    const kv = getKV();
    const sessionKey = `${SESSION_KEY_PREFIX}${token.substring(0, 20)}`;
    await kv.del(sessionKey);
  } catch (error) {
    console.warn('Could not revoke session in KV:', error);
  }
}

/**
 * Authenticate admin login with password
 * Includes rate limiting to prevent brute force attacks
 */
export async function authenticateAdmin(
  password: string,
  ipAddress: string
): Promise<{ success: boolean; token?: string; error?: string; retryAfter?: number }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { success: false, error: 'Admin authentication not configured' };
  }

  // Check rate limiting
  const rateLimitResult = await checkRateLimit(ipAddress);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'Too many login attempts. Please try again later.',
      retryAfter: rateLimitResult.retryAfter,
    };
  }

  // Verify password
  if (password !== adminPassword) {
    // Record failed attempt
    await recordFailedAttempt(ipAddress);
    return { success: false, error: 'Invalid password' };
  }

  // Clear rate limit on successful login
  await clearRateLimit(ipAddress);

  // Create and return token
  const token = await createAuthToken(password);
  return { success: true, token };
}

/**
 * Check rate limiting for login attempts
 */
async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const kv = getKV();
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${ipAddress}`;
    const attempts = await kv.get<number>(rateLimitKey) || 0;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      // Vercel KV doesn't have ttl, so use fixed retry time
      return { allowed: false, retryAfter: Math.floor(RATE_LIMIT_WINDOW / 1000) };
    }

    return { allowed: true };
  } catch (error) {
    // If KV not available, allow (fail open for availability)
    console.warn('Could not check rate limit in KV:', error);
    return { allowed: true };
  }
}

/**
 * Record a failed login attempt
 */
async function recordFailedAttempt(ipAddress: string): Promise<void> {
  try {
    const kv = getKV();
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${ipAddress}`;
    const attempts = (await kv.get<number>(rateLimitKey) || 0) + 1;
    
    const expirySeconds = Math.floor(RATE_LIMIT_WINDOW / 1000);
    // Vercel KV uses set with expiration
    await kv.set(rateLimitKey, attempts, { ex: expirySeconds });
  } catch (error) {
    console.warn('Could not record failed attempt in KV:', error);
  }
}

/**
 * Clear rate limit (on successful login)
 */
async function clearRateLimit(ipAddress: string): Promise<void> {
  try {
    const kv = getKV();
    const rateLimitKey = `${RATE_LIMIT_KEY_PREFIX}${ipAddress}`;
    await kv.del(rateLimitKey);
  } catch (error) {
    console.warn('Could not clear rate limit in KV:', error);
  }
}

/**
 * Middleware to authenticate admin requests
 * Supports both legacy password header (for migration) and new JWT token
 */
export async function requireAdminAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  // Try JWT token first (new method)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verification = await verifyAuthToken(token);
    if (verification.valid) {
      return null; // Authenticated
    }
  }

  // Fallback to legacy password header (for backward compatibility during migration)
  const password = request.headers.get('x-admin-password');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminPassword && password === adminPassword) {
    // Log warning about using legacy auth
    console.warn('Legacy password header authentication used. Consider migrating to JWT tokens.');
    return null; // Authenticated (legacy)
  }

  // Not authenticated
  return NextResponse.json(
    { 
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    },
    { status: 401 }
  );
}

/**
 * Get client IP address for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  // Try various headers that proxies might set
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP (may not work in serverless)
  return request.ip || 'unknown';
}
