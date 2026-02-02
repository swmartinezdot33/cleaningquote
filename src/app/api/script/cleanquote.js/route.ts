import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

/**
 * Serves the CleanQuote script with CORS so it loads from GHL and other external sites.
 * Use: <script src="https://www.cleanquote.io/api/script/cleanquote.js?v=2" data-base-url="https://www.cleanquote.io" crossorigin="anonymous"></script>
 * In GHL you must use this /api/script/ URL (not /scripts/cleanquote.js) or the script will be blocked by CORS.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'scripts', 'cleanquote.js');
    const body = await readFile(filePath, 'utf-8');
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error('CleanQuote script serve error:', err);
    return new NextResponse('Not Found', { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
