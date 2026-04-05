import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLiteDatabase | null = null;
let webStorage: Map<string, any> = new Map();

// Simulación de tablas para web
const webTables = {
  local_assets: new Map(),
  pending_scans: new Map(),
  app_meta: new Map()
};

export function getDb(): SQLiteDatabase {
  if (Platform.OS === 'web') {
    // En web, lanzamos un error controlado ya que SQLite no funciona
    throw new Error('SQLite no está disponible en modo web');
  }

  if (!db) {
    db = openDatabaseSync('aft.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_assets (
        id TEXT PRIMARY KEY NOT NULL,
        asset_id TEXT NOT NULL,
        name TEXT,
        area_id TEXT NOT NULL,
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
    `);
  }
  return db;
}

export function clearLocalAssets() {
  if (Platform.OS === 'web') {
    webTables.local_assets.clear();
    return;
  }
  getDb().execSync('DELETE FROM local_assets');
}

export function insertLocalAssets(
  rows: { id: string; asset_id: string; name: string | null; area_id: string }[]
) {
  if (Platform.OS === 'web') {
    const now = new Date().toISOString();
    for (const r of rows) {
      webTables.local_assets.set(r.id, {
        ...r,
        synced_at: now
      });
    }
    return;
  }

  const database = getDb();
  const now = new Date().toISOString();
  for (const r of rows) {
    database.runSync(
      `INSERT OR REPLACE INTO local_assets (id, asset_id, name, area_id, synced_at) VALUES (?, ?, ?, ?, ?)`,
      r.id,
      r.asset_id,
      r.name ?? '',
      r.area_id,
      now
    );
  }
}

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
      scanned_at: scannedAt
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
