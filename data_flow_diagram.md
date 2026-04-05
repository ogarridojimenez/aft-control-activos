# Diagrama de Flujo del Dato - Sistema AFT

## Flujo Completo: Desde Excel Inicial hasta Reporte de Conciliación Final

### Fase 1: Carga Masiva de Activos (Portal Admin - Next.js/Vercel)
```
[Usuario Admin] 
        ↓ (Sube archivo Excel vía UI)
[Portal Admin: /upload page] 
        ↓ (Valida formato y estructura básica)
[API Route: POST /api/upload] 
        ↓ (Trigger Workflow: uploadExcelWorkflow)
[Workflow: Procesamiento Excel] 
        ↓ (Lee archivo con xlsx, valida cada fila con Zod)
        ↓ (Detecta errores → crea hook para corrección manual si es necesario)
        ↓ (Procesa en lotes de 50 registros)
        ↓ (Upsert en tabla assets de Supabase con onConflict: asset_id)
        ↓ (Actualiza area_id basado en código de área)
        ↓ (Registra updated_by = userId)
[Supabase Database] 
        ← (Activos insertados/actualizados)
        ↓ (Notificación opcional via Realtime/WebSocket a dispositivos)
[Dispositivos Móviles] 
        ← (Reciben notificación de activos actualizados)
```

### Fase 2: Preparación de Inventario (Portal Admin)
```
[Usuario Admin] 
        ↓ (Crea nuevo inventario para área específica)
[Portal Admin: /inventories/new] 
        ↓ (Selecciona área y fecha)
[API Route: POST /api/inventories] 
        ↓ (Crea registro en tabla inventories)
        ↓ (Establece status = 'planned')
[Supabase Database] 
        ← (Nuevo inventario creado)
        ↓ (Disponible para descarga en app móvil)
```

### Fase 3: Descarga y Preparación Local (App Móvil - React Native)
```
[Usuario Operador] 
        ↓ (Inicia sesión o selecciona área de inventario)
[App Móvil: Pantalla de Inventario] 
        ↓ (Solicita descarga de activos del área)
[Servicio: supabaseService.getAssetsByArea] 
        ↓ (Query a Supabase: SELECT * FROM assets WHERE area_id = ? AND status = 'active')
[Supabase Database] 
        ← (Lista de activos esperados para el área)
[Servicio: sqliteService.saveAssets] 
        ↓ (Guarda activos en tabla local SQLite: local_assets)
        ↓ (Marca cada registro con synced_at = NOW())
        ↓ (Crea registros en tabla offline_sync para tracking)
[SQLite Local Database] 
        ← (Activos esperados almacenados localmente)
        ↓ (App muestra pantalla de escaneo lista)
```

### Fase 4: Escaneo y Conciliación Local (App Móvil - Modo Offline)
```
[Usuario Operador] 
        ↓ (Inicia escaneo de QR de activo físico)
[App Móvil: Scanner Screen] 
        ↓ (Cámara lee QR → obtiene asset_id crudo)
        ↓ (Valida formato con regex /^MB[0-9]{5,}$/)
        ↓ (Si formato inválido: muestra error y pide re-escaneo)
        ↓ (Si formato válido: consulta SQLite local)
[SQLite Local Database] 
        ← (Busca asset_id en tabla local_assets o inventory_items)
        ↓ (Si encontrado:)
            → Incrementa quantity_found para ese asset_id
            → Registra timestamp de escaneo
            → Guarda en tabla inventory_items (INSERT/UPDATE)
            → Actualiza registro en offline_sync (operation: UPDATE)
        ↓ (Si no encontrado localmente pero formato válido:)
            → Guarda en tabla de "sobrantes potenciales" local
            → Marca para revisión posterior (p podría ser nuevo activo o error)
[SQLite Local Database] 
        ← (Actualiza conteos y registros de escaneo)
        ↓ (Continúa escaneando hasta completar área)
```

### Fase 5: Sincronización de Resultados (App Móvil)
```
[Usuario Operador] 
        ↓ (Finaliza escaneo y presiona "Sincronizar")
[App Móvil: Sync Service] 
        ↓ (Recopila todos los cambios locales desde última sincronización)
        ↓ (Prepara payload:)
            → Nuevos/actualizados inventory_items
            → Sobrantes detectados
            → Registros de offline_sync pendientes
[API Route: POST /api/sync/inventory] 
        ↓ (Valida autenticación y permisos)
        ↓ (Trigger Workflow: reconciliationWorkflow)
[Workflow: Procesamiento de Conciliación] 
        ↓ (Obtiene inventario y área asociada)
        ↓ (Obtiene activos esperados del área desde Supabase)
        ↓ (Procesa resultados del dispositivo:)
            → Construye set de asset_ids encontrados
            → Identifica activos faltantes (esperados pero no encontrados)
            → Identifica activos sobrantes (encontrados pero no esperados en área)
        ↓ (Calcula resumen: conteos, precisión, etc.)
        ↓ (Upsert en tabla reconciliaciones con onConflict: inventory_id)
        ↓ (Actualiza estado del inventario a 'completed')
[Supabase Database] 
        ← (Registro de conciliación creado/actualizado)
        ← (Inventario marcado como completado)
        ↓ (Notificación opcional a admin vía email/WebSocket)
```

### Fase 6: Generación de Reportes (Portal Admin)
```
[Usuario Admin/Auditor] 
        ↓ (Navega a lista de inventarios completados)
[Portal Admin: /inventories] 
        ↓ (Selecciona inventario específico)
[API Route: GET /api/inventories/[id]/reconciliation] 
        ↓ (Obtiene registro de reconciliación)
        ↓ (Incluye activos faltantes y sobrantes con detalles)
[Servicio: Report Generation Service] 
        ↓ (Para PDF:)
            → Usa biblioteca como pdfkit o jsPDF
            → Genera tabla de faltantes/sobrantes
            → Incluye gráfico de precisión
            → Aplica styling corporativo
        ↓ (Para Excel:)
            → Usa biblioteca como exceljs
            → Crea hojas: Resumen, Faltantes, Sobrantes, Detalle
            → Aplica formatos y filtros
[API Route: GET /api/inventories/[id]/report?format=pdf|excel] 
        ↓ (Retorna archivo generado con headers adecuados)
[Usuario Admin] 
        ← (Descarga reporte PDF/Excel de conciliación)
```

## Puntos de Integración Clave

1. **WebSocket/Realtime** (Opcional): Para notificaciones instantáneas entre portal y dispositivos
2. **Supabase Storage**: Para almacenar imágenes de activos y reportes generados
3. **Funciones Edge**: Para validaciones rápidas de formato de ID antes de hitting DB
4. **Cola de Tareas**: Para procesamiento asíncrono de reportes pesados (usando Vercel Functions o Workflows)
5. **Webhooks**: Para integración con sistemas externos de contabilidad o ERP

## Consideraciones de Tiempo y Consistencia

- **Timestamps**: Todos usan TIMESTAMP WITH TIME ZONE para consistencia global
- **Eventual Consistency**: El sistema acepta consistencia eventual entre local y remoto
- **Conflict Resolution**: Estrategia de "último escribe gana" con timestamp para la mayoría de entidades
- **Idempotencia**: Los workflows están diseñados para ser seguros de ejecutar múltiples veces