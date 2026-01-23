import { NextRequest, NextResponse } from 'next/server';
import { storeGHLConfig, getGHLConfig } from '@/lib/kv';
import { getLocation, getPipelines } from '@/lib/ghl/client';

function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * GET - Retrieve GHL configuration (public, no auth needed for reading)
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getGHLConfig();
    
    return NextResponse.json({
      config: config || {
        createContact: true,
        createOpportunity: false,
        createNote: true,
      },
    });
  } catch (error) {
    console.error('Error getting GHL config:', error);
    return NextResponse.json(
      { error: 'Failed to get GHL config', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST - Save GHL configuration
 */
export async function POST(request: NextRequest) {
  const authResponse = authenticate(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { 
      createContact, 
      createOpportunity, 
      createNote, 
      pipelineId, 
      pipelineStageId, 
      opportunityStatus, 
      opportunityMonetaryValue, 
      useDynamicPricingForValue,
      inServiceTags,
      outOfServiceTags,
      appointmentCalendarId,
      callCalendarId,
      appointmentUserId,
      callUserId,
      quotedAmountField,
      redirectAfterAppointment,
      appointmentRedirectUrl,
    } = body;

    await storeGHLConfig({
      createContact: Boolean(createContact),
      createOpportunity: Boolean(createOpportunity),
      createNote: Boolean(createNote),
      pipelineId,
      pipelineStageId,
      opportunityStatus,
      opportunityMonetaryValue: useDynamicPricingForValue ? undefined : opportunityMonetaryValue,
      useDynamicPricingForValue: Boolean(useDynamicPricingForValue),
      inServiceTags: inServiceTags || undefined,
      outOfServiceTags: outOfServiceTags || undefined,
      appointmentCalendarId: appointmentCalendarId || undefined,
      callCalendarId: callCalendarId || undefined,
      appointmentUserId: appointmentUserId || undefined,
      callUserId: callUserId || undefined,
      quotedAmountField: quotedAmountField || undefined,
      redirectAfterAppointment: Boolean(redirectAfterAppointment),
      appointmentRedirectUrl: appointmentRedirectUrl || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'GHL configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving GHL config:', error);
    return NextResponse.json(
      { error: 'Failed to save GHL config', details: (error as Error).message },
      { status: 500 }
    );
  }
}
