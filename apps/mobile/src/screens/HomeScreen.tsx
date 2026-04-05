import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  clearLocalAssets,
  getPendingScansForInventory,
  clearPendingScansForInventory,
  insertLocalAssets,
  setMeta,
  getMeta,
} from '../services/sqliteService';
import {
  fetchAssetsForArea,
  fetchInventoryArea,
  signInWithPassword,
  signOut,
  supabase,
} from '../services/supabaseService';
import { syncInventoryToAdmin } from '../services/syncService';

export type RootStackParamList = {
  Home: undefined;
  Scan: { inventoryId: string };
  QrScanner: { inventoryId: string; onScanSuccess: (code: string) => void };
};

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export function HomeScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inventoryId, setInventoryId] = useState(() => getMeta('last_inventory_id') ?? '');
  const [busy, setBusy] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  async function refreshSession() {
    const { data } = await supabase.auth.getSession();
    setSessionEmail(data.session?.user.email ?? null);
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function onLogin() {
    setBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
      setPassword('');
      await refreshSession();
      Alert.alert('Listo', 'Sesión iniciada');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    }
    setBusy(false);
  }

  async function onLogout() {
    setBusy(true);
    try {
      await signOut();
      await refreshSession();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error');
    }
    setBusy(false);
  }

  async function onDownload() {
    const id = inventoryId.trim();
    if (!id) {
      Alert.alert('Falta ID', 'Pega el UUID del inventario creado en el portal.');
      return;
    }
    setBusy(true);
    try {
      const inv = await fetchInventoryArea(id);
      if (!inv) {
        Alert.alert('No encontrado', 'No existe ese inventario o no tienes permiso (RLS).');
        setBusy(false);
        return;
      }
      const assets = await fetchAssetsForArea(inv.area_id);
      clearLocalAssets();
      insertLocalAssets(
        assets.map((a) => ({
          id: a.id,
          asset_id: a.asset_id,
          name: a.name,
          area_id: a.area_id,
        }))
      );
      setMeta('last_inventory_id', id);
      Alert.alert('Descarga', `${assets.length} activos guardados en SQLite`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo descargar. Verifica que el inventario exista y tengas permisos.');
    }
    setBusy(false);
  }

  async function onSync() {
    const id = inventoryId.trim();
    if (!id) return;
    const pending = getPendingScansForInventory(id);
    if (pending.length === 0) {
      Alert.alert('Sin escaneos', 'No hay pendientes para este inventario.');
      return;
    }
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        Alert.alert('Sesión', 'Inicia sesión primero en la app.');
        setBusy(false);
        return;
      }
      const result = await syncInventoryToAdmin(id, pending, session.access_token);
      clearPendingScansForInventory(id);
      Alert.alert(
        'Sincronizado',
        `Esperados: ${result.summary.expected}, encontrados: ${result.summary.found}, faltantes: ${result.summary.missing}, sobrantes: ${result.summary.surplus}`
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Fallo al sincronizar');
    }
    setBusy(false);
  }

  const pendingCount =
    inventoryId.trim() ? getPendingScansForInventory(inventoryId.trim()).length : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AFT — Campo</Text>
      <Text style={styles.sub}>
        Inicia sesión (Supabase), descarga activos del inventario, escanea en la siguiente pantalla y sincroniza con el
        portal.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Conexión Supabase</Text>
        <Text style={styles.sub}>
          Conectado automáticamente usando autenticación anónima
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Inventario (UUID)</Text>
        <TextInput
          style={styles.input}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoCapitalize="none"
          value={inventoryId}
          onChangeText={setInventoryId}
        />
        <Pressable style={styles.btn} onPress={onDownload} disabled={busy}>
          <Text style={styles.btnText}>Descargar activos del área</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnOutline]}
          onPress={() => navigation.navigate('Scan', { inventoryId: inventoryId.trim() })}
          disabled={busy || !inventoryId.trim()}
        >
          <Text style={styles.btnOutlineText}>Ir a escanear / registrar</Text>
        </Pressable>
        <Text style={styles.hint}>Pendientes de envío: {pendingCount}</Text>
        <Pressable style={styles.btn} onPress={onSync} disabled={busy || pendingCount === 0}>
          <Text style={styles.btnText}>Sincronizar con portal</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator size="large" style={{ marginTop: 16 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 8, color: '#475569', lineHeight: 20 },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
    marginTop: 10,
  },
  btnOutlineText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  btnSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  btnSecondaryText: { color: '#0f172a', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  session: { flex: 1, color: '#0f172a', fontWeight: '500' },
  hint: { marginTop: 10, color: '#64748b', fontSize: 13 },
});
