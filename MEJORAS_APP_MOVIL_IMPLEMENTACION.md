# 🚀 Plan de Implementación - Mejoras App Móvil AFT

## 📋 Contexto y Objetivos

La app móvil necesita mejoras críticas de usabilidad:
- **Visibilidad**: Ver activos descargados actualmente
- **Gestión**: Múltiples inventarios sin sobrescritura  
- **Control**: Refresh manual de datos
- **Feedback**: Confirmación visual del estado

## 🎯 Mejores Prácticas de Implementación

### 1. Arquitectura de Estado Sólida
```typescript
// Estado optimizado para gestión de inventarios
interface AppState {
  inventories: Inventory[];
  selectedInventory: Inventory | null;
  localAssets: LocalAsset[];
  loading: {
    inventories: boolean;
    assets: boolean;
    sync: boolean;
  };
  lastUpdate: Date | null;
}
```

### 2. Gestión de Errores Robusta
```typescript
// Patrón de error handling consistente
const handleOperation = async (operation: () => Promise<void>, errorMessage: string) => {
  try {
    setLoading(true);
    await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    Alert.alert('Error', errorMessage);
    // Log adicional para debugging
    captureException(error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Optimización de Rendimiento
```typescript
// UseMemo y useCallback para evitar re-renders innecesarios
const memoizedInventories = useMemo(() => inventories, [inventories]);
const onRefresh = useCallback(() => loadInventories(), []);

