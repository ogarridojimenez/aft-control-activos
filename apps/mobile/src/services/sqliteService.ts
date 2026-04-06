import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLiteDatabase | null = null;
let migrationDone = false;

// Web fallback storage
const webTables = {
  local_assets: new Map<string, any>(),
  pending_scans: new Map<string, any>(),
  app_meta: new Map<string, string>(),
};

export interface LocalAsset {
  id: string;
  asset_id: string;
  name: string | null;
  area_id: string;
  inventory_id: string;
  synced_at: string;
}

export function getDb(): SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite no disponible en web');
  }
  if (!db) {
    db = openDatabaseSync('aft.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_assets (
        id TEXT PRIMARY KEY NOT NULL,
        asset_id TEXT NOT NULL,
        name TEXT,
        area_id TEXT NOT NULL,
        inventory_id TEXT NOT NULL DEFAULT '',
        synced_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pending_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        scanned_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_local_assets_inventory ON local_assets(inventory_id);
    `);
  }
  // Migration: ensure inventory_id column exists
  if (!migrationDone) {
    try {
      const row = db.getFirstSync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM pragma_table_info('local_assets') WHERE name='inventory_id'`
      );
      if (!row || row.cnt === 0) {
        // Column doesn't exist - recreate table with new schema
        db.execSync(`
          CREATE TABLE IF NOT EXISTS local_assets_new (
            id TEXT PRIMARY KEY NOT NULL,
            asset_id TEXT NOT NULL,
            name TEXT,
            area_id TEXT NOT NULL,
            inventory_id TEXT NOT NULL DEFAULT '',
            synced_at TEXT NOT NULL
          );
          INSERT INTO local_assets_new (id, asset_id, name, area_id, synced_at)
            SELECT id, asset_id, name, area_id, synced_at FROM local_assets;
          DROP TABLE local_assets;
          ALTER TABLE local_assets_new RENAME TO local_assets;
          CREATE INDEX IF NOT EXISTS idx_local_assets_inventory ON local_assets(inventory_id);
        `);
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
    migrationDone = true;
  }
  return db;
}

// Reemplaza clearLocalAssets — borra solo los activos de un inventario
export function clearInventoryAssets(inventoryId: string) {
  if (Platform.OS === 'web') {
    for (const [key, asset] of webTables.local_assets.entries()) {
      if (asset.inventory_id === inventoryId) {
        webTables.local_assets.delete(key);
      }
    }
    return;
  }
  getDb().runSync(`DELETE FROM local_assets WHERE inventory_id = ?`, inventoryId);
}

// Inserta activos asociados a un inventario específico (transacción atómica)
export function insertLocalAssets(
  inventoryId: string,
  rows: { id: string; asset_id: string; name: string | null; area_id: string }[]
) {
  if (Platform.OS === 'web') {
    const now = new Date().toISOString();
    for (const r of rows) {
      webTables.local_assets.set(r.id, {
        ...r,
        inventory_id: inventoryId,
        synced_at: now,
      });
    }
    return;
  }

  const database = getDb();
  const now = new Date().toISOString();
  try {
    database.execSync('BEGIN TRANSACTION');
    // Borra activos previos de este inventario
    database.runSync(`DELETE FROM local_assets WHERE inventory_id = ?`, inventoryId);
    // Inserta los nuevos (OR REPLACE para evitar UNIQUE constraint en id duplicados)
    for (const r of rows) {
      database.runSync(
        `INSERT OR REPLACE INTO local_assets (id, asset_id, name, area_id, inventory_id, synced_at) VALUES (?, ?, ?, ?, ?, ?)`,
        r.id,
        r.asset_id,
        r.name ?? '',
        r.area_id,
        inventoryId,
        now
      );
    }
    database.execSync('COMMIT');
  } catch (e) {
    database.execSync('ROLLBACK');
    throw e;
  }
}

