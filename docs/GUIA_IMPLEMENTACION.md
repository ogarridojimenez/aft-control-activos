# Guía de implementación — Sistema AFT (Activos Fijos Tangibles)

Este documento describe **qué está construido hoy** en el repositorio, **qué falta** respecto a la visión documentada en `data_flow_diagram.md`, `validation_sync_logic.md` y `risk_analysis.md`, y **cómo desplegar y continuar** por fases.

---

## 1. Objetivo del producto

Sistema para:

- **Portal web (admin)**: carga masiva de activos desde Excel, gestión de inventarios por área, visualización de datos y APIs de conciliación.
- **App móvil**: trabajo **offline-first** con SQLite, registro de escaneos de activos (IDs `MB…`) y sincronización de resultados contra el backend.
- **Backend**: **Supabase (PostgreSQL)** como fuente de verdad, con políticas RLS definidas en migraciones.

---

## 2. Arquitectura del repositorio (estado actual)

| Ubicación | Rol |
|-----------|-----|
| `apps/admin/` | Next.js 14 (App Router), portal administrativo, APIs bajo `/api/*`. |
| `apps/mobile/` | Expo (React Native), cliente de campo con SQLite. |
| `packages/shared/` | Tipos TypeScript, validación de IDs, esquema Zod para filas Excel. |
| `packages/supabase/migrations/` | SQL inicial (`001_init.sql`) y RLS (`002_rls_policies.sql`). |
| `database_schema.sql` | Esquema de referencia (alinear con migraciones si diverge). |
| `scripts/migrate.js` / `seed.js` | Recordatorios; la aplicación real de SQL se hace en Supabase. |

**Orquestación**: `turbo` en la raíz (`npm run dev` levanta **admin** y **mobile** en paralelo; `npm run build` compila solo **admin**).

---

## 3. Lo que ya está implementado (detalle)

### 3.1 Base de datos (Supabase / PostgreSQL)

**Implementado en migraciones:**

- Tablas: `areas`, `assets`, `user_profiles`, `inventories`, `inventory_items`, `reconciliations`, `offline_sync`.
- Restricciones relevantes: formato `asset_id` con regex `^MB[0-9]{5,}$`; `reconciliations.inventory_id` **único** (permite upsert por inventario).
- `offline_sync` incluye `updated_at` para alinear con triggers de `002_rls_policies.sql`.
- **RLS** habilitado y políticas por rol/área (ver `002_rls_policies.sql`).

**Qué no automatiza el repo:** creación de usuario en Auth, fila en `user_profiles`, ni datos iniciales de áreas (debes hacerlo en Supabase o vía SQL manual).

---

### 3.2 Paquete `@aft/shared`

- Tipos: `Asset`, `Area`, `Inventory`, `InventoryItem`, `Reconciliation`, etc. (`packages/shared/src/types/index.ts`).
- Constante y validación de ID: `ASSET_ID_REGEX`, `validateAssetId`, `sanitizeAssetId`.
- Esquema `excelRowSchema` para columnas esperadas en importación Excel (`packages/shared/src/schemas/excel.ts`).

---

### 3.3 Portal admin (`apps/admin`)

**Autenticación**

- Pantalla **`/login`**: email/contraseña con Supabase Auth (cliente browser vía `@supabase/ssr`).
- **Middleware**: rutas del panel exigen sesión; sin sesión → redirección a `/login`. Las rutas **`/api/*` no** se protegen en middleware (la API valida sesión o JWT por cabecera).
- Layout **`(app)`**: sidebar, cabecera con email y cierre de sesión.
- APIs usan `requireAuth` o `requireAdmin` (`src/lib/auth/guard.ts`):
  - **Carga Excel** (`POST /api/upload`): requiere usuario con `user_profiles.role === 'admin'` (comprobación vía service role).
  - Resto de endpoints protegidos según corresponda (ver código).

**Páginas**

