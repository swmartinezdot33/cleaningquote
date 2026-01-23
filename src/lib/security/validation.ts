/**
 * Input Validation and Sanitization
 * 
 * Provides utilities for validating and sanitizing user input
 * to prevent injection attacks and data corruption
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic)
 */
export function isValidPhone(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Check if it's mostly digits and reasonable length
  return /^\+?[\d]{10,15}$/.test(cleaned);
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Apply length limit if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize JSON body
 */
export function validateJSONBody(body: any, schema: {
  required?: string[];
  maxSize?: number;
  allowedKeys?: string[];
}): { valid: boolean; error?: string; sanitized?: any } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in body)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
  }

  // Check size limit
  if (schema.maxSize) {
    const bodySize = JSON.stringify(body).length;
    if (bodySize > schema.maxSize) {
      return { valid: false, error: `Request body too large (max ${schema.maxSize} bytes)` };
    }
  }

  // Filter to allowed keys if specified
  let sanitized = body;
  if (schema.allowedKeys) {
    sanitized = {};
    for (const key of schema.allowedKeys) {
      if (key in body) {
        sanitized[key] = body[key];
      }
    }
  }

  return { valid: true, sanitized };
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${Math.round(options.maxSize / 1024 / 1024)}MB` 
    };
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}` 
    };
  }

  return { valid: true };
}

/**
 * Rate limiting middleware (simple in-memory version for serverless)
 * For production, use KV-based rate limiting (already in auth.ts)
 */
export function createRateLimitMiddleware(options: {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
}) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = options.keyGenerator 
      ? options.keyGenerator(request)
      : request.headers.get('x-forwarded-for') || 'unknown';

    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      // New window or expired
      requests.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return null; // Allow request
    }

    if (record.count >= options.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again after ${Math.ceil((record.resetAt - now) / 1000)} seconds.`,
          retryAfter: Math.ceil((record.resetAt - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetAt - now) / 1000).toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(record.resetAt / 1000).toString(),
          },
        }
      );
    }

    // Increment count
    record.count++;
    requests.set(key, record);

    return null; // Allow request
  };
}

/**
 * Validate API key format (for GHL tokens, Google Maps keys, etc.)
 */
export function isValidAPIKey(key: string, minLength: number = 20): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  if (key.length < minLength) {
    return false;
  }

  // Basic validation - no null bytes, reasonable characters
  if (key.includes('\0') || key.length > 1000) {
    return false;
  }

  return true;
}
