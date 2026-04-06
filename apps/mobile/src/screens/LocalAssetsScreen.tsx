import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './HomeScreen';
import { getLocalAssets, type LocalAsset } from '../services/sqliteService';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalAssets'>;

const AssetItem = React.memo(({ item }: { item: LocalAsset }) => (
  <View style={styles.assetItem}>
    <View style={styles.assetHeader}>
      <Text style={styles.assetId}>{item.asset_id}</Text>
      <Text style={styles.assetArea}>{item.area_id}</Text>
    </View>
    <Text style={styles.assetName}>{item.name}</Text>
    <Text style={styles.assetDate}>
      Descargado: {new Date(item.synced_at).toLocaleDateString('es')}
    </Text>
  </View>
));

AssetItem.displayName = 'AssetItem';

export function LocalAssetsScreen({ navigation }: Props) {
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssets = useCallback(() => {
    try {
      const localAssets = getLocalAssets();
      setAssets(localAssets);
    } catch (e) {
      console.error('Error loading assets:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssets();
  }, [loadAssets]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando activos...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={assets}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AssetItem item={item} />}
      contentContainerStyle={assets.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <Text style={styles.count}>{assets.length} activos descargados</Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay activos descargados</Text>
          <Text style={styles.emptySubtext}>
            Descarga activos desde la pantalla principal
          </Text>
        </View>
      }
      initialNumToRender={15}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 20 },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    padding: 16,
    paddingBottom: 8,
  },
  assetItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  assetArea: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assetName: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  assetDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
});