- `/` — Resumen con conteos (usa cliente admin de servidor).
- `/upload` — Subida de `.xlsx`, validación y upsert en lotes.
- `/inventories`, `/inventories/new` — Listado y alta de inventarios.
- `/assets` — Listado parcial (primeros 200).

**APIs**

- `GET /api/areas` — Áreas activas.
- `GET|POST /api/inventories` — Listado y creación.
- `POST /api/upload` — Procesamiento Excel (sincrónico en la ruta; ver sección “pendiente”).
- `POST /api/sync/inventory` — Ejecuta conciliación: lee activos esperados del área del inventario, compara con escaneos enviados, escribe `reconciliations`, `inventory_items` y marca inventario como `completed`.

**Lógica interna**

- `lib/excel/parseUpload.ts` — Lectura con `xlsx`, normalización de cabeceras, validación Zod.
- `lib/reconciliation/runReconciliation.ts` — Faltantes, sobrantes, resumen y upsert de ítems de inventario.
- `lib/supabase/admin.ts` — Cliente con **service role** (solo servidor; no exponer al cliente).

---

### 3.4 App móvil (`apps/mobile`)

**Implementado**

- Navegación básica (Home ↔ pantalla de registro manual).
- **SQLite** (`expo-sqlite`): tablas `local_assets`, `pending_scans`, `app_meta`.
- Login Supabase (email/contraseña), descarga de activos del área según inventario seleccionado (UUID).
- Registro de códigos en pantalla **Scan** (entrada manual; no hay cámara/QR aún).
- Cola local de escaneos y **sincronización** contra `EXPO_PUBLIC_ADMIN_API_URL/api/sync/inventory` con **`Authorization: Bearer <access_token>`**.

**No implementado aún**

- Escaneo con cámara / lector QR.
- Indicadores offline avanzados, resolución de conflictos multi-dispositivo, vectores de reloj (ver fases posteriores).

---

## 4. Lo que falta — por fases (alineado con la documentación)

Las fases siguientes priorizan **entregables útiles** y respetan dependencias (datos → operación → robustez → informes).

---

### Fase A — Entorno y datos mínimos (operativo “manual”)

| Ítem | Estado | Notas |
|------|--------|--------|
| Proyecto Supabase creado | Pendiente (tú) | Crear proyecto y copiar URL + keys. |
| Aplicar `001_init.sql` y `002_rls_policies.sql` | Pendiente | Editor SQL o CLI en Supabase. |
| Variables `.env` en admin | Pendiente | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. |
| Variables en mobile | Pendiente | `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_ADMIN_API_URL` (IP/host accesible desde el dispositivo). |
| Usuario Auth + `user_profiles` | Pendiente | Al menos un **admin** para `/api/upload`; operadores según RLS. |
| Áreas de prueba en `areas` | Pendiente | Códigos coherentes con el Excel (`area_code`). |

**Entregable:** poder iniciar sesión en el portal, cargar un Excel de prueba y crear un inventario; en el móvil, descargar y sincronizar con un usuario que tenga permisos RLS.

---

### Fase B — Paridad con el flujo de datos documentado

Referencia: `data_flow_diagram.md`.

| Capacidad documentada | Estado en código |
|------------------------|-------------------|
| Fase 1: Excel → `assets` | Implementado (sincrónico en API). |
| Fase 2: Crear inventario | Implementado. |
| Fase 3: Descarga a SQLite | Implementado. |
| Fase 4: Escaneo offline | Parcial: solo entrada manual de código, no QR. |
| Fase 5: Sync → conciliación | Implementado (API + lógica servidor). |
| Fase 6: Reportes PDF/Excel | **No implementado** (no hay rutas ni generación). |
| Realtime / notificaciones | **No implementado** (opcional en diagrama). |
| Webhooks externos | **No implementado**. |

**Pendiente explícito de esta fase**

- Generación de **informes** (PDF/Excel) desde el portal y endpoints tipo `GET /api/inventories/[id]/report`.
- (Opcional) Notificaciones cuando haya nuevos activos o inventario completado.

