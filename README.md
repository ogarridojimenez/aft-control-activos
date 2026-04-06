# AFT — Sistema de Control de Activos Fijos Tangibles

Monorepo para la gestión de inventario de activos fijos tangibles. Portal web administrativo + app móvil con escaneo QR y sincronización offline.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     MONOREPO (npm workspaces)                │
├──────────────────────────┬──────────────────────────────────┤
│  apps/admin              │  apps/mobile                     │
│  Next.js 14 (App Router) │  Expo SDK 51 / React Native 0.74 │
│  TypeScript, Tailwind    │  TypeScript, React Navigation    │
│  Supabase (service_role) │  expo-camera, expo-sqlite        │
├──────────────────────────┴──────────────────────────────────┤
│                     Supabase (PostgreSQL)                    │
│  auth.users | areas | assets | user_profiles | inventories   │
│  inventory_items | reconciliations | offline_sync            │
├─────────────────────────────────────────────────────────────┤
│  packages/shared — tipos, validación Zod, regex asset_id     │
│  packages/supabase — migraciones SQL, seed data              │
└─────────────────────────────────────────────────────────────┘
```

## Funcionalidades

### Portal Admin (`apps/admin`)
- **Dashboard** — Estadísticas de áreas, activos e inventarios
- **Carga masiva Excel** — Sube activos por área con validación por lotes
- **Gestión de activos** — Lista con filtros por área y estado
- **Inventarios** — Crear sesiones de conteo por área
- **Detalle de inventario** — Stats, items filtrables (encontrados/faltantes), sobrantes
- **Generación de QR** — PDF con códigos QR por área (15 por hoja, listos para imprimir)
- **Reportes** — Descarga PDF o Excel de conciliación (resumen + detalle + sobrantes)

### App Móvil (`apps/mobile`)
- **Selector de inventarios** — Lista de inventarios desde Supabase (sin login requerido)
- **Descarga offline** — Descarga activos del inventario a SQLite local
- **Escaneo QR** — Cámara en tiempo real con `expo-camera`
- **Entrada manual** — Ingreso de código como alternativa
- **Validación local** — Verifica si el activo está en la descarga (`src/utils/assetValidation.ts`)
- **Sincronización** — Envía escaneos al portal admin para conciliación

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Admin | Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase JS |
| Mobile | Expo 51, React Native 0.74, expo-camera, expo-sqlite, expo-haptics |
| Database | Supabase (PostgreSQL) con RLS |
| Auth | Supabase Auth (email/password) |
| Shared | Zod, TypeScript interfaces, regex validation |
| Build | npm workspaces + Turborepo |

## Inicio Rápido

### Prerrequisitos
- Node.js 18+
- npm 9+
- Proyecto Supabase creado

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

**Admin** (`apps/admin/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**Mobile** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
EXPO_PUBLIC_ADMIN_API_URL=http://<TU_IP>:3000
```

### 3. Aplicar migraciones

Ejecuta en el SQL Editor de Supabase:
1. `packages/supabase/migrations/001_init.sql`
2. `packages/supabase/migrations/002_rls_policies.sql`

### 4. Insertar datos de prueba

```sql
-- Ejecutar en Supabase SQL Editor
-- packages/supabase/seed/001_seed_data.sql
```

### 5. Iniciar desarrollo

```bash
# Todo junto
npm run dev

# Solo admin
cd apps/admin && npm run dev

# Solo mobile
cd apps/mobile && npx expo start
```

## Flujo de Trabajo

```
1. Admin carga Excel → Activos en Supabase
2. Admin genera QR PDF → Imprime y pega en activos físicos
3. Admin crea inventario → Sesión de conteo por área
4. Móvil descarga activos → SQLite local (offline)
5. Móvil escanea QR → Cola local (pending_scans)
6. Móvil sincroniza → POST al admin → Conciliación automática
7. Admin ve resultados → Faltantes/sobrantes + reportes PDF/Excel
```

## Estructura de la Base de Datos

| Tabla | Propósito |
|-------|-----------|
| `areas` | Áreas de inventario (ADMIN, ALMACEN, etc.) |
| `assets` | Activos fijos (asset_id: MB + 5+ dígitos) |
| `user_profiles` | Roles: admin, supervisor, operator, auditor |
| `inventories` | Sesiones de conteo (planned → completed) |
| `inventory_items` | Detalle de conteo por activo |
| `reconciliations` | Resultados: faltantes, sobrantes, exactitud |
| `offline_sync` | Tracking de cambios offline |

## Credenciales de Prueba

- **Email:** `admin@ejemplo.com`
- **Password:** `Admin123!`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia admin + mobile en paralelo |
| `npm run build` | Build del admin |
| `npm run test` | Ejecuta tests |
| `npm run lint` | Linting |
| `node scripts/test-all.js` | Suite completa de tests (39 tests) |

## Documentación

- [Guía de Configuración Fase A](docs/FASE_A_CONFIGURACION.md)
- [Guía de Implementación](docs/GUIA_IMPLEMENTACION.md)

## Licencia

Privado — Uso interno.