// Obtiene todos los activos locales, opcionalmente filtrados por inventario
export function getLocalAssets(inventoryId?: string): LocalAsset[] {
  if (Platform.OS === 'web') {
    const assets = Array.from(webTables.local_assets.values()) as LocalAsset[];
    return inventoryId ? assets.filter((a) => a.inventory_id === inventoryId) : assets;
  }

  const database = getDb();
  if (inventoryId) {
    return database.getAllSync<LocalAsset>(
      `SELECT * FROM local_assets WHERE inventory_id = ? ORDER BY asset_id`,
      inventoryId
    );
  }
  return database.getAllSync<LocalAsset>(`SELECT * FROM local_assets ORDER BY asset_id`);
}

// Conteo de activos locales, opcionalmente por inventario
export function getAssetsCount(inventoryId?: string): number {
  if (Platform.OS === 'web') {
    const assets = Array.from(webTables.local_assets.values()) as LocalAsset[];
    return inventoryId ? assets.filter((a) => a.inventory_id === inventoryId).length : assets.length;
  }

  const database = getDb();
  if (inventoryId) {
    const row = database.getFirstSync<{ c: number }>(
      `SELECT COUNT(*) as c FROM local_assets WHERE inventory_id = ?`,
      inventoryId
    );
    return row?.c ?? 0;
  }
  const row = database.getFirstSync<{ c: number }>(`SELECT COUNT(*) as c FROM local_assets`);
  return row?.c ?? 0;
}

// Busca un activo por código (asset_id), sin filtrar por inventario
export function findLocalAssetByCode(assetId: string): { asset_id: string; name: string | null } | null {
  if (Platform.OS === 'web') {
    for (const asset of webTables.local_assets.values()) {
      if (asset.asset_id === assetId) {
        return { asset_id: asset.asset_id, name: asset.name };
      }
    }
    return null;
  }

  const database = getDb();
  const row = database.getFirstSync<{ asset_id: string; name: string | null }>(
    `SELECT asset_id, name FROM local_assets WHERE asset_id = ? LIMIT 1`,
    assetId
  );
  return row ?? null;
}

export function addPendingScan(inventoryId: string, assetId: string) {
  if (Platform.OS === 'web') {
    const scannedAt = new Date().toISOString();
    const id = Date.now().toString();
    webTables.pending_scans.set(id, {
      inventory_id: inventoryId,
      asset_id: assetId,
      scanned_at: scannedAt,
    });
    return;
  }

  const database = getDb();
  const scannedAt = new Date().toISOString();
  database.runSync(
    `INSERT INTO pending_scans (inventory_id, asset_id, scanned_at) VALUES (?, ?, ?)`,
    inventoryId,
    assetId,
    scannedAt
  );
}

export function getPendingScansForInventory(inventoryId: string): { asset_id: string; scanned_at: string }[] {
  if (Platform.OS === 'web') {
    const scans = [];
    for (const scan of webTables.pending_scans.values()) {
      if (scan.inventory_id === inventoryId) {
        scans.push({ asset_id: scan.asset_id, scanned_at: scan.scanned_at });
      }
    }
    return scans;
  }

  const database = getDb();
  return database.getAllSync<{ asset_id: string; scanned_at: string }>(
    `SELECT asset_id, scanned_at FROM pending_scans WHERE inventory_id = ? ORDER BY id ASC`,
    inventoryId
  );
}

export function clearPendingScansForInventory(inventoryId: string) {
  if (Platform.OS === 'web') {
    for (const [key, scan] of webTables.pending_scans.entries()) {
      if (scan.inventory_id === inventoryId) {
        webTables.pending_scans.delete(key);
      }
    }
    return;
  }

  const database = getDb();
  database.runSync(`DELETE FROM pending_scans WHERE inventory_id = ?`, inventoryId);
}

export function setMeta(key: string, value: string) {
  if (Platform.OS === 'web') {
    webTables.app_meta.set(key, value);
    return;
  }
  getDb().runSync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`, key, value);
}

export function getMeta(key: string): string | null {
  if (Platform.OS === 'web') {
    return webTables.app_meta.get(key) ?? null;
  }
  const row = getDb().getFirstSync<{ value: string }>(`SELECT value FROM app_meta WHERE key = ?`, key);
  return row?.value ?? null;
}
