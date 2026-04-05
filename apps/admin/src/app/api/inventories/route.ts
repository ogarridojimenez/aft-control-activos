import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/guard';
import { z } from 'zod';

const postSchema = z.object({
  area_id: z.string().uuid(),
  inventory_date: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('inventories')
      .select('id, area_id, inventory_date, status, notes, created_at, areas(name, code)')
      .order('inventory_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ inventories: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const json = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('inventories')
      .insert({
        area_id: parsed.data.area_id,
        inventory_date: parsed.data.inventory_date,
        status: 'planned',
        notes: parsed.data.notes ?? null,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
