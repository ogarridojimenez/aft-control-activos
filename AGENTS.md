# AFT — Agent Instructions

## Architecture

npm workspaces monorepo. All data lives in **Supabase (PostgreSQL)** — no local database.

```
apps/admin     — Next.js 14 App Router, Supabase service_role client
apps/mobile    — Expo 51 / React Native 0.74, expo-sqlite for offline
packages/shared — @aft/shared: types, Zod schemas, asset_id regex
packages/supabase — SQL migrations + seed data
```

## Essential Commands

```bash
npm install              # from root — installs all workspaces

npm run dev              # starts admin + mobile in parallel (turbo)
cd apps/admin && npm run dev    # admin only (http://localhost:3000)
cd apps/mobile && npx expo start  # mobile only

node scripts/test-all.js  # Configuration tests
node scripts/test-e2e.js   # E2E tests (23 tests)
```

## Environment Files (never commit)

| File | Purpose |
|------|---------|
| `apps/admin/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `apps/mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ADMIN_API_URL` |

Mobile `EXPO_PUBLIC_ADMIN_API_URL` = `http://10.0.2.2:3000` for Android emulator, or your LAN IP for physical device.

## Auth Flow

- **Admin**: Supabase Auth via `@supabase/ssr` cookies. `middleware.ts` redirects unauthenticated → `/login`. API routes use `requireAuth()` / `requireAdmin()` from `lib/auth/guard.ts`.
- **Mobile**: Uses anon key for reading inventories/assets (RLS allows anon SELECT). Sync to admin API sends optional Bearer token. Session persisted with expo-secure-store. No login required for mobile scan flow.
- Test credentials: `admin@ejemplo.com` / `Admin123!`

## Database

Apply migrations in Supabase SQL Editor in order:
1. `packages/supabase/migrations/001_init.sql` — 7 tables + indexes
2. `packages/supabase/migrations/002_rls_policies.sql` — RLS + triggers

Seed: `packages/supabase/seed/001_seed_data.sql` (replace `TU_USER_UUID_AQUI` with real auth user UUID).

Key tables: `areas`, `assets` (asset_id format `MB` + 5+ digits), `user_profiles`, `inventories`, `inventory_items`, `reconciliations`, `offline_sync`.

## Admin: How Data Flows

- **Pages** use `createSupabaseAdmin()` (service_role key, bypasses RLS) — server components.
- **API routes** use `requireAuth()` (cookies or Bearer) + `createSupabaseAdmin()` for queries.
- **Excel upload** (`POST /api/upload`): parses with `xlsx`, validates with Zod, upserts in batches of 50 via `onConflict: 'asset_id'`. Requires `requireAdmin`.
- **Sync** (`POST /api/sync/inventory`): calls `runReconciliation()` — compares device scans vs expected assets in the inventory's area, upserts `reconciliations` + `inventory_items`, sets inventory status to `completed`.
- **Reports** (`GET /api/inventories/[id]/report?format=pdf|excel`): generates PDF via `pdf-lib` or Excel via `xlsx`.

## Mobile: Offline-First Flow

1. **Download**: fetches inventories list from Supabase via `fetchInventories()`, user selects one → fetches assets for that inventory's area → stores in SQLite `local_assets`.
2. **Scan**: camera (`expo-camera`) or manual entry → validates with `src/utils/assetValidation.ts` (local copy of @aft/shared regex) → stores in SQLite `pending_scans`.
3. **Sync**: POSTs pending scans to `/api/sync/inventory` with optional Bearer token → clears `pending_scans` on success. Supports incremental sync with 50-item batches and exponential backoff retry.

SQLite tables: `local_assets`, `pending_scans`, `app_meta`, `cached_inventories`. On web platform, falls back to in-memory `Map`.

Key mobile files:
- `src/screens/HomeScreen.tsx` — inventory selector, download/sync actions, progress modal
- `src/screens/ScanScreen.tsx` — manual entry + button to open QR camera
- `src/screens/QrScannerScreen.tsx` — full-screen camera with `CameraView`, cooldown, haptics
- `src/screens/LocalAssetsScreen.tsx` — view downloaded assets with search
- `src/services/supabaseService.ts` — `fetchInventories()` with SQLite cache fallback
- `src/services/sqliteService.ts` — local SQLite CRUD with web fallback, batch inserts
- `src/services/syncService.ts` — incremental sync with retry and checkpoint
- `src/utils/assetValidation.ts` — ASSET_ID_REGEX, sanitizeAssetId, validateAssetId
- `src/utils/retry.ts` — retryWithBackoff utility
- `src/hooks/useNetworkStatus.ts` — online/offline detection
- `src/components/ErrorBoundary.tsx` — error boundary wrapper

## Key Features Implemented

| Feature | Status |
|---------|--------|
| Offline-first with SQLite | ✅ |
| QR scanning with expo-camera | ✅ |
| Incremental sync with retry | ✅ |
| Inventory caching | ✅ |
| Session persistence (SecureStore) | ✅ |
| Error boundaries | ✅ |
| Lazy loading | ✅ |
| Network status indicator | ✅ |
| PDF/Excel reports | ✅ |
| Batch inserts | ✅ |

## Conventions

- Asset ID regex: `^MB[0-9]{5,}$` — enforced in DB CHECK constraint and `@aft/shared`.
- Each Excel upload belongs to one area (selected via dropdown, not free text).
- Inventory status: `planned` → `completed` (skips `in_progress`).
- Reconciliation status starts as `pending` even when inventory is `completed`.
- No ORM — raw Supabase JS client everywhere in admin.

## Gotchas

- `next.config.js` must exist (even if empty `{}`) — Next.js 14 in workspaces needs it.
- Metro config in mobile blocks workspace-level `react-native` resolution to avoid version conflicts.
- Mobile React versions are pinned to 18.2.0 (not 18.3) for Expo SDK 51 compatibility.
- `requireAdmin` checks `user_profiles.role === 'admin'` via Supabase admin client.
- Excel processing is synchronous — large files may timeout on serverless.
- Use environment variables for Supabase URLs — never hardcode.
