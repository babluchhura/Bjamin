import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

const envUrl =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const envKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export function getSupabaseClient(
  overrideUrl?: string,
  overrideKey?: string
): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = (overrideUrl || envUrl).trim();
  const key = (overrideKey || envKey).trim();
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

export const supabase = getSupabaseClient();
