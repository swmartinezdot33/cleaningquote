import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { parseExcelBufferToPricingTable, invalidatePricingCacheForStructure } from '@/lib/pricing/loadPricingTable';

export const dynamic = 'force-dynamic';

/** POST - Upload Excel and set this pricing structure's pricing_table */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; structureId: string }> }
) {
  const { orgId, structureId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can update pricing structures' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided. Include a file in the "file" field.' }, { status: 400 });
    }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pricingTable = parseExcelBufferToPricingTable(buffer);

    const { error } = await supabase
      .from('pricing_structures')
      // @ts-expect-error Supabase generated types
      .update({ pricing_table: pricingTable as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('id', structureId)
      .eq('org_id', orgId);

    if (error) {
      console.error('PATCH org pricing-structure upload:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    invalidatePricingCacheForStructure(structureId);
    return NextResponse.json({
      success: true,
      message: 'Pricing file uploaded and applied to this structure',
      rowsCount: pricingTable.rows.length,
      maxSqFt: pricingTable.maxSqFt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse or save';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
