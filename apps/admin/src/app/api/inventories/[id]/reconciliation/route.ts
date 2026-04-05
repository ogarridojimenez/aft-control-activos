import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const inventoryId = params.id;
    const supabase = createSupabaseAdmin();

    const { data: inventory, error: invError } = await supabase
      .from('inventories')
      .select('id, area_id, inventory_date, status, notes, areas(name, code)')
      .eq('id', inventoryId)
      .single();

    if (invError || !inventory) {
      return NextResponse.json({ error: 'Inventario no encontrado' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, asset_id, quantity_expected, quantity_found, condition_notes, scanned_at, assets(asset_id, name, category, location)')
      .eq('inventory_id', inventoryId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const { data: reconciliation, error: reconError } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('inventory_id', inventoryId);

    if (reconError) {
      return NextResponse.json({ error: reconError.message }, { status: 500 });
    }

    const flatItems = (items ?? []).map((item: any) => ({
      id: item.id,
      assetId: item.asset_id,
      quantityExpected: item.quantity_expected,
      quantityFound: item.quantity_found,
      conditionNotes: item.condition_notes,
      scannedAt: item.scanned_at,
      assetTag: item.assets?.asset_id ?? null,
      assetName: item.assets?.name ?? null,
      assetCategory: item.assets?.category ?? null,
      assetLocation: item.assets?.location ?? null,
    }));

    const area = inventory.areas as { name: string; code: string } | null;

    const expected = flatItems.length;
    const found = flatItems.filter((i: any) => (i.quantityFound ?? 0) > 0).length;
    const missing = flatItems.filter((i: any) => (i.quantityFound ?? 0) === 0).length;

    return NextResponse.json({
      inventory: {
        id: inventory.id,
        areaId: inventory.area_id,
        inventoryDate: inventory.inventory_date,
        status: inventory.status,
        notes: inventory.notes,
        areaName: area?.name ?? null,
        areaCode: area?.code ?? null,
      },
      items: flatItems,
      reconciliation: reconciliation?.[0] ?? null,
      stats: { expected, found, missing, accuracy: expected > 0 ? Math.round((found / expected) * 100) : 0 },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
