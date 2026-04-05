# Análisis de Riesgos Técnicos - Sistema AFT
## Basado en Estándares de Arquitectura Empresarial (EA)

### Riesgo 1: Colisiones de Datos en Modo Offline

**Descripción**: 
Cuando múltiples dispositivos operan en modo offline en el mismo área y escanean los mismos activos, se pueden generar conflictos al sincronizar. Por ejemplo, dos operadores escanean el mismo activo y ambos intentan incrementar el contador `quantity_found`, lo que puede llevar a una pérdida de actualizaciones si no se maneja correctamente.

**Impacto**: 
Alto - Afecta la precisión de la conciliación y puede llevar a reportes incorrectos de activos faltantes o sobrantes.

**Probabilidad**: 
Media - Depende del número de operadores simultáneos por área y la frecuencia de escaneo.

**Mitigación EA**:
1. **Patrón de Bloqueo Optimista con Vectores de Versión**:
   - Cada registro en `inventory_items` incluye un campo `version` (integer) que se incrementa en cada actualización
   - Al sincronizar, el cliente envía la versión esperada junto con los cambios
   - Si la versión en base no coincide, se detecta conflicto y se aplica estrategia de resolución

2. **Resolución de Conflictos Basada en Intenciones**:
   - En lugar de simplemente comparar valores, el sistema registra la intención detrás de cada cambio
   - Para `quantity_found`: si ambos dispositivos intentan incrementar, el resultado final es la suma de los incrementos
   - Implementado mediante triggers en base de datos que analizan el tipo de operación

3. **Particionamiento por Dispositivo en Tabla Temporal**:
   - Durante el modo offline, cada dispositivo escribe en una tabla temporal específica (`inventory_items_device_{device_id}`)
   - Al sincronizar, se aplica un proceso de merge que suma cantidades por activo y dispositivo
   - Reduce significativamente la probabilidad de colisiones directas

**Implementación Técnica**:
```sql
-- Agregar vector de versión a inventory_items
ALTER TABLE inventory_items 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN last_modified_by UUID REFERENCES auth.users(id);

-- Función de merge para sincronización
CREATE OR REPLACE FUNCTION merge_inventory_item_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nuevo registro desde dispositivo
    NEW.version = 1;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar si hay conflicto
    IF NEW.version <= OLD.version THEN
      -- Conflicto detectado o versión antigua
      -- Estrategia: sumar cantidades encontradas si ambos son incrementos
      NEW.quantity_found = OLD.quantity_found + 
                          GREATEST(0, NEW.quantity_found - OLD.quantity_found);
      NEW.version = OLD.version + 1;
    ELSE
      -- Actualización normal
      NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merge_inventory_item_changes
BEFORE INSERT OR UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION merge_inventory_item_changes();
```

### Riesgo 2: Latencia y Timeout en Carga Masiva de Excel

**Descripción**: 
La carga de archivos Excel grandes (10,000+ activos) puede causar timeouts en las funciones serverless de Vercel, consumir excesiva memoria, o bloquear otros procesos debido a operaciones síncronas prolongadas en la base de datos.

**Impacto**: 
Medio-Alto - Afecta la usabilidad del portal administrativo y puede llevar a fallas en la carga inicial de datos.

**Probabilidad**: 
Media - Depende del tamaño típico de los inventarios y la frecuencia de actualizaciones masivas.

**Mitigación EA**:
1. **Procesamiento Asíncrono con Cola de Trabajos Duraderos**:
   - En lugar de procesar el upload directamente en la API route, enviarlo a una cola de trabajos
   - Utilizar Vercel Queues (durable event streaming) para procesamiento en background
   - El workflow de upload se ejecuta como un job durable con checkpointing y reintentos automáticos