// Virtualización para listas grandes
<FlatList
  data={localAssets}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <AssetItem asset={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={5}
/>
```

## 🔧 Implementación Detallada y Optimizada

### Paso 1: SQLite Service Mejorado

**`apps/mobile/src/services/sqliteService.ts`**

```typescript
// Interfaces tipadas para mejor autocompletado
export interface LocalAsset {
  id: string;
  asset_id: string;
  name: string;
  area_id: string;
  synced_at: string;
  inventory_id?: string; // Nuevo campo para gestión multi-inventario
}

// Gestión por inventario con transacciones
export async function manageInventoryAssets(
  inventoryId: string, 
  assets: Array<{ id: string; asset_id: string; name: string; area_id: string }>
): Promise<void> {
  if (Platform.OS === 'web') {
    // Implementación web con Map mejorada
    const now = new Date().toISOString();
    
    // Primero eliminar assets antiguos de este inventario
    for (const [key, asset] of webTables.local_assets.entries()) {
      if (asset.inventory_id === inventoryId) {
        webTables.local_assets.delete(key);
      }
    }
    
    // Insertar nuevos assets
    assets.forEach(asset => {
      webTables.local_assets.set(asset.id, {
        ...asset,
        synced_at: now,
        inventory_id: inventoryId
      });
    });
    return;
  }

  // Implementación SQLite con transacción atómica
  const database = getDb();
  
  try {
    database.execSync('BEGIN TRANSACTION');
    
    // 1. Eliminar assets existentes de este inventario
    database.runSync(
      `DELETE FROM local_assets WHERE inventory_id = ?`,
      inventoryId
    );
    
    // 2. Insertar nuevos assets
    const now = new Date().toISOString();
    assets.forEach(asset => {
      database.runSync(
        `INSERT INTO local_assets (id, asset_id, name, area_id, synced_at, inventory_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        asset.id, asset.asset_id, asset.name, asset.area_id, now, inventoryId
      );
    });
    
    database.execSync('COMMIT');
  } catch (error) {
    database.execSync('ROLLBACK');
    throw error;
  }
}

// Función optimizada para obtener assets
export async function getLocalAssets(inventoryId?: string): Promise<LocalAsset[]> {
  if (Platform.OS === 'web') {
    const assets = Array.from(webTables.local_assets.values());
    return inventoryId 
      ? assets.filter(asset => asset.inventory_id === inventoryId)
      : assets;
  }

  const database = getDb();
  if (inventoryId) {
    return database.getAllSync<LocalAsset>(
      `SELECT * FROM local_assets WHERE inventory_id = ? ORDER BY asset_id`,
      inventoryId
    );
  }
  
  return database.getAllSync<LocalAsset>(
    `SELECT * FROM local_assets ORDER BY asset_id`
  );
}

// Conteo optimizado
export async function getAssetsCount(inventoryId?: string): Promise<number> {
  if (Platform.OS === 'web') {
    const assets = Array.from(webTables.local_assets.values());
    return inventoryId 
      ? assets.filter(asset => asset.inventory_id === inventoryId).length
      : assets.length;
  }

  const database = getDb();
  let query = `SELECT COUNT(*) as count FROM local_assets`;
  const params: any[] = [];
  
  if (inventoryId) {
    query += ` WHERE inventory_id = ?`;
    params.push(inventoryId);
  }
  
  const result = database.getFirstSync<{ count: number }>(query, ...params);
  return result?.count || 0;
}
```

### Paso 2: HomeScreen con Estado Optimizado

**`apps/mobile/src/screens/HomeScreen.tsx`**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchInventories,
  fetchAssetsForArea,
  supabase,
} from '../services/supabaseService';
import {
  manageInventoryAssets,
  getAssetsCount,
  getLocalAssets,
  setMeta,
  getMeta,
} from '../services/sqliteService';
import type { RootStackParamList } from './HomeScreen';

// Estado tipado para mejor manejo
interface AppState {
  inventories: InventoryItem[];
  selectedInventory: InventoryItem | null;
  assetsCount: number;
  loading: boolean;
  refreshing: boolean;
  lastUpdate: Date | null;
}

export function HomeScreen({ navigation }: Props) {
  // Estado unificado para mejor gestión
  const [state, setState] = useState<AppState>({
    inventories: [],
    selectedInventory: null,
    assetsCount: 0,
    loading: true,
    refreshing: false,
    lastUpdate: null,
  });

  // Carga inicial optimizada
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const [inventories, lastInventoryId] = await Promise.all([
        fetchInventories(),
        getMeta('last_inventory_id')
      ]);
      
      const selectedInventory = inventories.find(inv => inv.id === lastInventoryId) || 
                               inventories[0] || 
                               null;
      
      const assetsCount = await getAssetsCount();
      
      setState({
        inventories,
        selectedInventory,
        assetsCount,
        loading: false,
        refreshing: false,
        lastUpdate: new Date(),
      });
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setState(prev => ({ ...prev, loading: false, refreshing: false }));
      Alert.alert('Error', 'No se pudieron cargar los datos iniciales');
    }
  };

  // Refresh optimizado con useCallback
  const onRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadInitialData();
  }, []);

  // Descarga de activos con gestión de errores robusta
  const onDownload = async () => {
    const { selectedInventory } = state;
    if (!selectedInventory) {
      Alert.alert('Error', 'Selecciona un inventario primero');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const assets = await fetchAssetsForArea(selectedInventory.area_id);
      
      // Gestión atómica de assets
      await manageInventoryAssets(selectedInventory.id, assets.map(a => ({
        id: a.id,
        asset_id: a.asset_id,
        name: a.name,
        area_id: a.area_id,
      })));

      // Actualizar metadatos y estado
      await setMeta('last_inventory_id', selectedInventory.id);
      
      const assetsCount = await getAssetsCount(selectedInventory.id);
      
      setState(prev => ({
        ...prev,
        assetsCount,
        loading: false,
        lastUpdate: new Date(),
      }));

      Alert.alert(
        '✅ Descarga completada', 
        `${assets.length} activos guardados\nInventario: ${selectedInventory.areas?.name}`
      );
      
    } catch (error) {
      console.error('Download error:', error);
      setState(prev => ({ ...prev, loading: false }));
      Alert.alert('Error', 'No se pudo descargar los activos');
    }
  };

  // Render optimizado con componentes separados
  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Header />
      
      <InventorySelector
        inventories={state.inventories}
        selectedInventory={state.selectedInventory}
        onSelect={(inventory) => setState(prev => ({ 
          ...prev, 
          selectedInventory: inventory 
        }))}
        loading={state.loading}
      />
      
      <CurrentStatus
        selectedInventory={state.selectedInventory}
        assetsCount={state.assetsCount}
        lastUpdate={state.lastUpdate}
        onViewAssets={() => navigation.navigate('LocalAssets')}
      />
      
      <ActionButtons
        onDownload={onDownload}
        onScan={() => navigation.navigate('Scan', { 
          inventoryId: state.selectedInventory?.id || '' 
        })}
        onSync={onSync}
        loading={state.loading}
        hasInventory={!!state.selectedInventory}
        hasAssets={state.assetsCount > 0}
      />
      
      {state.loading && <LoadingIndicator />}
    </ScrollView>
  );
}

// Componentes separados para mejor mantenibilidad
const Header = () => (
  <View>
    <Text style={styles.title}>AFT — Campo</Text>
    <Text style={styles.subtitle}>
      Selecciona un inventario, descarga los activos, escanea y sincroniza.
    </Text>
  </View>
);

