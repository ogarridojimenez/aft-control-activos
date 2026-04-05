import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/getUser';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function requireAuth(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  return { user, error: null as null };
}

/** Solo rol `admin` (carga masiva, operaciones globales del portal). */
export async function requireAdmin(request: Request) {
  const { user, error } = await requireAuth(request);
  if (error) return { user: null, error };

  const supabase = createSupabaseAdmin();
  const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
  if (data?.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Se requiere rol administrador' }, { status: 403 }),
    };
  }
  return { user, error: null as null };
}
