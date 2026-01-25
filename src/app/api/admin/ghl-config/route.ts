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
        createQuoteObject: true,
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
      createQuoteObject,
      pipelineId, 
      pipelineStageId,
      pipelineRoutingRules,
      opportunityStatus, 
      opportunityMonetaryValue, 
      useDynamicPricingForValue,
      opportunityAssignedTo,
      opportunitySource,
      opportunityTags,
      inServiceTags,
      outOfServiceTags,
      appointmentCalendarId,
      callCalendarId,
      appointmentUserId,
      callUserId,
      quotedAmountField,
      redirectAfterAppointment,
      appointmentRedirectUrl,
      appointmentBookedTags,
      quoteCompletedTags,
    } = body;

    // Validate and clean pipelineRoutingRules
    let validatedRules: Array<{ 
      utmParam: string; 
      match: string; 
      value: string; 
      pipelineId: string; 
      pipelineStageId: string;
      opportunityStatus?: string;
      opportunityAssignedTo?: string;
      opportunitySource?: string;
      opportunityTags?: string[];
    }> | undefined;
    if (Array.isArray(pipelineRoutingRules)) {
      validatedRules = pipelineRoutingRules.filter((rule: any) => {
        // Each rule must have: utmParam, match, value (non-empty), pipelineId, pipelineStageId
        return (
          rule.utmParam && String(rule.utmParam).trim() &&
          rule.match && String(rule.match).trim() &&
          rule.value && String(rule.value).trim() &&
          rule.pipelineId && String(rule.pipelineId).trim() &&
          rule.pipelineStageId && String(rule.pipelineStageId).trim()
        );
      }).map((rule: any) => ({
        utmParam: rule.utmParam,
        match: rule.match,
        value: rule.value,
        pipelineId: rule.pipelineId,
        pipelineStageId: rule.pipelineStageId,
        opportunityStatus: rule.opportunityStatus || undefined,
        opportunityAssignedTo: rule.opportunityAssignedTo || undefined,
        opportunitySource: rule.opportunitySource || undefined,
        opportunityTags: Array.isArray(rule.opportunityTags) ? rule.opportunityTags : undefined,
      }));
      // Only include if there are valid rules
      if (validatedRules.length === 0) {
        validatedRules = undefined;
      }
    }

    await storeGHLConfig({
      createContact: Boolean(createContact),
      createOpportunity: Boolean(createOpportunity),
      createNote: Boolean(createNote),
      createQuoteObject: createQuoteObject === false ? false : true,
      pipelineId,
      pipelineStageId,
      pipelineRoutingRules: validatedRules,
      opportunityStatus,
      opportunityMonetaryValue: useDynamicPricingForValue ? undefined : opportunityMonetaryValue,
      useDynamicPricingForValue: Boolean(useDynamicPricingForValue),
      opportunityAssignedTo: opportunityAssignedTo || undefined,
      opportunitySource: opportunitySource || undefined,
      opportunityTags: opportunityTags || undefined,
      inServiceTags: inServiceTags || undefined,
      outOfServiceTags: outOfServiceTags || undefined,
      appointmentCalendarId: appointmentCalendarId || undefined,
      callCalendarId: callCalendarId || undefined,
      appointmentUserId: appointmentUserId || undefined,
      callUserId: callUserId || undefined,
      quotedAmountField: quotedAmountField || undefined,
      redirectAfterAppointment: Boolean(redirectAfterAppointment),
      appointmentRedirectUrl: appointmentRedirectUrl || undefined,
      appointmentBookedTags: appointmentBookedTags || undefined,
      quoteCompletedTags: quoteCompletedTags || undefined,
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