// ... más componentes separados para cada sección
```

### Paso 3: Pantalla de Activos con Virtualización

**`apps/mobile/src/screens/LocalAssetsScreen.tsx`**

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { getLocalAssets, LocalAsset } from '../services/sqliteService';

// Componente de item optimizado
const AssetItem = React.memo(({ asset }: { asset: LocalAsset }) => (
  <View style={styles.assetItem}>
    <Text style={styles.assetId}>{asset.asset_id}</Text>
    <Text style={styles.assetName}>{asset.name}</Text>
    <Text style={styles.assetMeta}>
      Área: {asset.area_id} • {new Date(asset.synced_at).toLocaleDateString()}
    </Text>
  </View>
));

AssetItem.displayName = 'AssetItem';

export function LocalAssetsScreen() {
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssets = useCallback(async () => {
    try {
      const localAssets = await getLocalAssets();
      setAssets(localAssets);
    } catch (error) {
      console.error('Error loading assets:', error);
      Alert.alert('Error', 'No se pudieron cargar los activos');
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
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando activos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activos Descargados</Text>
        <Text style={styles.count}>{assets.length} activos</Text>
      </View>

      <FlatList
        data={assets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetItem asset={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay activos descargados</Text>
            <Text style={styles.emptySubtext}>
              Descarga activos desde la pantalla principal
            </Text>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        getItemLayout={(data, index) => (
          { length: 80, offset: 80 * index, index }
        )}
      />
    </View>
  );
}
```

### Paso 4: Actualización de Esquema SQLite

**Migración necesaria para multi-inventario:**

```sql
-- Agregar columna inventory_id a local_assets
ALTER TABLE local_assets ADD COLUMN inventory_id TEXT;

-- Crear índice para mejor performance
CREATE INDEX idx_local_assets_inventory_id ON local_assets(inventory_id);

-- Actualizar datos existentes (si los hay)
UPDATE local_assets SET inventory_id = 
  (SELECT value FROM app_meta WHERE key = 'last_inventory_id')
WHERE inventory_id IS NULL;
```

## 🧪 Estrategia de Testing Completa

### 1. Testing de Integración
```typescript
// Tests para gestión de inventarios
describe('Inventory Management', () => {
  it('should handle multiple inventories without overwriting', async () => {
    // Descargar inventario 1
    await downloadInventory('inv-1');
    const assets1 = await getLocalAssets('inv-1');
    
    // Descargar inventario 2  
    await downloadInventory('inv-2');
    const assets2 = await getLocalAssets('inv-2');
    
    // Verificar que ambos existen
    expect(assets1.length).toBeGreaterThan(0);
    expect(assets2.length).toBeGreaterThan(0);
    
    // Verificar que no se mezclan
    const allAssets = await getLocalAssets();
    expect(allAssets.length).toBe(assets1.length + assets2.length);
  });
});
```

### 2. Testing de Rendimiento
```typescript
// Test de rendimiento con muchos activos
it('should handle large number of assets efficiently', async () => {
  const largeInventory = Array.from({ length: 1000 }, (_, i) => ({
    id: `asset-${i}`,
    asset_id: `MB${String(i).padStart(5, '0')}`,
    name: `Asset ${i}`,
    area_id: 'area-1'
  }));

  // Medir tiempo de inserción
  const startTime = Date.now();
  await manageInventoryAssets('large-inv', largeInventory);
  const duration = Date.now() - startTime;

  expect(duration).toBeLessThan(5000); // Menos de 5 segundos
});
```

### 3. Testing de UI
```typescript
// Test de interfaz de usuario
it('should display correct asset count', async () => {
  const { getByText } = render(<HomeScreen />);
  
  // Verificar que muestra el conteo correcto
  expect(getByText(/Activos descargados: 5/)).toBeTruthy();
  
  // Simular descarga de más activos
  await downloadInventory('new-inv');
  
  // Verificar que se actualiza
  expect(getByText(/Activos descargados: 10/)).toBeTruthy();
});
```

## 🚀 Plan de Implementación por Fases

### Fase 1: Implementación Core (Día 1)
1. ✅ Actualizar esquema SQLite
2. ✅ Implementar nuevas funciones en sqliteService
3. ✅ Modificar HomeScreen con nuevo estado
4. ✅ Crear LocalAssetsScreen básica

### Fase 2: Optimización (Día 2)  
1. ✅ Implementar virtualización en listas
2. ✅ Agregar gestión de errores robusta
3. ✅ Optimizar rendimiento con useMemo/useCallback
4. ✅ Implementar pull-to-refresh

### Fase 3: Testing y Depuración (Día 3)
1. ✅ Testing de integración completo
2. ✅ Testing de rendimiento  
3. ✅ Testing de UI
4. ✅ Depuración y optimización final

## 📊 Métricas de Éxito

- **Rendimiento**: Carga de pantalla < 2 segundos
- **Memoria**: Uso estable con 1000+ activos
- **Usabilidad**: Feedback visual inmediato
- **Confiabilidad**: 0 crashes en testing
- **Mantenibilidad**: Código bien estructurado y documentado

Este plan asegura una implementación robusta, performante y mantenible de todas las mejoras solicitadas. 🎯