import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getGHLConfig, storeGHLConfig } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/** GET - Get GHL config for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const config = await getGHLConfig(toolId);
    return NextResponse.json({
      config: config ?? {
        createContact: true,
        createOpportunity: false,
        createNote: true,
        createQuoteObject: true,
      },
    });
  } catch (err) {
    console.error('GET dashboard ghl-config:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get HighLevel config' },
      { status: 500 }
    );
  }
}

/** POST - Save GHL config for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

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
      disqualifiedLeadTags,
      formIsIframed,
      webhookEnabled,
      webhookUrl,
    } = body;

    let validatedRules:
      | Array<{
          utmParam: string;
          match: string;
          value: string;
          pipelineId: string;
          pipelineStageId: string;
          opportunityStatus?: string;
          opportunityAssignedTo?: string;
          opportunitySource?: string;
          opportunityTags?: string[];
        }>
      | undefined;
    if (Array.isArray(pipelineRoutingRules)) {
      validatedRules = pipelineRoutingRules
        .filter(
          (rule: Record<string, unknown>) =>
            rule.utmParam &&
            String(rule.utmParam).trim() &&
            rule.match &&
            String(rule.match).trim() &&
            rule.value &&
            String(rule.value).trim() &&
            rule.pipelineId &&
            String(rule.pipelineId).trim() &&
            rule.pipelineStageId &&
            String(rule.pipelineStageId).trim()
        )
        .map((rule: Record<string, unknown>) => ({
          utmParam: String(rule.utmParam),
          match: String(rule.match),
          value: String(rule.value),
          pipelineId: String(rule.pipelineId),
          pipelineStageId: String(rule.pipelineStageId),
          opportunityStatus: rule.opportunityStatus as string | undefined,
          opportunityAssignedTo: rule.opportunityAssignedTo as string | undefined,
          opportunitySource: rule.opportunitySource as string | undefined,
          opportunityTags: Array.isArray(rule.opportunityTags) ? (rule.opportunityTags as string[]) : undefined,
        }));
      if (validatedRules.length === 0) validatedRules = undefined;
    }

    await storeGHLConfig(
      {
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
        opportunityAssignedTo: opportunityAssignedTo ?? undefined,
        opportunitySource: opportunitySource ?? undefined,
        opportunityTags: opportunityTags ?? undefined,
        inServiceTags: inServiceTags ?? undefined,
        outOfServiceTags: outOfServiceTags ?? undefined,
        appointmentCalendarId: appointmentCalendarId ?? undefined,
        callCalendarId: callCalendarId ?? undefined,
        appointmentUserId: appointmentUserId ?? undefined,
        callUserId: callUserId ?? undefined,
        quotedAmountField: quotedAmountField ?? undefined,
        redirectAfterAppointment: Boolean(redirectAfterAppointment),
        appointmentRedirectUrl: appointmentRedirectUrl ?? undefined,
        appointmentBookedTags: appointmentBookedTags ?? undefined,
        quoteCompletedTags: quoteCompletedTags ?? undefined,
        disqualifiedLeadTags: disqualifiedLeadTags ?? undefined,
        formIsIframed: Boolean(formIsIframed),
        webhookEnabled: Boolean(webhookEnabled),
        webhookUrl: typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined,
      },
      toolId
    );

    return NextResponse.json({ success: true, message: 'GHL configuration saved' });
  } catch (err) {
    console.error('POST dashboard ghl-config:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save HighLevel config' },
      { status: 500 }
    );
  }
}
