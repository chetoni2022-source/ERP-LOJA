import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

const shouldDiscardStoredSession = (raw: string | null) => {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    const session = parsed?.currentSession ?? parsed;
    const expiresAt = Number(session?.expires_at ?? 0);
    const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
    const needsImmediateRefresh = expiresAt > 0 && secondsUntilExpiry <= 120;

    return !session?.refresh_token || needsImmediateRefresh;
  } catch {
    return true;
  }
};

const sanitizeStoredSupabaseSessions = () => {
  if (typeof window === 'undefined') return;

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    Object.keys(storage)
      .filter((key) => key.startsWith('sb-') && key.endsWith('-auth-token'))
      .forEach((key) => {
        if (shouldDiscardStoredSession(storage.getItem(key))) storage.removeItem(key);
      });
  });
};

sanitizeStoredSupabaseSessions();

const browserStorage = typeof window === 'undefined'
  ? undefined
  : {
      getItem: (key: string) => {
        const raw = window.localStorage.getItem(key);
        if (key.endsWith('-auth-token') && shouldDiscardStoredSession(raw)) {
          window.localStorage.removeItem(key);
          return null;
        }
        return raw;
      },
      setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: (key: string) => window.localStorage.removeItem(key),
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: browserStorage,
  },
});

/**
 * Public Supabase Storage buckets already return browser-safe URLs.
 * Keep this helper so existing callers stay simple, but do not rewrite through
 * /storage-proxy; stale proxy responses were hiding valid images.
 */
export const getProxyUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return url;
};
