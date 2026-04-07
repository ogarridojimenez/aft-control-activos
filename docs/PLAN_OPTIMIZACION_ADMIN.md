# Plan de Optimización — App Admin AFT

> Estado: **Pendiente de implementación**

---

## Estado Actual

| Aspecto | Estado |
|---------|--------|
| Páginas | Dashboard, Assets, Inventarios, Detalle, Upload, QR |
| API Routes | 7 rutas funcionando |
| UI | Básica, sin loading states |
| Data Fetching | Client-side con useEffect |
| Paginación | No implementada |
| Caché | Ninguna |

---

## Resumen del Plan

| Fase | Enfoque | Duración | Prioridad |
|------|---------|----------|-----------|
| 1 | UX/UI (Quick Wins) | 1 semana | Alta |
| 2 | Rendimiento | 1 semana | Alta |
| 3 | Funcionalidades | 1 semana | Media |
| 4 | Arquitectura | 1 semana | Media |

**Total estimado:** 4 semanas

---

## Fase 1: UX/UI (Quick Wins)

### Objetivos
- Mejorar la experiencia de usuario
- Agregar feedback visual durante cargas
- Implementar navegación paginada

### Tareas

| # | Mejora | Problema Actual | Solución |
|---|--------|----------------|----------|
| 1.1 | **Loading states** | Sin feedback durante cargas | Skeleton loaders en todas las páginas |
| 1.2 | **Paginación** | Lista ilimitada de assets | Server-side pagination (50 por página) |
| 1.3 | **Ordenamiento de tablas** | Sin sorting | Agregar click headers para sort |
| 1.4 | **Filtros de búsqueda** | Sin filtros | Búsqueda por asset_id, área, estado |
| 1.5 | **Mensajes de error** | Alert básico | Toasts con retry y dismiss |
| 1.6 | **Estados vacíos** | Sin feedback cuando no hay datos | UI dedicada para empty states |

### Archivos a modificar
- `apps/admin/src/app/(app)/assets/page.tsx`
- `apps/admin/src/app/(app)/inventories/page.tsx`
- `apps/admin/src/app/(app)/inventories/[id]/page.tsx`
- `apps/admin/src/app/(app)/page.tsx`
- `apps/admin/src/components/ui/Skeleton.tsx` (nuevo)
- `apps/admin/src/components/ui/Toast.tsx` (nuevo)

---

## Fase 2: Rendimiento

### Objetivos
- Optimizar tiempo de carga
- Reducir llamadas a la base de datos
- Implementar caching

### Tareas

| # | Mejora | Problema Actual | Solución |
|---|--------|----------------|----------|
| 2.1 | **Server Components** | Pages usan client-side fetch | Convertir a RSC con fetch directo |
| 2.2 | **Suspense boundaries** | Sin streaming | Agregar Suspense con fallback |
| 2.3 | **Cache API calls** | Llamadas repetitivas | Implementar Next.js `unstable_cache` |
| 2.4 | **Optimistic updates** | Sin feedback inmediato | useOptimistic en mutations |
| 2.5 | **Batch queries** | Queries secuenciales | Promise.all para datos relacionados |
| 2.6 | **React Server Actions** | API routes tradicionales | Reemplazar con Actions para mutations |

### Archivos a modificar
- Todas las páginas en `apps/admin/src/app/(app)/`
- API routes en `apps/admin/src/app/api/`
- `apps/admin/src/lib/actions/` (nuevo)

---

## Fase 3: Funcionalidades

### Objetivos
- Dashboard enriquecido
- Gestión completa de activos
- Historial y trazabilidad

### Tareas

| # | Mejora | Descripción |
|---|--------|-------------|
| 3.1 | **Dashboard mejorado** | Gráficos de inventario (chart.js o recharts), actividad reciente, métricas de precisión |
| 3.2 | **Gestión de activos CRUD** | Editar, eliminar, activar/desactivar activos desde UI |
| 3.3 | **Export avanzado** | Filtros en reportes PDF/Excel, selección de campos |
| 3.4 | **Historial de inventarios** | Timeline de cambios por inventario, quién做了什么 |
| 3.5 | **Notificaciones** | Alerts cuando mobile hace sync, errores |
| 3.6 | **Gestión de áreas** | Crear/editar/eliminar áreas |

### Nuevos archivos
- `apps/admin/src/app/(app)/dashboard/page.tsx`
- `apps/admin/src/app/(app)/areas/page.tsx`
- `apps/admin/src/components/charts/InventoryChart.tsx`
- `apps/admin/src/lib/actions/assets.ts`

---

## Fase 4: Arquitectura

### Objetivos
- Código mantenible y escalable
- Reutilización de componentes
- Testing

### Tareas

| # | Mejora | Descripción |
|---|--------|-------------|
| 4.1 | **UI Components** | Crear biblioteca interna (Button, Input, Card, Table, Modal) |
| 4.2 | **Tipos centralizados** | Mover tipos a `packages/shared/types` |
| 4.3 | **API Layer** | Wrapper para llamadas API con error handling |
| 4.4 | **Server Actions** | Completar migración de API routes a Actions |
| 4.5 | **Testing** | Vitest para unit, Playwright para E2E |
| 4.6 | **Error Boundaries** | Catch errores en componentes React |

### Nuevos archivos
- `apps/admin/src/components/ui/` (biblioteca de componentes)
- `packages/shared/src/types/admin.ts`
- `apps/admin/src/lib/api/client.ts`
- `apps/admin/src/__tests__/` (directorio de tests)

---

## Priorización Detallada

### Semana 1 — Quick Wins (Fase 1)
1. ✅ Skeleton loaders
2. ✅ Paginación básica
3. ✅ Filtros de búsqueda
4. ✅ Empty states

### Semana 2 — Rendimiento (Fase 2)
1. ✅ Server Components
2. ✅ Suspense
3. ✅ Cache
4. ✅ Batch queries

### Semana 3 — Funcionalidades (Fase 3)
1. ✅ Dashboard charts
2. ✅ CRUD activos
3. ✅ Export avanzado
4. ✅ Historial

### Semana 4 — Arquitectura (Fase 4)
1. ✅ UI components
2. ✅ Tipos compartidos
3. ✅ API layer
4. ✅ Testing

---

## Métricas de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tiempo de carga página | ~2s | <500ms |
| Loading states | No | Sí |
| Paginación | No | Sí (50/page) |
| Dashboard | Básico (números) | Gráficos + métricas |
| Testing coverage | 0% | 60%+ |

---

## Dependencias a Instalar (futuro)

```json
{
  "dependencies": {
    "recharts": "^2.x",
    "sonner": "^1.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "vitest": "^1.x",
    "@playwright/test": "^1.x"
  }
}
```

---

## Notas

- Las fases son acumulativas
- Se puede paralelizar trabajo entre tareas dentro de cada fase
--testing se puede agregar gradualmente desde la Fase 1
- Server Actions requieren Next.js 14+ (ya compatible)

---

*Documento generado: Abril 2026*
*Proyecto: AFT - Sistema de Control de Activos Fijos Tangibles*