# Plan de Mejoras — App Móvil AFT

> Basado en `MEJORAS_APP_MOVIL_IMPLEMENTACION.md`
> Estado actual: App funcional con selector de inventarios, sin vista de activos locales

---

## Mejora 1: Agregar `inventory_id` a `local_assets` (SQLite)

**Problema:** Al descargar un nuevo inventario, se borran los activos del anterior (`clearLocalAssets()` hace DELETE ALL).

**Solución:** Agregar columna `inventory_id` a la tabla `local_assets` para soportar múltiples inventarios sin sobrescritura.

**Archivos a modificar:**
- `apps/mobile/src/services/sqliteService.ts`

**Cambios:**
- Agregar `inventory_id TEXT` al CREATE TABLE de `local_assets`
- Reemplazar `clearLocalAssets()` → `clearInventoryAssets(inventoryId)`
- Agregar `getLocalAssets(inventoryId?)` — filtra por inventario
- Agregar `getAssetsCount(inventoryId?)` — conteo por inventario
- Usar transacciones para inserts atómicos

---

## Mejora 2: Pantalla de Activos Locales (`LocalAssetsScreen`)

**Problema:** El usuario no puede ver qué activos tiene descargados actualmente.

**Solución:** Nueva pantalla que lista los activos almacenados en SQLite para el inventario seleccionado.

**Archivos nuevos:**
- `apps/mobile/src/screens/LocalAssetsScreen.tsx`

**Características:**
- `FlatList` con virtualización (para 1000+ activos)
- Pull-to-refresh
- Muestra: asset_id, nombre, área, fecha de descarga
- Estado vacío con mensaje "Descarga activos desde la pantalla principal"
- `React.memo` en cada item para evitar re-renders

**Navegación:**
- Agregar ruta `LocalAssets` al `RootStackParamList`
- Botón "Ver activos descargados" en HomeScreen

---

## Mejora 3: HomeScreen — Estado unificado + Pull-to-Refresh

**Problema:** Estado disperso en múltiples `useState`, sin indicador de última actualización, sin refresh manual.

**Solución:** Refactorizar HomeScreen con estado unificado y `RefreshControl`.

**Cambios en `HomeScreen.tsx`:**
- Estado unificado: `{ inventories, selectedInventory, assetsCount, loading, refreshing, lastUpdate }`
- Agregar `RefreshControl` al `ScrollView`
- Mostrar fecha de última actualización
- Mostrar conteo de activos descargados junto al inventario seleccionado
- Separar componentes: `InventorySelector`, `CurrentStatus`, `ActionButtons`

---

## Mejora 4: Gestión de errores robusta

**Problema:** Los errores se manejan de forma inconsistente.

**Solución:** Patrón consistente de error handling.

```typescript
const withLoading = async (
  operation: () => Promise<void>,
  errorMsg: string,
  setLoading: (v: boolean) => void
) => {
  try {
    setLoading(true);
    await operation();
  } catch (e) {
    Alert.alert('Error', e instanceof Error ? e.message : errorMsg);
  } finally {
    setLoading(false);
  }
};
```

---

## Orden de implementación

| # | Mejora | Complejidad | Dependencias |
|---|--------|-------------|--------------|
| 1 | `inventory_id` en SQLite | Baja | — |
| 2 | `LocalAssetsScreen` | Media | #1 |
| 3 | HomeScreen refactor | Media | #1 |
| 4 | Error handling | Baja | Independiente |

**Tiempo estimado:** 2-3 horas de desarrollo.

---

## Criterios de aceptación

1. ✅ Descargar inventario A → Descargar inventario B → Ambos persisten en SQLite
2. ✅ Pantalla "Activos Descargados" muestra lista con búsqueda
3. ✅ Pull-to-refresh en HomeScreen actualiza lista de inventarios
4. ✅ Fecha de última actualización visible
5. ✅ 0 crashes con 1000+ activos en lista
