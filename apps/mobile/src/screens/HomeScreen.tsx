import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getAssetsCount,
  getPendingScansForInventory,
  clearPendingScansForInventory,
  insertLocalAssets,
  setMeta,
  getMeta,
} from '../services/sqliteService';
import {
  fetchAssetsForArea,
  fetchInventories,
  supabase,
} from '../services/supabaseService';
import { syncInventoryToAdmin } from '../services/syncService';

export type RootStackParamList = {
  Home: undefined;
  Scan: { inventoryId: string };
  QrScanner: { inventoryId: string; onScanSuccess: (code: string) => void };
};

type InventoryItem = {
  id: string;
  area_id: string;
  inventory_date: string;
  status: string;
  notes: string | null;
  areas: { name: string; code: string } | null;
};

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export function HomeScreen({ navigation }: Props) {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [selectedId, setSelectedId] = useState(() => getMeta('last_inventory_id') ?? '');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventories();
  }, []);

  async function loadInventories() {
    setLoading(true);
    try {
      const list = await fetchInventories();
      setInventories(list as InventoryItem[]);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los inventarios. Verifica la conexión a Supabase.');
    }
    setLoading(false);
  }

  async function onDownload() {
    const id = selectedId.trim();
    if (!id) {
      Alert.alert('Sin selección', 'Selecciona un inventario de la lista.');
      return;
    }
    setBusy(true);
    try {
      const inv = inventories.find((i) => i.id === id);
      if (!inv) {
        Alert.alert('Error', 'Inventario no encontrado en la lista.');
        setBusy(false);
        return;
      }
      const assets = await fetchAssetsForArea(inv.area_id);
      insertLocalAssets(
        inv.id,
        assets.map((a) => ({
          id: a.id,
          asset_id: a.asset_id,
          name: a.name,
          area_id: a.area_id,
        }))
      );
      setMeta('last_inventory_id', id);
      const count = getAssetsCount(inv.id);
      Alert.alert('Descarga completada', `${count} activos guardados en SQLite`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo descargar. Verifica que el inventario exista.');
    }
    setBusy(false);
  }

  async function onSync() {
    const id = selectedId.trim();
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
      const token = session?.access_token ?? '';
      const result = await syncInventoryToAdmin(id, pending, token);
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

  const pendingCount = selectedId.trim() ? getPendingScansForInventory(selectedId.trim()).length : 0;
  const selectedInv = inventories.find((i) => i.id === selectedId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AFT — Campo</Text>
      <Text style={styles.sub}>
        Selecciona un inventario, descarga los activos, escanea y sincroniza.
      </Text>

      {/* Inventory selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Inventario</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 12 }} />
        ) : inventories.length === 0 ? (
          <Text style={styles.hint}>No hay inventarios disponibles</Text>
        ) : (
          inventories.map((inv) => {
            const area = inv.areas;
            const isSelected = inv.id === selectedId;
            return (
              <Pressable
                key={inv.id}
                style={[
                  styles.invItem,
                  isSelected && styles.invItemSelected,
                ]}
                onPress={() => setSelectedId(inv.id)}
              >
                <View style={styles.invRow}>
                  <Text style={[styles.invArea, isSelected && styles.invTextSelected]}>
                    {area?.name ?? 'Sin área'} ({area?.code ?? '?'})
                  </Text>
                  <Text style={[styles.invStatus, isSelected && styles.invTextSelected]}>
                    {inv.status}
                  </Text>
                </View>
                <Text style={[styles.invDate, isSelected && styles.invTextSelected]}>
                  {inv.inventory_date}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Actions */}
      <View style={styles.card}>
        <Text style={styles.label}>Acciones</Text>
        {selectedInv && (
          <Text style={styles.hint}>
            Área: {selectedInv.areas?.name ?? '—'} · {selectedInv.inventory_date}
          </Text>
        )}
        <Pressable style={styles.btn} onPress={onDownload} disabled={busy || inventories.length === 0}>
          <Text style={styles.btnText}>Descargar activos</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnOutline]}
          onPress={() => navigation.navigate('Scan', { inventoryId: selectedId.trim() })}
          disabled={busy || !selectedId.trim()}
        >
          <Text style={styles.btnOutlineText}>Ir a escanear</Text>
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
  invItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  invItemSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invArea: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  invStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
  invTextSelected: { color: '#fff' },
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
  hint: { marginTop: 10, color: '#64748b', fontSize: 13 },
});
