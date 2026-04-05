import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/guard';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const inventoryId = params.id;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'pdf';

    const supabase = createSupabaseAdmin();

    const { data: inventory, error: invError } = await supabase
      .from('inventories')
      .select('id, inventory_date, status, notes, areas(name, code)')
      .eq('id', inventoryId)
      .single();

    if (invError || !inventory) {
      return NextResponse.json({ error: 'Inventario no encontrado' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('asset_id, quantity_expected, quantity_found, scanned_at, condition_notes, assets(asset_id, name, category, location)')
      .eq('inventory_id', inventoryId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const { data: reconciliation, error: reconError } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('inventory_id', inventoryId);

    if (reconError) {
      return NextResponse.json({ error: reconError.message }, { status: 500 });
    }

    const area = inventory.areas as { name: string; code: string } | null;
    const flatItems = (items ?? []).map((item: any) => ({
      assetTag: item.assets?.asset_id ?? null,
      assetName: item.assets?.name ?? null,
      assetCategory: item.assets?.category ?? null,
      assetLocation: item.assets?.location ?? null,
      quantityExpected: item.quantity_expected,
      quantityFound: item.quantity_found,
      scannedAt: item.scanned_at,
      conditionNotes: item.condition_notes,
    }));

    const expected = flatItems.length;
    const found = flatItems.filter((i: any) => (i.quantityFound ?? 0) > 0).length;
    const missing = flatItems.filter((i: any) => (i.quantityFound ?? 0) === 0).length;
    const accuracy = expected > 0 ? Math.round((found / expected) * 100) : 0;

    const invData = {
      id: inventory.id,
      inventoryDate: inventory.inventory_date,
      status: inventory.status,
      notes: inventory.notes,
      areaName: area?.name ?? null,
      areaCode: area?.code ?? null,
    };

    if (format === 'excel') {
      return generateExcel(invData, flatItems, reconciliation?.[0] ?? null, { expected, found, missing, accuracy });
    }

    return generatePdf(invData, flatItems, reconciliation?.[0] ?? null, { expected, found, missing, accuracy });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function generatePdf(
  inventory: any,
  items: any[],
  reconciliation: any,
  stats: { expected: number; found: number; missing: number; accuracy: number }
) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  function drawText(text: string, x: number, yPos: number, size: number, fnt: any, color: any = rgb(0, 0, 0)) {
    page.drawText(text, { x, y: yPos, size, font: fnt, color });
  }

  drawText('Reporte de Inventario', margin, y, 18, boldFont);
  y -= 30;
  drawText(`Area: ${inventory.areaName} (${inventory.areaCode})`, margin, y, 10, font);
  y -= 16;
  drawText(`Fecha: ${inventory.inventoryDate}`, margin, y, 10, font);
  y -= 16;
  drawText(`Estado: ${inventory.status}`, margin, y, 10, font);
  y -= 16;
  if (inventory.notes) { drawText(`Notas: ${inventory.notes}`, margin, y, 10, font); y -= 16; }

  y -= 10;
  drawText('Resumen', margin, y, 14, boldFont);
  y -= 22;
  drawText(`Esperados: ${stats.expected}`, margin, y, 10, font);
  y -= 16;
  drawText(`Encontrados: ${stats.found}`, margin, y, 10, font);
  y -= 16;
  drawText(`Faltantes: ${stats.missing}`, margin, y, 10, font, rgb(0.8, 0, 0));
  y -= 16;
  drawText(`Exactitud: ${stats.accuracy}%`, margin, y, 10, boldFont);

  y -= 30;
  drawText('Detalle de Activos', margin, y, 14, boldFont);
  y -= 22;

  const colWidths = [80, 120, 70, 80, 50, 50, 50];
  const headers = ['Asset ID', 'Nombre', 'Categoria', 'Ubicacion', 'Esper.', 'Encontr.', 'Estado'];
  let x = margin;
  headers.forEach((h, i) => { drawText(h, x, y, 8, boldFont); x += colWidths[i]; });
  y -= 14;
  page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: width - margin, y: y + 2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 4;

  for (const item of items) {
    if (y < margin + 20) { const newPage = pdfDoc.addPage([612, 792]); y = newPage.getHeight() - margin; }
    const isFound = (item.quantityFound ?? 0) > 0;
    const values = [item.assetTag ?? '—', item.assetName ?? '—', item.assetCategory ?? '—', item.assetLocation ?? '—', String(item.quantityExpected ?? 1), String(item.quantityFound ?? 0), isFound ? 'OK' : 'FALTANTE'];
    x = margin;
    values.forEach((v, i) => { const display = v.length > 15 ? v.slice(0, 15) + '...' : v; drawText(display, x, y, 7, font, isFound ? rgb(0, 0, 0) : rgb(0.8, 0, 0)); x += colWidths[i]; });
    y -= 14;
  }

  if (reconciliation?.surplus_assets && reconciliation.surplus_assets.length > 0) {
    y -= 20;
    if (y < margin + 40) { const newPage = pdfDoc.addPage([612, 792]); y = newPage.getHeight() - margin; }
    drawText('Activos Sobrantes', margin, y, 14, boldFont);
    y -= 20;
    for (const s of reconciliation.surplus_assets) { drawText(`${s.asset_id} - ${s.notes ?? ''}`, margin, y, 8, font, rgb(0.7, 0.5, 0)); y -= 14; }
  }

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="inventario_${inventory.areaCode}_${inventory.inventoryDate}.pdf"` },
  });
}

async function generateExcel(
  inventory: any,
  items: any[],
  reconciliation: any,
  stats: { expected: number; found: number; missing: number; accuracy: number }
) {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['Reporte de Inventario'], [''],
    ['Area', inventory.areaName], ['Codigo', inventory.areaCode],
    ['Fecha', inventory.inventoryDate], ['Estado', inventory.status],
    ['Notas', inventory.notes ?? ''], [''],
    ['Resumen'],
    ['Esperados', stats.expected], ['Encontrados', stats.found],
    ['Faltantes', stats.missing], ['Exactitud', `${stats.accuracy}%`],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

  const itemsData = [
    ['Asset ID', 'Nombre', 'Categoria', 'Ubicacion', 'Esperado', 'Encontrado', 'Estado', 'Fecha Escaneo', 'Notas'],
    ...items.map((item: any) => [
      item.assetTag ?? '', item.assetName ?? '', item.assetCategory ?? '', item.assetLocation ?? '',
      item.quantityExpected ?? 1, item.quantityFound ?? 0,
      (item.quantityFound ?? 0) > 0 ? 'Encontrado' : 'Faltante',
      item.scannedAt ? new Date(item.scannedAt).toLocaleString('es') : '',
      item.conditionNotes ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemsData), 'Detalle');

  if (reconciliation?.surplus_assets && (reconciliation.surplus_assets as any[]).length > 0) {
    const surplusData = [['Asset ID', 'Notas'], ...(reconciliation.surplus_assets as any[]).map((s: any) => [s.asset_id, s.notes ?? ''])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(surplusData), 'Sobrantes');
  }

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const excelBytes = new Uint8Array(excelBuffer);
  return new NextResponse(excelBytes as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="inventario_${inventory.areaCode}_${inventory.inventoryDate}.xlsx"` },
  });
}
