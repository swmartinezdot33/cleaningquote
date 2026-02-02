import { NextRequest, NextResponse } from 'next/server';

/**
 * GHL redirect: pass query params to the survey.
 * Use as the "Get Quote" link in GHL (no script required).
 *
 * Example link in GHL (use merge tags):
 * https://www.cleanquote.io/api/ghl?contactId={{contact.id}}&firstName={{contact.firstName}}&lastName={{contact.lastName}}&email={{contact.email}}&phone={{contact.phone}}&address={{contact.address}}
 *
 * Redirects to the survey URL with the same params so the form pre-fills.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolSlug = searchParams.get('toolSlug') || searchParams.get('tool') || 'default';
  const orgSlug = searchParams.get('orgSlug') || searchParams.get('org') || '';

  const params = new URLSearchParams();
  const pass = [
    'contactId',
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'postalCode',
  ];
  pass.forEach((key) => {
    const v = searchParams.get(key);
    if (v != null && v.trim() !== '') params.set(key, v.trim());
  });

  const path = orgSlug
    ? `/t/${encodeURIComponent(orgSlug)}/${encodeURIComponent(toolSlug)}`
    : `/t/${encodeURIComponent(toolSlug)}`;
  const query = params.toString();
  const surveyPath = query ? `${path}?${query}` : path;

  const base = request.nextUrl.origin;
  const redirectUrl = `${base}${surveyPath}`;
  return NextResponse.redirect(redirectUrl, 302);
}
