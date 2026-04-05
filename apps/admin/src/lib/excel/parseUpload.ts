import * as XLSX from 'xlsx';
import { excelRowSchema, type ExcelRowInput } from '@aft/shared';

export type UploadRowError = { row: number; message: string; raw: Record<string, unknown> };

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function parseExcelForUpload(buffer: Buffer, areaCode: string) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [] as ExcelRowInput[], errors: [] as UploadRowError[] };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];

  if (matrix.length < 2) {
    return { rows: [], errors: [{ row: 1, message: 'El archivo no tiene filas de datos', raw: {} }] };
  }

  const headerCells = matrix[0].map(normalizeHeader);
  const errors: UploadRowError[] = [];
  const rows: ExcelRowInput[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    const rowNum = i + 1;
    const obj: Record<string, unknown> = {};
    headerCells.forEach((key, colIdx) => {
      if (!key) return;
      obj[key] = line[colIdx] ?? null;
    });

    const parsed = excelRowSchema.safeParse({ ...obj, area_code: areaCode });
    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      errors.push({
        row: rowNum,
        message: parsed.error.errors.map((e) => e.message).join('; '),
        raw: obj,
      });
    }
  }

  return { rows, errors };
}

function formatPurchaseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.slice(0, 10);
  if (typeof v === 'number') {
    const d = (XLSX as unknown as { SSF: { parse_date_code: (n: number) => { y: number; m: number; d: number } | null } }).SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  return null;
}

export function rowToAssetPayload(
  row: ExcelRowInput,
  areaId: string | null,
  userId: string | null
) {
  return {
    asset_id: row.asset_id,
    name: row.name,
    description: row.description ?? null,
    category: row.category ?? null,
    brand: row.brand ?? null,
    model: row.model ?? null,
    serial_number: row.serial_number ?? null,
    purchase_date: formatPurchaseDate(row.purchase_date),
    purchase_value: row.purchase_value ?? null,
    location: row.location ?? null,
    area_id: areaId,
    updated_by: userId,
    status: 'active' as const,
  };
}
