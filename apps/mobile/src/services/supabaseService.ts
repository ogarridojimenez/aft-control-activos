import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function setDeviceId(deviceId: string) {
  const { error } = await supabase.rpc('set_current_device_id', { device_id: deviceId });
  if (error) throw error;
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  return profile;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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