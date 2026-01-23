import { NextRequest, NextResponse } from 'next/server';
import { getKV } from '@/lib/kv';
import { invalidatePricingCache } from '@/lib/pricing/loadPricingTable';
import { PricingTable } from '@/lib/pricing/types';
import { requireAdminAuth } from '@/lib/security/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const PRICING_DATA_KEY = 'pricing:data:table';

/**
 * GET /api/admin/pricing
 * Get current pricing table structure
 */
export async function GET(request: NextRequest) {
  try {
    // Secure authentication (supports both JWT and legacy password)
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    try {
      const kv = getKV();
      const pricingData = await kv.get<PricingTable>(PRICING_DATA_KEY);

      if (!pricingData) {
        return NextResponse.json({
          exists: false,
          message: 'No pricing data found. Please upload a file or add pricing manually.',
        });
      }

      return NextResponse.json({
        exists: true,
        data: pricingData,
      });
    } catch (kvError) {
      // If KV is not configured (local dev), return empty state
      if (kvError instanceof Error && kvError.message.includes('KV')) {
        console.warn('KV not configured, returning empty state for local dev');
        return NextResponse.json({
          exists: false,
          message: 'KV storage not configured. This is normal for local development. Upload a file to get started.',
        });
      }
      throw kvError;
    }
  } catch (error) {
    console.error('Get pricing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get pricing data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing
 * Save pricing table structure manually
 */
export async function POST(request: NextRequest) {
  try {
    // Secure authentication (supports both JWT and legacy password)
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const pricingData: PricingTable = body.data;

    if (!pricingData || !pricingData.rows || !Array.isArray(pricingData.rows)) {
      return NextResponse.json(
        { error: 'Invalid pricing data structure' },
        { status: 400 }
      );
    }

    // Validate structure
    if (!pricingData.maxSqFt || typeof pricingData.maxSqFt !== 'number') {
      return NextResponse.json(
        { error: 'maxSqFt is required and must be a number' },
        { status: 400 }
      );
    }

    // Validate each row
    for (const row of pricingData.rows) {
      if (!row.sqFtRange || typeof row.sqFtRange.min !== 'number' || typeof row.sqFtRange.max !== 'number') {
        return NextResponse.json(
          { error: 'Each row must have a valid sqFtRange with min and max' },
          { status: 400 }
        );
      }
    }

    // Save to KV storage
    const kv = getKV();
    await kv.set(PRICING_DATA_KEY, pricingData);

    // Clear cache to force reload
    invalidatePricingCache();

    return NextResponse.json({
      success: true,
      message: 'Pricing data saved successfully',
      rowsCount: pricingData.rows.length,
      maxSqFt: pricingData.maxSqFt,
    });
  } catch (error) {
    console.error('Save pricing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save pricing data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pricing
 * Delete all pricing data
 */
export async function DELETE(request: NextRequest) {
  try {
    // Secure authentication (supports both JWT and legacy password)
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const kv = getKV();
    await kv.del(PRICING_DATA_KEY);
    await kv.del('pricing:file:2026'); // Also delete the Excel file if it exists
    await kv.del('pricing:file:2026:metadata');

    invalidatePricingCache();

    return NextResponse.json({
      success: true,
      message: 'Pricing data deleted successfully',
    });
  } catch (error) {
    console.error('Delete pricing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete pricing data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
