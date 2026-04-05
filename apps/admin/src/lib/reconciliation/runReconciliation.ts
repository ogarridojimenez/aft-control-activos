import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { ASSET_ID_REGEX, sanitizeAssetId } from '@aft/shared';

export type ScanPayload = { asset_id: string; scanned_at?: string; notes?: string };

export type ReconciliationResult = {
  reconciliationId: string | null;
  summary: {
    expected: number;
    found: number;
    missing: number;
    surplus: number;
  };
};

export async function runReconciliation(
  inventoryId: string,
  deviceResults: ScanPayload[]
): Promise<ReconciliationResult> {
  const supabase = createSupabaseAdmin();

  const { data: inventory, error: inventoryError } = await supabase
    .from('inventories')
    .select('id, area_id')
    .eq('id', inventoryId)
    .single();

  if (inventoryError || !inventory) {
    throw new Error(inventoryError?.message ?? 'Inventario no encontrado');
  }

  const { data: expectedAssets, error: assetsError } = await supabase
    .from('assets')
    .select('id, asset_id, name, category, location')
    .eq('area_id', inventory.area_id)
    .eq('status', 'active');

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  const list = expectedAssets ?? [];
  const foundByAssetPk = new Set<string>();
  const surplusAssets: Array<{ asset_id: string; scanned_at: string; notes?: string }> = [];

  for (const result of deviceResults) {
    const raw = sanitizeAssetId(result.asset_id);
    if (!ASSET_ID_REGEX.test(raw)) continue;

    const asset = list.find((a) => a.asset_id === raw);
    if (asset) {
      foundByAssetPk.add(asset.id);
    } else {
      surplusAssets.push({
        asset_id: raw,
        scanned_at: result.scanned_at ?? new Date().toISOString(),
        notes: result.notes ?? 'Activo encontrado fuera del listado del area',
      });
    }
  }

  const missingAssets = list
    .filter((a) => !foundByAssetPk.has(a.id))
    .map((a) => ({
      asset_id: a.asset_id,
      name: a.name,
      category: a.category ?? undefined,
      last_known_location: a.location ?? undefined,
    }));

  const expectedCount = list.length;
  const foundCount = foundByAssetPk.size;
  const missingCount = missingAssets.length;
  const surplusCount = surplusAssets.length;
  const accuracy =
    expectedCount > 0 ? Math.round((foundCount / expectedCount) * 100) : foundCount > 0 ? 100 : 0;

  const summary = {
    expected_count: expectedCount,
    found_count: foundCount,
    missing_count: missingCount,
    surplus_count: surplusCount,
    accuracy_percentage: accuracy,
  };

  const { data: recon, error: reconError } = await supabase
    .from('reconciliations')
    .upsert(
      {
        inventory_id: inventoryId,
        missing_assets: missingAssets,
        surplus_assets: surplusAssets,
        summary,
        status: 'pending',
      },
      { onConflict: 'inventory_id' }
    )
    .select('id')
    .single();

  if (reconError) {
    throw new Error(reconError.message);
  }

  const scannedAt = new Date().toISOString();
  const itemsPayload = list.map((asset) => ({
    inventory_id: inventoryId,
    asset_id: asset.id,
    quantity_expected: 1,
    quantity_found: foundByAssetPk.has(asset.id) ? 1 : 0,
    scanned_at: foundByAssetPk.has(asset.id) ? scannedAt : null,
  }));

  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase
      .from('inventory_items')
      .upsert(itemsPayload, { onConflict: 'inventory_id,asset_id' });
    if (itemsError) {
      throw new Error(itemsError.message);
    }
  }

  await supabase.from('inventories').update({ status: 'completed' }).eq('id', inventoryId);

  return {
    reconciliationId: recon?.id ?? null,
    summary: {
      expected: expectedCount,
      found: foundCount,
      missing: missingCount,
      surplus: surplusCount,
    },
  };
}
