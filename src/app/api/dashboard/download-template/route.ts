import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { generatePricingTemplateBuffer } from '@/lib/pricing/generatePricingTemplate';

export const dynamic = 'force-dynamic';

/** GET - Download pricing Excel template (any logged-in dashboard user). */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const buffer = generatePricingTemplateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Pricing_Template.xlsx"',
    },
  });
}
