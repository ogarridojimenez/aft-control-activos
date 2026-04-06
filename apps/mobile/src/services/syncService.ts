import { retryWithBackoff } from '../utils/retry';

const adminBase = process.env.EXPO_PUBLIC_ADMIN_API_URL ?? '';

export type SyncResult = {
  reconciliationId: string | null;
  summary: { expected: number; found: number; missing: number; surplus: number };
};

async function doSyncRequest(
  inventoryId: string,
  scans: { asset_id: string; scanned_at: string }[],
  accessToken: string
): Promise<SyncResult> {
  const url = `${adminBase.replace(/\/$/, '')}/api/sync/inventory`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      inventoryId,
      scans: scans.map((s) => ({ asset_id: s.asset_id, scanned_at: s.scanned_at })),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Error al sincronizar');
  }
  return json as SyncResult;
}

export async function syncInventoryToAdmin(
  inventoryId: string,
  scans: { asset_id: string; scanned_at: string }[],
  accessToken: string
): Promise<SyncResult> {
  if (!adminBase) {
    throw new Error('Configura EXPO_PUBLIC_ADMIN_API_URL (ej: http://192.168.0.10:3000)');
  }
  if (!accessToken) {
    throw new Error('Sesión no válida: vuelve a iniciar sesión en la app.');
  }

  return retryWithBackoff(
    () => doSyncRequest(inventoryId, scans, accessToken),
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
    }
  );
}
