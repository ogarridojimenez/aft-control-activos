import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/guard';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const runtime = 'nodejs';

const QR_SIZE = 100;
const LABEL_FONT_SIZE = 8;
const CARD_WIDTH = 200;
const CARD_HEIGHT = 130;
const MARGIN = 20;
const COLS = 3;
const ROWS = 5;

export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAuth(request);
    if (authError) return authError;

    const { areaId } = await request.json();
    if (!areaId) {
      return NextResponse.json({ error: 'Área requerida' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, code, name')
      .eq('id', areaId)
      .single();

    if (areaError || !area) {
      return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 });
    }

    const { data: assetList, error: assetError } = await supabase
      .from('assets')
      .select('asset_id, name, location')
      .eq('area_id', areaId)
      .order('asset_id', { ascending: true });

    if (assetError) {
      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }

    if (!assetList || assetList.length === 0) {
      return NextResponse.json({ error: 'No hay activos en esta área' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 612;
    const pageHeight = 792;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let col = 0;
    let row = 0;

    for (const asset of assetList) {
      if (col >= COLS) { col = 0; row++; }
      if (row >= ROWS) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        row = 0; col = 0;
      }

      const x = MARGIN + col * (CARD_WIDTH + MARGIN);
      const y = pageHeight - MARGIN - (row + 1) * (CARD_HEIGHT + MARGIN);

      page.drawRectangle({
        x: x - 2, y: y - 2, width: CARD_WIDTH + 4, height: CARD_HEIGHT + 4,
        borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1,
      });

      const qrDataUrl = await QRCode.toDataURL(asset.asset_id, {
        width: QR_SIZE, margin: 1, color: { dark: '#000000', light: '#ffffff' },
      });
      const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);

      const qrX = x + (CARD_WIDTH - QR_SIZE) / 2;
      const qrY = y + 10;
      page.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });

      const labelY = y + 10 + QR_SIZE + 4;
      const nameText = asset.name.length > 25 ? asset.name.slice(0, 25) + '...' : asset.name;
      page.drawText(nameText, { x: x + 5, y: labelY, size: LABEL_FONT_SIZE, font: boldFont, maxWidth: CARD_WIDTH - 10 });
      page.drawText(asset.asset_id, { x: x + 5, y: labelY - 12, size: LABEL_FONT_SIZE - 1, font });
      if (asset.location) {
        page.drawText(asset.location, { x: x + 5, y: labelY - 24, size: LABEL_FONT_SIZE - 2, font, color: rgb(0.4, 0.4, 0.4) });
      }

      col++;
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="qr_${area.code}_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
