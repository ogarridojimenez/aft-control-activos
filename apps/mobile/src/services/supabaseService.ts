import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache for inventories with TTL (5 minutes)
let inventoriesCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchInventories(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && inventoriesCache && (now - inventoriesCache.timestamp) < CACHE_TTL_MS) {
    return inventoriesCache.data;
  }

  const { data, error } = await supabase
    .from('inventories')
    .select('id, area_id, inventory_date, status, notes, areas(name, code)')
    .order('inventory_date', { ascending: false });
  if (error) throw error;

  inventoriesCache = { data: data ?? [], timestamp: now };
  return data ?? [];
}

export function invalidateInventoriesCache() {
  inventoriesCache = null;
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