2. **Procesamiento en Lotes con Backpressure Control**:
   - Leer el Excel en streaming usando bibliotecas como `exceljs` en modo streaming
   - Procesar en lotes configurables (ej: 100 registros) con pausas adaptativas entre lotes
   - Implementar control de backpressure basado en tiempo de respuesta de la base de datos

3. **Endpoint de Progreso en Tiempo Real**:
   - El workflow publica progreso a un canal de Realtime/Supabase o a través de Server-Sent Events
   - El frontend muestra barra de progreso detallada y permite cancelación
   - Reduce percepción de latencia y mejora experiencia de usuario

**Implementación Técnica**:
```typescript
// apps/admin/src/api/workflows/uploadWorkflow.ts - Versión mejorada
import { sleep } from 'workflow';
import { createHook } from 'workflow';
import * as exceljs from 'exceljs';

export async function uploadExcelWorkflow(fileBuffer: Buffer, areaCode: string, userId: string) {
  "use workflow";
  
  // Paso 1: Lectura en streaming para controlar memoria
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.load(fileBuffer);
  const worksheet = workbook.getWorksheet(1);
  
  // Obtener encabezados
  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values.slice(1) as string[];
  
  // Procesar en lotes con progreso
  const batchSize = 100;
  let processedCount = 0;
  let errorCount = 0;
  
  // Canal para reportar progreso
  const progressHook = createHook<{ 
    processed: number; 
    total: number; 
    errors: number; 
    percentage: number 
  }>({
    token: `upload-progress-${Date.now()}`
  });
  
  // Enviar progreso inicial
  await progressHook.resume({ processed: 0, total: worksheet.rowCount - 1, errors: 0, percentage: 0 });
  
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum += batchSize) {
    const batchEnd = Math.min(rowNum + batchSize - 1, worksheet.rowCount);
    const batchRows = worksheet.getRows(rowNum, batchEnd);
    
    const batchData: any[] = [];
    const batchErrors: any[] = [];
    
    for (const row of batchRows) {
      const rowData: any = {};
      headers.forEach((header, colIndex) => {
        rowData[header] = row.getCell(colIndex + 1)?.value;
      });
      
      // Validación inmediata
      try {
        const validated = excelRowSchema.parse({
          ...rowData,
          area_code: areaCode
        });
        batchData.push(validated);
      } catch (error) {
        batchErrors.push({
          row: rowNum,
          data: rowData,
          error: error.message
        });
        errorCount++;
      }
    }
    
    // Procesar lote si hay datos válidos
    if (batchData.length > 0) {
      const { error } = await supabaseAdmin
        .from('assets')
        .upsert(
          batchData.map(asset => ({
            asset_id: asset.asset_id,
            name: asset.name,
            // ... otros campos
            updated_by: userId
          })),
          { onConflict: ['asset_id'] }
        );
      
      if (error) {
        throw new Error(`Database error in batch: ${error.message}`);
      }
      
      processedCount += batchData.length;
    }
    
    // Reportar progreso
    await progressHook.resume({
      processed: processedCount,
      total: worksheet.rowCount - 1,
      errors: errorCount,
      percentage: Math.round((processedCount / (worksheet.rowCount - 1)) * 100)
    });
    
    // Pausa adaptativa basada en tiempo de procesamiento
    const batchStart = Date.now();
    // ... procesamiento del lote ya ocurrió arriba
    const batchEnd = Date.now();
    const processingTime = batchEnd - batchStart;
    
    // Pausa mínima de 100ms, máximo 1000ms basada en tiempo de procesamiento
    const delayMs = Math.min(1000, Math.max(100, processingTime));
    await sleep(`${delayMs}ms`);
  }
  
  return {
    processed: processedCount,
    errors: errorCount,
    successRate: processedCount > 0 ? 
      Math.round((processedCount / (processedCount + errorCount)) * 100) : 0
  };
}
```

### Riesgo 3: Inconsistencia de Estado entre SQLite Local y Supabase Remoto

