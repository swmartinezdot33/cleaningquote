import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getSurveyQuestions, saveSurveyQuestions } from '@/lib/survey/manager';
import type { SurveyQuestion } from '@/lib/survey/schema';

export const dynamic = 'force-dynamic';

/**
 * POST - Clear imageUrl/image_url from every option of every select question for this tool.
 * Persists to DB so the quote form stops showing old/stuck background images.
 * Use when "Remove all images" in the editor isn't enough (e.g. cached or merged data).
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const questions = await getSurveyQuestions(toolId);
    let changed = false;
    const updated = questions.map((q) => {
      if (q.type !== 'select' || !Array.isArray(q.options)) return q;
      const opts = q.options.map((opt) => {
        const o = opt as unknown as Record<string, unknown> & { image_url?: string };
        const { imageUrl, image_url, ...rest } = o;
        const hadImage =
          (typeof imageUrl === 'string' && imageUrl.trim() !== '') ||
          (typeof image_url === 'string' && image_url.trim() !== '');
        if (hadImage) changed = true;
        return rest;
      });
      return { ...q, options: opts };
    });

    if (changed) {
      await saveSurveyQuestions(updated as SurveyQuestion[], toolId);
    }
    return NextResponse.json({
      success: true,
      cleared: changed,
      message: changed ? 'All option images cleared and saved.' : 'No option images were set.',
    });
  } catch (err) {
    console.error('POST clear-option-images:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to clear option images' },
      { status: 500 }
    );
  }
}
