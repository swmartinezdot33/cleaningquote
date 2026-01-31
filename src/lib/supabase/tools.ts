import type { Tool, ToolInsert } from './types';
import { createSupabaseServer } from './server';

/**
 * Get a tool by slug (public; used for /t/[slug] resolution).
 * Slug is unique per org - returns first match. For multi-org, caller may need org context.
 */
export async function getToolBySlug(slug: string): Promise<Tool | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return data as Tool;
}

/**
 * Get a tool by id (caller must ensure user owns it for admin flows).
 */
export async function getToolById(id: string): Promise<Tool | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as Tool;
}

/**
 * List tools for an organization.
 */
export async function listToolsByOrgId(orgId: string): Promise<Tool[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Tool[];
}

/**
 * Create a new tool in an organization.
 */
export async function createTool(
  orgId: string,
  input: { name: string; slug: string },
  userId?: string
): Promise<Tool | null> {
  const supabase = createSupabaseServer();
  const insert: ToolInsert = {
    org_id: orgId,
    name: input.name,
    slug: input.slug,
    ...(userId && { user_id: userId }),
  };
  const { data, error } = await supabase
    .from('tools')
    .insert(insert as never)
    .select()
    .single();
  if (error) return null;
  return data as Tool;
}

/**
 * Check if a slug is available globally (for backward compat /t/[slug] must be unique).
 * In multi-org, slug is unique per org; for public /t/slug we need globally unique.
 * So we keep global slug uniqueness for the quote flow URL.
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from('tools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !data;
}

/**
 * Ensure slug is URL-safe: lowercase, alphanumeric and hyphens only.
 */
export function slugToSafe(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