**Detalle ampliado (checklist técnica, reportes y rutas):** ver **Anexo A — Fase B ampliada** al final de este documento.

---

### Fase C — Validación y sincronización avanzada

Referencia: `validation_sync_logic.md`.

| Tema | Estado |
|------|--------|
| Regex `MB[0-9]{5,}` en cliente/servidor | Implementado (shared + servidor en conciliación). |
| Estrategia “último gana” / merge de conflictos | **Parcial**: la conciliación actual es determinista por servidor; no hay merge fino de incrementos concurrentes offline. |
| Hooks de workflow para corrección de filas Excel erróneas | **No implementado** (el código de ejemplo en la doc no está en el repo). |
| Workflows con `createHook` / espera de corrección | **No implementado**. |

**Pendiente**

- Definir e implementar política explícita de conflictos en `inventory_items` si varios dispositivos escanean el mismo activo antes de sincronizar (hoy el servidor recalcula desde la lista de escaneos enviada en un solo payload).

---

### Fase D — Riesgos y mitigaciones de arquitectura

Referencia: `risk_analysis.md`.

| Riesgo | Mitigación documentada | Estado en código |
|--------|------------------------|------------------|
| Colisiones offline | Versionado, merge por intención, tablas por dispositivo | **No implementado** (no hay `version` en `inventory_items` ni triggers de merge). |
| Excel masivo / timeouts | Cola durable, streaming, lotes con backpressure, Vercel Workflow | **No implementado**: el upload es **síncrono** en la ruta API (riesgo de timeout en archivos muy grandes). |
| Divergencia SQLite vs Supabase | Vectores de reloj, checksum, RPC `get_database_clock_vector` | **No implementado**. |

**Pendiente prioritario si los inventarios son grandes**

- Externalizar procesamiento de Excel a **job en background** (cola, Workflow de Vercel, o función larga con límites claros) y endpoint de **progreso**.

---

### Fase E — Producto y operaciones

| Ítem | Estado |
|------|--------|
| CI/CD (GitHub Actions, etc.) | Carpeta `.github/workflows` referenciada en `folder_structure.txt`; **no verificado** en este repo. |
| Pruebas automatizadas (E2E, unit) | Carpetas `tests/` en estructura ideal; **pocas o ninguna** implementación efectiva en el árbol actual. |
| Seed SQL reproducible | `db:seed` es placeholder; **sin** `packages/supabase/seed/` poblado en el listado actual. |
| Documentación de API OpenAPI | **No** incluida. |

---

### Fase F — Seguridad y endurecimiento

| Ítem | Estado |
|------|--------|
| Portal con login | Implementado. |
| API protegida por sesión / JWT | Implementado para rutas usadas por portal y móvil (Bearer en sync). |
| Rotación de secretos, límites de tasa, auditoría de `updated_by` en todos los upserts | **Revisar** caso a caso (Excel usa `updated_by` nulo en payload actual). |
| CORS si se usa el portal desde otro origen | Revisar si Expo Web llama al admin desde otro dominio. |

---

## 5. Cómo ejecutar en desarrollo

1. Instalar dependencias en la raíz del monorepo: `npm install`.
2. Configurar `apps/admin/.env.local` (ver `.env.local.example` si existe).
3. Configurar `apps/mobile` con `.env` según `.env.example` / `.env.example` de mobile.
4. `npm run dev` — arranca admin y mobile (Turbo).

**Admin solo:** `cd apps/admin && npm run dev` (puerto 3000 por defecto).

**Mobile solo:** `cd apps/mobile && npx expo start`.

**Build producción admin:** `npm run build` desde la raíz (compila `admin`).

---

## 6. Checklist rápido “¿puedo hacer un inventario de punta a punta?”

- [ ] Migraciones aplicadas en Supabase.
- [ ] Áreas insertadas y códigos conocidos.
- [ ] Usuario portal con `user_profiles.role = 'admin'` si vas a subir Excel.
- [ ] Usuario móvil con permisos RLS sobre `assets` / `inventories` del área.
- [ ] `EXPO_PUBLIC_ADMIN_API_URL` apunta al mismo host/puerto que el admin (desde la red del teléfono/emulador).
- [ ] Excel con columnas acordes a `excelRowSchema` (p. ej. `asset_id`, `name`, …) y `area_code` coherente con el formulario de subida.

