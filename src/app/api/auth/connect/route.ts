/**
 * Redirect to marketplace install URL
 * Use this when users need to install/connect the app.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const installUrl = process.env.GHL_INSTALL_URL;

  if (!installUrl) {
    return NextResponse.json(
      { error: 'Install URL not configured. Set GHL_INSTALL_URL.' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(installUrl);
}
