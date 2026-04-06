import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Converte URLs do Supabase em URLs locais seguras (via Proxy Vercel)
 * para evitar erros de CORS/COEP em ambientes isolados.
 */
export const getProxyUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // Se já for uma URL local ou base64, retorna como está
  if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  
  const supabasePrefix = 'https://tcgwkazgelkonnuyebls.supabase.co/storage/v1/object/public/';
  if (url.includes(supabasePrefix)) {
    return url.replace(supabasePrefix, '/storage-proxy/');
  }
  return url;
};
