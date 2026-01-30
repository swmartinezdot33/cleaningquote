import type { Tool, ToolInsert } from './types';
import { createSupabaseServer } from './server';

/**
 * Get a tool by slug (public; used for /t/[slug] resolution).
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
 * List tools for a user (by auth user id).
 */
export async function listToolsByUserId(userId: string): Promise<Tool[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Tool[];
}

/**
 * Create a new tool. Returns the created tool or null on error.
 */
export async function createTool(
  userId: string,
  input: { name: string; slug: string }
): Promise<Tool | null> {
  const supabase = createSupabaseServer();
  const insert: ToolInsert = {
    user_id: userId,
    name: input.name,
    slug: input.slug,
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
 * Check if a slug is available (no existing tool with that slug).
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await getToolBySlug(slug);
  return !existing;
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
