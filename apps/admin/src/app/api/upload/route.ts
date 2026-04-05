import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guard';
import { parseExcelForUpload, rowToAssetPayload } from '@/lib/excel/parseUpload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH = 50;

export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const form = await request.formData();
    const file = form.get('file');
    const areaCode = String(form.get('areaCode') ?? '').trim();

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (!areaCode) {
      return NextResponse.json({ error: 'Código de área requerido' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { rows, errors } = parseExcelForUpload(buffer, areaCode);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No hay filas válidas', details: errors.slice(0, 20) },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id')
      .eq('code', areaCode)
      .eq('is_active', true)
      .maybeSingle();

    if (areaError || !area) {
      return NextResponse.json(
        { error: `Área no encontrada o inactiva para código: ${areaCode}` },
        { status: 400 }
      );
    }

    let processed = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const payload = chunk.map((r) => rowToAssetPayload(r, area.id, null));
      const { error } = await supabase.from('assets').upsert(payload, { onConflict: 'asset_id' });
      if (error) {
        return NextResponse.json({ error: error.message, processed }, { status: 500 });
      }
      processed += chunk.length;
    }

    return NextResponse.json({
      processed,
      errors: errors.slice(0, 50),
      errorCount: errors.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
