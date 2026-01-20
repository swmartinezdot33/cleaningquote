import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/admin/download-template
 * 
 * Download the actual 2026 Pricing.xlsx file as a template
 * 
 * Authentication: Send password in header 'x-admin-password'
 */
export async function GET(request: NextRequest) {
  try {
    // Check for password authentication
    const password = request.headers.get('x-admin-password');
    const requiredPassword = process.env.ADMIN_PASSWORD;
    
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing password.' },
        { status: 401 }
      );
    }

    // Try multiple possible paths for the Excel file
    const possiblePaths = [
      join(process.cwd(), 'data', '2026 Pricing.xlsx'),
      join(process.cwd(), 'public', 'data', '2026 Pricing.xlsx'),
      '/var/task/data/2026 Pricing.xlsx', // Vercel serverless path
      join(process.cwd(), '.next', 'server', 'data', '2026 Pricing.xlsx'), // Build output
    ];

    let excelBuffer: Buffer | null = null;
    let filePath: string | null = null;

    for (const path of possiblePaths) {
      try {
        excelBuffer = await readFile(path);
        filePath = path;
        console.log(`Successfully loaded pricing file from: ${path}`);
        break;
      } catch (e) {
        // File not found at this path, try next
        continue;
      }
    }

    if (!excelBuffer) {
      console.error(`Pricing file not found at any of these paths:`, possiblePaths);
      return NextResponse.json(
        { 
          error: 'Pricing template file not found',
          details: 'The 2026 Pricing.xlsx file could not be located on the server.'
        },
        { status: 500 }
      );
    }

    // Return file as download
    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="2026_Pricing_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
