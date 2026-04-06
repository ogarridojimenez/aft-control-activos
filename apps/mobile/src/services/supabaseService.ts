import { createClient } from '@supabase/supabase-js';
import { cacheInventories, getCachedInventories, isInventoriesCacheValid, setInventoriesCacheTimestamp, clearInventoriesCache, type CachedInventory } from './sqliteService';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchInventories(forceRefresh = false): Promise<any[]> {
  if (!forceRefresh && isInventoriesCacheValid()) {
    const cached = getCachedInventories();
    if (cached.length > 0) {
      return cached.map(inv => ({
        id: inv.id,
        area_id: inv.area_id,
        inventory_date: inv.inventory_date,
        status: inv.status,
        notes: inv.notes,
        areas: { name: inv.area_name, code: inv.area_code },
      }));
    }
  }

  const { data, error } = await supabase
    .from('inventories')
    .select('id, area_id, inventory_date, status, notes, areas(name, code)')
    .order('inventory_date', { ascending: false });
  if (error) {
    if (isInventoriesCacheValid()) {
      const cached = getCachedInventories();
      return cached.map(inv => ({
        id: inv.id,
        area_id: inv.area_id,
        inventory_date: inv.inventory_date,
        status: inv.status,
        notes: inv.notes,
        areas: { name: inv.area_name, code: inv.area_code },
      }));
    }
    throw error;
  }

  const inventories = data ?? [];
  const cached: CachedInventory[] = inventories.map(inv => ({
    id: inv.id,
    area_id: inv.area_id,
    inventory_date: inv.inventory_date,
    status: inv.status,
    notes: inv.notes,
    area_name: inv.areas?.name ?? null,
    area_code: inv.areas?.code ?? null,
    cached_at: new Date().toISOString(),
  }));
  cacheInventories(cached);
  setInventoriesCacheTimestamp();
  
  return inventories;
}

export function invalidateInventoriesCache() {
  clearInventoriesCache();
}

export async function fetchInventoryArea(inventoryId: string) {
  const { data, error } = await supabase
    .from('inventories')
    .select('id, area_id, status')
    .eq('id', inventoryId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAssetsForArea(areaId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('id, asset_id, name, area_id')
    .eq('area_id', areaId)
    .eq('status', 'active');
  if (error) throw error;
  return data ?? [];
}
