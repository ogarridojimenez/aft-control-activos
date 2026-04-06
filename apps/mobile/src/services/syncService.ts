import { retryWithBackoff } from '../utils/retry';
import { getMeta, setMeta } from './sqliteService';

const adminBase = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? '';
const BATCH_SIZE = 50;

export type SyncResult = {
  reconciliationId: string | null;
  summary: { expected: number; found: number; missing: number; surplus: number };
};

export type SyncProgress = {
  phase: 'uploading' | 'complete' | 'error';
  currentBatch: number;
  totalBatches: number;
  scannedCount: number;
  totalScans: number;
};

type SyncCallback = (progress: SyncProgress) => void;

async function doSyncBatch(
  inventoryId: string,
  scans: { asset_id: string; scanned_at: string }[],
  accessToken: string,
  batchIndex: number
): Promise<{ success: boolean; partial?: SyncResult }> {
  const url = `${adminBase.replace(/\/$/, '')}/api/sync/inventory`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      inventoryId,
      scans: scans.map((s) => ({ asset_id: s.asset_id, scanned_at: s.scanned_at })),
      batchIndex,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Error al sincronizar lote');
  }
  return { success: true, partial: json as SyncResult };
}

export async function syncInventoryToAdmin(
  inventoryId: string,
  scans: { asset_id: string; scanned_at: string }[],
  accessToken: string,
  onProgress?: SyncCallback
): Promise<SyncResult> {
  if (!adminBase) {
    throw new Error('Configura EXPO_PUBLIC_ADMIN_API_URL (ej: http://192.168.0.10:3000)');
  }
  if (!accessToken) {
    throw new Error('Sesión no válida: vuelve a iniciar sesión en la app.');
  }
  if (!scans || scans.length === 0) {
    throw new Error('No hay escaneos para sincronizar');
  }

  const totalBatches = Math.ceil(scans.length / BATCH_SIZE);
  let lastResult: SyncResult | null = null;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, scans.length);
    const batch = scans.slice(start, end);
    const scannedCount = end;

    onProgress?.({
      phase: 'uploading',
      currentBatch: batchIndex + 1,
      totalBatches,
      scannedCount,
      totalScans: scans.length,
    });

    try {
      const result = await retryWithBackoff(
        () => doSyncBatch(inventoryId, batch, accessToken, batchIndex),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
        }
      );

      if (result.partial) {
        lastResult = result.partial;
      }

      setMeta(`sync_checkpoint_${inventoryId}`, JSON.stringify({
        batchIndex: batchIndex + 1,
        timestamp: Date.now(),
      }));
    } catch (e) {
      onProgress?.({
        phase: 'error',
        currentBatch: batchIndex + 1,
        totalBatches,
        scannedCount: start,
        totalScans: scans.length,
      });
      throw e;
    }
  }

  setMeta(`sync_checkpoint_${inventoryId}`, '');
  onProgress?.({
    phase: 'complete',
    currentBatch: totalBatches,
    totalBatches,
    scannedCount: scans.length,
    totalScans: scans.length,
  });

  return lastResult ?? {
    reconciliationId: null,
    summary: { expected: 0, found: scans.length, missing: 0, surplus: scans.length },
  };
}

export function getSyncCheckpoint(inventoryId: string): { batchIndex: number; timestamp: number } | null {
  const checkpoint = getMeta(`sync_checkpoint_${inventoryId}`);
  if (!checkpoint) return null;
  try {
    return JSON.parse(checkpoint);
  } catch {
    return null;
  }
}

export function clearSyncCheckpoint(inventoryId: string) {
  setMeta(`sync_checkpoint_${inventoryId}`, '');
}
