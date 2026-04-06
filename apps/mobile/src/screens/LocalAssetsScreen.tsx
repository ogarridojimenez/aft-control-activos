import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase().trim();
    return assets.filter(
      (a) =>
        a.asset_id.toLowerCase().includes(query) ||
        (a.name?.toLowerCase().includes(query) ?? false)
    );
  }, [assets, searchQuery]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando activos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por ID o nombre..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Text style={styles.searchResult}>
            {filteredAssets.length} de {assets.length}
          </Text>
        )}
      </View>
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetItem item={item} />}
        contentContainerStyle={filteredAssets.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.count}>{assets.length} activos descargados</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron activos' : 'No hay activos descargados'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Intenta con otros términos' : 'Descarga activos desde la pantalla principal'}
            </Text>
          </View>
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  searchResult: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
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