---

## 7. Documentos relacionados en el repo

| Archivo | Contenido |
|---------|-----------|
| `data_flow_diagram.md` | Flujo ideal de datos fase a fase. |
| `validation_sync_logic.md` | Validación de IDs y diseño de sync/workflows. |
| `risk_analysis.md` | Riesgos técnicos y mitigaciones propuestas. |
| `folder_structure.txt` | Estructura objetivo del monorepo (parcialmente alcanzada). |
| `database_schema.sql` | Esquema SQL de referencia. |

---

## 8. Resumen ejecutivo

**Implementado hoy:** monorepo funcional con **portal Next.js** (login, Excel, inventarios, listado de activos, APIs de conciliación), **app Expo** (SQLite, login, descarga, registro manual, sync con Bearer), **paquete compartido** de validación/tipos, y **migraciones SQL** base con RLS.

**Brecha principal respecto a la visión completa:** informes PDF/Excel, escaneo por cámara/QR, procesamiento masivo asíncrono de Excel, mecanismos avanzados de consistencia offline (versionado/checksums), CI/tests/seed formales, y parte de los workflows opcionales descritos en la documentación técnica.

---

## Anexo A — Fase B ampliada (paridad con `data_flow_diagram.md`)

Este anexo desglosa la **Fase B** en entregables concretos: qué construir, en qué orden y qué validar. Referencia principal: **Fase 6** del diagrama de flujo (reportes) y puntos opcionales de integración.

### A.1 Mapa fase por fase (documento vs código)

| # | Bloque en `data_flow_diagram.md` | Estado | Acción siguiente |
|---|----------------------------------|--------|------------------|
| 1 | Carga Excel → `assets` | Hecho | Opcional: progreso UI si subes archivos muy grandes (véase Fase D). |
| 2 | Crear inventario | Hecho | Opcional: enlace “ver detalle” por fila cuando exista pantalla de detalle. |
| 3 | Descarga a SQLite (móvil) | Hecho | Pendiente: escaneo QR (misma guía, Fase B §A.4). |
| 4 | Escaneo offline | Parcial | Completar lector QR/cámara (§A.4). |
| 5 | Sync → conciliación | Hecho | Opcional: idempotencia explícita si se reenvía el mismo lote. |
| 6 | Reportes PDF/Excel | No hecho | Seguir checklist §A.2 y §A.3. |
| — | Realtime / Storage / Webhooks | No hecho | Seguir §A.5 (opcional). |

### A.2 Checklist — API y datos para reportes

Objetivo: exponer la conciliación ya guardada en `reconciliations` y permitir descarga en PDF o Excel.

**Paso 1 — Lectura de conciliación**

- [ ] Crear ruta **`GET /api/inventories/[id]/reconciliation`** (o incluir el payload en un único `GET /api/inventories/[id]` con sección `reconciliation`).
- [ ] Resolver el `inventory_id` y comprobar que el inventario esté en estado **`completed`** (o permitir borrador según regla de negocio).
- [ ] Devolver JSON alineado con columnas `missing_assets`, `surplus_assets`, `summary` de la tabla `reconciliations` (y metadatos: fecha inventario, nombre de área).
- [ ] Proteger con **`requireAuth`** (y RLS ya aplica vía usuario; si usas solo service role en servidor, mantener comprobación de permisos explícita).

**Paso 2 — Generación de archivos**

