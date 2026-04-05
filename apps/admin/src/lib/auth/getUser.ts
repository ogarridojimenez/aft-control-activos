import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Usuario desde cookies de sesión (portal). */
export async function getUserFromCookies() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Usuario desde cookies o cabecera Authorization: Bearer (app móvil / integraciones).
 */
export async function getUserFromRequest(request: Request) {
  const fromCookies = await getUserFromCookies();
  if (fromCookies) return fromCookies;

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const jwt = auth.slice(7).trim();
  if (!jwt) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user;
}
