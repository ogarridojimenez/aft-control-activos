# Lógica de Validación y Sincronización

## 1. Validación de Formato de ID de Activo

### En el Cliente (React Native - SQLite)
```typescript
// utils/validation.ts
export const validateAssetId = (assetId: string): boolean => {
  const assetIdRegex = /^MB[0-9]{5,}$/;
  return assetIdRegex.test(assetId);
};

export const sanitizeAssetId = (input: string): string => {
  // Remover espacios y convertir a mayúsculas
  const cleaned = input.trim().toUpperCase();
  // Asegurar que empieza con MB
  if (!cleaned.startsWith('MB')) {
    return `MB${cleaned}`;
  }
  return cleaned;
};
```

### En el Servidor (Next.js - Supabase)
```typescript
// lib/utils/validation.ts
import { z } from 'zod';

export const assetIdSchema = z.string().regex(/^MB[0-9]{5,}$/, {
  message: 'ID de activo debe seguir el formato MB seguido de 5 o más dígitos'
});

export const validateAssetId = (assetId: string) => {
  return assetIdSchema.safeParse(assetId);
};
```

## 2. Estrategia de Sincronización Offline-First

### Flujo de Sincronización
1. **Carga Masiva (Portal Admin)**:
   - Usuario sube Excel vía `/api/upload`
   - Workflow procesa el archivo y valida cada fila
   - Activos insertados/actualizados en Supabase
   - Notificación enviada a dispositivos en el área via WebSocket (opcional)

2. **Descarga Local (App Móvil)**:
   - Al iniciar sesión o solicitar inventario, la app descarga activos del área
   - Data se almacena en SQLite local con marcado `synced = true`
   - Se crea registro en tabla `offline_sync` para tracking futuro

3. **Modo Offline (Escaneo)**:
   - Usuario escanea QR de activo
   - App verifica formato local y consulta SQLite
   - Si existe: marca como encontrado (`quantity_found++`)
   - Si no existe localmente pero formato válido: se marca como "potencialmente nuevo" para revisión posterior
   - Todos los escaneos se guardan en cola local con timestamp

4. **Sincronización de Resultados**:
   - Al recuperar conexión, app envía resultados al endpoint `/api/sync`
   - Workflow procesa comparación entre esperado (SQLite descargado) y encontrado (escaneos)
   - Genera registros de conciliación en Supabase
   - Limpia cola local de sincronización

### Manejo de Conflictos
#### Estrategia: "último escribe gana" con tracking de timestamps
```typescript
// servicios/syncService.ts
interface SyncConflict {
  entityType: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  localTimestamp: string;
  remoteTimestamp: string;
}

export const resolveSyncConflict = async (conflict: SyncConflict) => {
  // Para activos: priorizar cambios hechos por admin (más confiable)
  if (conflict.entityType === 'asset') {
    // Si la versión remota es más reciente o fue modificada por admin, usar remota
    const isRemoteNewer = new Date(conflict.remoteTimestamp) > new Date(conflict.localTimestamp);
    if (isRemoteNewer) {
      return conflict.remoteVersion;
    }
    // Si es igual o local es más reciente, verificar quién hizo el cambio
    // (esto requeriría tracking de user_id en las tablas)
    return conflict.localVersion; // default a local si no hay info de usuario
  }

  // Para items de inventario:mergear cantidades encontradas
  if (conflict.entityType === 'inventory_item') {
    const merged = { ...conflict.remoteVersion };
    merged.quantity_found = Math.max(
      conflict.localVersion.quantity_found || 0,
      conflict.remoteVersion.quantity_found || 0
    );
    return merged;
  }

  // Default: usar versión remota (asumiendo que es la fuente de verdad)
  return conflict.remoteVersion;
};
```

#### Detección de Conflictos
```typescript
// En el cliente antes de enviar cambios
const hasLocalChanges = await checkLocalChangesSinceLastSync();
if (hasLocalChanges) {
  // Obtener versión remota actual
  const remoteVersion = await fetchRemoteVersion(entityId);
  const localVersion = await getLocalVersion(entityId);
  
  if (JSON.stringify(localVersion) !== JSON.stringify(remoteVersion)) {
    // Conflicto detectado
    const resolved = await resolveSyncConflict({
      entityType,
      entityId,
      localVersion,
      remoteVersion,
      localTimestamp: getLocalTimestamp(entityId),
      remoteTimestamp: remoteVersion.updated_at
    });
    
    // Aplicar versión resuelta localmente
    await applyResolvedVersion(entityId, resolved);
  }
}
```

## 3. Workflows de Sincronización (Next.js)

