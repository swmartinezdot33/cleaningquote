import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Serves the CleanQuote script with CORS so it loads from GHL and other external sites.
 * Use: <script src="https://www.cleanquote.io/api/script/cleanquote.js?v=2" data-base-url="https://www.cleanquote.io" crossorigin="anonymous"></script>
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'scripts', 'cleanquote.js');
    const body = await readFile(filePath, 'utf-8');
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('CleanQuote script serve error:', err);
    return new NextResponse('Not Found', { status: 404 });
  }
}