- [ ] Crear **`GET /api/inventories/[id]/report?format=pdf|excel`** (o dos rutas explícitas si prefieres tipado estricto).
- [ ] **PDF**: elegir stack (por ejemplo `pdfkit` en Node, o `@react-pdf/renderer` si generas desde componentes). Incluir como mínimo: título, área, fecha, tabla de faltantes, tabla de sobrantes, bloque de resumen (`summary`).
- [ ] **Excel**: usar **`exceljs`** o reutilizar **`xlsx`** coherente con el upload; hojas sugeridas en la doc: **Resumen**, **Faltantes**, **Sobrantes**, **Detalle** (si “detalle” = lista completa de esperados vs encontrados, puede salir de `inventory_items` + `assets`).
- [ ] Respuesta HTTP: `Content-Type` y `Content-Disposition: attachment; filename="..."` para forzar descarga.
- [ ] Límite de tamaño / tiempo: si el informe puede ser enorme, documentar límite o mover generación a cola (punto 4 del diagrama: “Cola de Tareas”).

**Paso 3 — UI en el portal**

- [ ] Pantalla **`/inventories/[id]`** (detalle) o botones en listado solo para filas `status === 'completed'`.
- [ ] Botones “Descargar PDF” y “Descargar Excel” que llamen a la API con `credentials: 'include'` (sesión portal).
- [ ] Mensajes de error si aún no existe conciliación (inventario no completado o sync pendiente).

### A.3 Checklist de contenido mínimo del informe (negocio)

| Contenido | PDF | Excel | Fuente típica |
|-----------|-----|-------|----------------|
| Identificador y fecha del inventario | Sí | Hoja Resumen | `inventories` |
| Nombre/código de área | Sí | Resumen | `areas` vía join |
| Conteos: esperados, encontrados, faltantes, sobrantes, % precisión | Sí | Resumen | `reconciliations.summary` |
| Listado faltantes (asset_id, nombre, categoría…) | Sí | Hoja Faltantes | `missing_assets` JSON |
| Listado sobrantes (asset_id, fecha escaneo, notas) | Sí | Hoja Sobrantes | `surplus_assets` JSON |
| Detalle por línea (opcional) | Opcional | Hoja Detalle | `inventory_items` + `assets` |

### A.4 Escaneo QR / cámara (cierre de “Fase 4” en móvil)

Orden sugerido de implementación:

1. [ ] Añadir dependencia (`expo-camera`, `expo-barcode-scanner`, o `vision-camera` según política del proyecto y versión de Expo).
2. [ ] Pantalla de escaneo: permisos, vista previa, callback al leer string → `sanitizeAssetId` + `validateAssetId` (`@aft/shared`).
3. [ ] Reutilizar la misma cola `pending_scans` que ya usa la entrada manual.
4. [ ] Prueba en dispositivo físico (QR reales, iluminación, timeouts).

### A.5 Integraciones opcionales (diagrama: “Puntos de integración”)

Implementar solo si hay requisito explícito:

| Integración | Propósito | Complejidad |
|-------------|-----------|-------------|
| **Supabase Realtime** | Avisar al móvil cuando cambien `assets` del área | Media |
| **Supabase Storage** | Guardar PDFs generados o fotos de activos | Media |
| **Edge Function** | Validar formato `MB…` antes de tocar la DB | Baja |
| **Cola / Workflow** | Reportes o Excel masivos sin bloquear la request | Alta |
| **Webhooks** | ERP / contabilidad al cerrar inventario | Media–Alta |

### A.6 Criterios de “Fase B cerrada” (definición de hecho)

Se puede considerar la **Fase B** cerrada para el alcance mínimo cuando:

1. Un inventario puede completarse (sync) y sus datos de conciliación son **consultables** por API desde el portal.
2. Existe al menos **un formato descargable** (PDF **o** Excel) con resumen y listas de faltantes/sobrantes.
3. La lista de inventarios del portal indica claramente cuáles tienen informe disponible (estado `completed` + fila en `reconciliations`).

Los ítems opcionales (Realtime, webhooks, gráfico de precisión en PDF, segunda hoja Excel avanzada) pueden abrirse como **Fase B+** sin bloquear el cierre mínimo.

---

*Última actualización de esta guía: alineada con el estado del código en el repositorio AFT (revisar tras cada entrega importante).*
