import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_SCRIPTS = new Set(['cleanquote.js', 'ghl-sidebar-menu.js', 'ghl-agency-master.js']);

/**
 * Serves CleanQuote scripts with CORS so they load from GHL and other external sites.
 * - /api/script/cleanquote.js — Quoter button script
 * - /api/script/ghl-sidebar-menu.js — GHL sidebar menu injection (Dashboard, Quotes, Contacts, etc.)
 * - /api/script/ghl-agency-master.js — Full agency script (favicon, dashboard hijack, Sub-Accounts, groups, redirect, sidebar menu)
 * Use: set window.CLEANQUOTE_AGENCY_CONFIG then <script src="https://www.cleanquote.io/api/script/ghl-agency-master.js"></script>
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!ALLOWED_SCRIPTS.has(filename)) {
    return new NextResponse('Not Found', { status: 404 });
  }
  try {
    const filePath = path.join(process.cwd(), 'public', 'scripts', filename);
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