### Workflow de Carga Masiva de Excel
```typescript
// apps/admin/src/api/workflows/uploadWorkflow.ts
import { sleep } from 'workflow';
import { createHook } from 'workflow';
import { start } from 'workflow/api';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase/admin';

const excelRowSchema = z.object({
  asset_id: z.string().regex(/^MB[0-9]{5,}$/),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().datetime().optional(),
  purchase_value: z.number().nonnegative().optional(),
  location: z.string().optional(),
  area_code: z.string()
});

export async function uploadExcelWorkflow(fileBuffer: Buffer, areaCode: string, userId: string) {
  "use workflow";
  
  // Paso 1: Leer y validar Excel
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Paso 2: Validar encabezados y convertir a objetos
  const headers = rawData[0] as string[];
  const dataRows = rawData.slice(1);
  
  const validatedRows: any[] = [];
  const errors: any[] = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowData: any = {};
    
    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });
    
    const validationResult = excelRowSchema.safeParse({
      ...rowData,
      area_code: areaCode
    });
    
    if (validationResult.success) {
      validatedRows.push(validationResult.data);
    } else {
      errors.push({
        row: i + 2, // Excel es 1-indexed + encabezado
        data: rowData,
        errors: validationResult.error.errors
      });
    }
  }
  
  // Paso 3: Si hay errores, esperar corrección manual (opcional)
  if (errors.length > 0) {
    const hook = createHook<{ correctedRows: any[] }>({
      token: `upload-validation-${Date.now()}`
    });
    
    // Notificar al usuario vía WebSocket o email sobre errores
    // En implementación real, esto sería manejado por el frontend
    
    const result = await hook; // Espera corrección o timeout
    if (result.correctedRows) {
      validatedRows.push(...result.correctedRows);
    }
  }
  
  // Paso 4: Procesar validaciones en lotes
  const batchSize = 50;
  for (let i = 0; i < validatedRows.length; i += batchSize) {
    const batch = validatedRows.slice(i, i + batchSize);
    
    // Upsert activos en Supabase
    const { data, error } = await supabaseAdmin
      .from('assets')
      .upsert(
        batch.map(asset => ({
          asset_id: asset.asset_id,
          name: asset.name,
          description: asset.description,
          category: asset.category,
          brand: asset.brand,
          model: asset.model,
          serial_number: asset.serial_number,
          purchase_date: asset.purchase_date,
          purchase_value: asset.purchase_value,
          location: asset.location,
          area_id: (await supabaseAdmin
            .from('areas')
            .select('id')
            .eq('code', asset.area_code)
            .single()
          ).data?.id,
          updated_by: userId
        })),
        { onConflict: ['asset_id'] }
      );
    
    if (error) {
      throw new Error(`Failed to upsert batch: ${error.message}`);
    }
    
    // Pequeña pausa entre lotes para no sobrecargar la DB
    if (i + batchSize < validatedRows.length) {
      await sleep('1s');
    }
  }
  
  return {
    processed: validatedRows.length,
    errors: errors.length,
    assetIds: validatedRows.map(a => a.asset_id)
  };
}
```

### Workflow de Sincronización de Inventario
```typescript
// apps/admin/src/api/workflows/reconciliationWorkflow.ts
import { sleep } from 'workflow';
import { start } from 'workflow/api';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function reconciliationWorkflow(inventoryId: string, deviceResults: any[]) {
  "use workflow";
  
  // Paso 1: Obtener inventario y área
  const { data: inventory, error: inventoryError } = await supabaseAdmin
    .from('inventories')
    .select(`
      id,
      area_id,
      areas!inner (
        id,
        name
      )
    `)
    .eq('id', inventoryId)
    .single();
  
  if (inventoryError) throw inventoryError;
  
  // Paso 2: Obtener activos esperados para el área
  const { data: expectedAssets, error: assetsError } = await supabaseAdmin
    .from('assets')
    .select('id, asset_id, name, category')
    .eq('area_id', inventory.area_id)
    .eq('status', 'active');
  
  if (assetsError) throw assetsError;
  
  // Paso 3: Procesar resultados del dispositivo
  const foundAssetIds = new Set();
  const surplusAssets = [];
  
  for (const result of deviceResults) {
    const assetId = result.asset_id;
    
    // Validar formato
    if (!/^MB[0-9]{5,}$/.test(assetId)) {
      continue; // Ignorar IDs inválidos
    }
    
    const asset = expectedAssets.find(a => a.asset_id === assetId);
    
    if (asset) {
      foundAssetIds.add(asset.id);
    } else {
      // Activo no esperado en el área (sobrante)
      surplusAssets.push({
        asset_id: assetId,
        scanned_at: result.scanned_at,
        notes: result.notes || 'Activo encontrado fuera de área esperada'
      });
    }
  }
  
  // Paso 4: Identificar activos faltantes
  const missingAssets = expectedAssets
    .filter(asset => !foundAssetIds.has(asset.id))
    .map(asset => ({
      asset_id: asset.asset_id,
      name: asset.name,
      category: asset.category,
      last_known_location: asset.location
    }));
  
  // Paso 5: Crear o actualizar registro de conciliación
  const { data: reconciliation, error: reconError } = await supabaseAdmin
    .from('reconciliations')
    .upsert(
      {
        inventory_id: inventoryId,
        missing_assets: missingAssets,
        surplus_assets: surplusAssets,
        summary: {
          expected_count: expectedAssets.length,
          found_count: foundAssetIds.size,
          missing_count: missingAssets.length,
          surplus_count: surplusAssets.length,
          accuracy_percentage: expectedAssets.length > 0 
            ? Math.round((foundAssetIds.size / expectedAssets.length) * 100)
            : 0
        },
        status: 'completed'
      },
      { onConflict: ['inventory_id'] }
    );
  
  if (reconError) throw reconError;
  
  // Paso 6: Actualizar estado del inventario
  const { error: inventoryUpdateError } = await supabaseAdmin
    .from('inventories')
    .update({ status: 'completed' })
    .eq('id', inventoryId);
  
  if (inventoryUpdateError) throw inventoryUpdateError;
  
  return {
    reconciliationId: reconciliation.id,
    summary: {
      expected: expectedAssets.length,
      found: foundAssetIds.size,
      missing: missingAssets.length,
      surplus: surplusAssets.length
    }
  };
}
```