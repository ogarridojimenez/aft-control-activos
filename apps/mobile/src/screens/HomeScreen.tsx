import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
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
  invalidateInventoriesCache,
} from '../services/supabaseService';
import { syncInventoryToAdmin } from '../services/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export type RootStackParamList = {
  Home: undefined;
  Scan: { inventoryId: string };
  QrScanner: { inventoryId: string; onScanSuccess: (code: string) => void };
  LocalAssets: undefined;
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
  const isConnected = useNetworkStatus();
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [selectedId, setSelectedId] = useState(() => getMeta('last_inventory_id') ?? '');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assetsCount, setAssetsCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Load inventories once on mount
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchInventories();
        setInventories(list as InventoryItem[]);
        if (list.length > 0) {
          const lastId = getMeta('last_inventory_id');
          const found = (list as InventoryItem[]).find((i) => i.id === lastId);
          setSelectedId(found?.id ?? list[0].id);
        }
        setLastUpdate(new Date());
      } catch (e) {
        Alert.alert('Error', 'No se pudieron cargar los inventarios.');
      }
      setLoading(false);
    })();
  }, []);

  // Update assets count when selection changes
  useEffect(() => {
    if (selectedId) {
      setAssetsCount(getAssetsCount(selectedId));
    }
  }, [selectedId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateInventoriesCache();
    try {
      const list = await fetchInventories(true);
      setInventories(list as InventoryItem[]);
      setLastUpdate(new Date());
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los inventarios.');
    }
    setRefreshing(false);
  }, []);

  async function onDownload() {
    const id = selectedId.trim();
    if (!id) {
      Alert.alert('Sin selección', 'Selecciona un inventario de la lista.');
      return;
    }
    const inv = inventories.find((i) => i.id === id);
    if (!inv) {
      Alert.alert('Error', 'Inventario no encontrado en la lista.');
      return;
    }
    setBusy(true);
    try {
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
      setAssetsCount(count);
      setLastUpdate(new Date());
      Alert.alert('Descarga completada', `${count} activos guardados en SQLite`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('Download error:', e);
      Alert.alert('Error de descarga', msg);
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
    setSyncProgress({ current: 0, total: pending.length });
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      
      setSyncProgress({ current: Math.floor(pending.length * 0.5), total: pending.length });
      
      const result = await syncInventoryToAdmin(id, pending, token);
      
      setSyncProgress({ current: pending.length, total: pending.length });
      clearPendingScansForInventory(id);
      Alert.alert(
        'Sincronizado',
        `Esperados: ${result.summary.expected}, encontrados: ${result.summary.found}, faltantes: ${result.summary.missing}, sobrantes: ${result.summary.surplus}`
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Fallo al sincronizar');
    }
    setBusy(false);
    setSyncProgress(null);
  }

  const pendingCount = selectedId.trim() ? getPendingScansForInventory(selectedId.trim()).length : 0;
  const selectedInv = inventories.find((i) => i.id === selectedId);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠ Sin conexión — Los escaneos se guardan localmente</Text>
        </View>
      )}
      <Text style={styles.title}>AFT — Campo</Text>
      <Text style={styles.sub}>
        Selecciona un inventario, descarga los activos, escanea y sincroniza.
      </Text>

      {lastUpdate && (
        <Text style={styles.lastUpdate}>
          Última actualización: {lastUpdate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      {/* Inventory selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Inventario</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 12 }} />
        ) : inventories.length === 0 ? (
          <Text style={styles.hint}>No hay inventarios disponibles</Text>
        ) : (
          <FlatList
            data={inventories}
            keyExtractor={(item) => item.id}
            renderItem={({ item: inv }) => {
              const area = inv.areas;
              const isSelected = inv.id === selectedId;
              return (
                <Pressable
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
            }}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            style={styles.invList}
          />
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
          onPress={() => navigation.navigate('LocalAssets')}
          disabled={assetsCount === 0}
        >
          <Text style={styles.btnOutlineText}>
            Ver activos descargados ({assetsCount})
          </Text>
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

      {/* Sync Progress Modal */}
      <Modal visible={syncProgress !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.modalTitle}>Sincronizando...</Text>
            {syncProgress && (
              <Text style={styles.modalProgress}>
                {syncProgress.current} / {syncProgress.total} escaneos
              </Text>
            )}
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: syncProgress ? `${(syncProgress.current / syncProgress.total) * 100}%` : '0%' }
                ]} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f8fafc' },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  offlineText: { fontSize: 13, color: '#92400e', fontWeight: '500', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub: { marginTop: 8, color: '#475569', lineHeight: 20 },
  lastUpdate: { marginTop: 6, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  invList: { maxHeight: 250 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  modalProgress: { fontSize: 14, color: '#64748b', marginTop: 8 },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
});