**Descripción**: 
Debido a fallas en la sincronización (pérdida de red, crashes de la aplicación, etc.), el estado local en SQLite puede divergir significativamente del estado remoto en Supabase. Esto puede llevar a situaciones donde el dispositivo cree que tiene los datos más recientes cuando en realidad está trabajando con información obsoleta.

**Impacto**: 
Alto - Puede causar decisiones operativas incorrectas basada en datos desactualizados.

**Probabilidad**: 
Media-Baja - Depende de la confiabilidad de la red y la frecuencia de sincronización programada.

**Mitigación EA**:
1. **Patrón de Estado de Sincronización con Vectores de Reloj**:
   - Mantener un vector de reloj (vector timestamp) que represente el último estado conocido sincronizado
   - Cada entidad tiene un `last_synced_version` que se compara con el `current_version` remoto
   - Si el vector local es anterior al remoto, se requiere sincronización completa antes de operar

2. **Checksum de Conjunto de Datos para Validación Rápida**:
   - Antes de permitir operaciones críticas (como iniciar un inventario), calcular un hash/checksum del conjunto de datos local
   - Comparar con el checksum remoto obtenido vía API ligera
   - Si no coinciden, forzar sincronización antes de continuar

3. **Modo de Operación Degradado con Advertencias Claras**:
   - Cuando se detecta posible inconsistencia, entrar en modo de advertencia
   - Permitir operaciones pero mostrar indicadores visuales claros de que los datos pueden estar desactualizados
   - Bloquear operaciones que requieran alta precisión (como aprobaciones finales) hasta que se confirme sincronización

**Implementación Técnica**:
```typescript
// services/syncService.ts - Enhanced with clock vectors
interface ClockVector {
  [entityType: string]: number; // versión más reciente conocida por tipo de entidad
}

export class SyncStateManager {
  private db: SQLiteDatabase;
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
  }
  
  async getLocalClockVector(): Promise<ClockVector> {
    const result = await this.db.getFirst<{ 
      entity_type: string; 
      max_version: number 
    }>(`
      SELECT entity_type, MAX(version) as max_version
      FROM (
        SELECT 'asset' as entity_type, version FROM assets
        UNION ALL
        SELECT 'inventory_item' as entity_type, version FROM inventory_items
        UNION ALL
        SELECT 'reconciliation' as entity_type, version FROM reconciliations
      )
      GROUP BY entity_type
    `);
    
    const clockVector: ClockVector = {};
    if (result) {
      // En implementación real, llenar el vector desde el resultado
      // Esto es simplificado para ilustración
    }
    return clockVector;
  }
  
  async needsFullSync(): Promise<boolean> {
    try {
      const localClock = await this.getLocalClockVector();
      const remoteClock = await this.fetchRemoteClockVector();
      
      // Comparar vectores: si cualquiera local < remoto, necesita sync
      for (const [entityType, remoteVersion] of Object.entries(remoteClock)) {
        const localVersion = localClock[entityType] || 0;
        if (localVersion < remoteVersion) {
          return true;
        }
      }
      return false;
    } catch (error) {
      // En caso de error, asumir que necesitamos sincronizar por seguridad
      return true;
    }
  }
  
  async fetchRemoteClockVector(): Promise<ClockVector> {
    const { data } = await supabase
      .rpc('get_database_clock_vector'); // Función RPC en Supabase
    
    return data as ClockVector;
  }
}

// Función RPC en Supabase para obtener vector de reloj
/*
CREATE OR REPLACE FUNCTION get_database_clock_vector()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT jsonb_object_agg(entity_type, max_version)
  INTO result
  FROM (
    SELECT 'asset' as entity_type, MAX(version) as max_version FROM assets
    UNION ALL
    SELECT 'inventory_item' as entity_type, MAX(version) FROM inventory_items
    UNION ALL
    SELECT 'reconciliation' as entity_type, MAX(version) FROM reconciliations
  ) v;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql;
*/
}