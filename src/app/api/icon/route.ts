/**
 * Serves the CleanQuote square icon (PNG) with no auth.
 * Used so favicon/icon requests get 200 when Deployment Protection
 * is bypassed or when the request reaches our app.
 */
import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ICON_PATH = join(process.cwd(), 'public', 'cleanquote_square_icon_padding.png');

export async function GET() {
  try {
    if (!existsSync(ICON_PATH)) {
      return new NextResponse(null, { status: 404 });
    }
    const buffer = readFileSync(ICON_PATH);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
