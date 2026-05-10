import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Public Supabase Storage buckets already return browser-safe URLs.
 * Keep this helper so existing callers stay simple, but do not rewrite through
 * /storage-proxy; stale proxy responses were hiding valid images.
 */
export const getProxyUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url;
};
