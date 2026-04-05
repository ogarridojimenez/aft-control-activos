import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { runReconciliation, type ScanPayload } from '@/lib/reconciliation/runReconciliation';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({
  inventoryId: z.string().uuid(),
  scans: z.array(
    z.object({
      asset_id: z.string(),
      scanned_at: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await runReconciliation(
      parsed.data.inventoryId,
      parsed.data.scans as ScanPayload[]
    );

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
