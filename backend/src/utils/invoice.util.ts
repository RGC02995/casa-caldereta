import { createHmac } from 'crypto';
import PDFDocument from 'pdfkit';
import { env } from '../config/environment';
import { IBookingDocument } from '../models/booking.model';

// ─── Token HMAC ───────────────────────────────────────────────────────────────
// Determinista: mismo bookingId → mismo token. No requiere campo extra en BD.
// Solo alguien con el JWT_SECRET puede verificarlo o generarlo.

export function generateInvoiceToken(bookingId: string): string {
  return createHmac('sha256', env.jwtSecret).update(bookingId).digest('hex').slice(0, 32);
}

export function verifyInvoiceToken(bookingId: string, token: string): boolean {
  return generateInvoiceToken(bookingId) === token;
}

export function buildInvoiceUrl(bookingId: string): string {
  const token = generateInvoiceToken(bookingId);
  return `${env.backendUrl}/api/${env.apiVersion}/bookings/${bookingId}/invoice?token=${token}`;
}

// ─── Helpers compartidos ──────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function nightCount(checkIn: Date | string, checkOut: Date | string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay);
}

// ─── HTML del comprobante ─────────────────────────────────────────────────────

export function generateInvoiceHtml(booking: IBookingDocument, pdfUrl: string): string {
  const checkIn    = formatDate(booking.checkIn);
  const checkOut   = formatDate(booking.checkOut);
  const nights     = nightCount(booking.checkIn, booking.checkOut);
  const guests     = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;
  const ref        = `CC-${String(booking._id).slice(-6).toUpperCase()}`;
  const emitDate   = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const isFullyPaid = !!booking.remainingPaidAt;

  const depositFmt   = booking.depositAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const remainingFmt = booking.remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const totalFmt     = booking.totalPrice.toLocaleString('es-ES',     { minimumFractionDigits: 2 });

  const docLabel = isFullyPaid
    ? 'Comprobante de pago completo'
    : 'Comprobante de dep&oacute;sito &mdash; Primer pago (50&nbsp;%)';

  const pageTitle = isFullyPaid
    ? 'Comprobante de pago completo — Casa Caldereta'
    : 'Comprobante de depósito — Casa Caldereta';

  const remainingRow = isFullyPaid
    ? `<tr>
        <td>Segundo pago (50&nbsp;%) &mdash; abonado</td>
        <td>${remainingFmt}&nbsp;&euro;</td>
       </tr>`
    : '';

  const statusBlock = isFullyPaid
    ? `<div class="status status--paid">&#10003;&nbsp; Estancia completamente abonada</div>`
    : `<div class="status status--pending">&#9203;&nbsp; Dep&oacute;sito abonado &mdash; segundo pago pendiente</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Georgia,serif; background:#f5f3ef; color:#2c2c2c; }
  .wrap { max-width:680px; margin:40px auto; background:#fff; padding:56px; }
  .download-wrap { text-align:center; margin-bottom:36px; }
  .download-btn { display:inline-block; padding:12px 36px; background:#2c2c2c; color:#fff; text-decoration:none; font-family:Arial,sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; border-radius:2px; }
  .download-btn:hover { background:#444; }
  .hdr { text-align:center; padding-bottom:28px; margin-bottom:32px; border-bottom:2px solid #2c2c2c; }
  .hdr__tag { font-family:Arial,sans-serif; font-size:10px; letter-spacing:4px; color:#c9a96e; text-transform:uppercase; margin-bottom:8px; }
  .hdr__name { font-size:26px; font-weight:400; letter-spacing:2px; margin-bottom:4px; }
  .hdr__sub { font-family:Arial,sans-serif; font-size:11px; color:#888; letter-spacing:1px; margin-bottom:18px; }
  .hdr__doc { font-family:Arial,sans-serif; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#2c2c2c; font-weight:700; }
  .meta { display:flex; justify-content:space-between; font-family:Arial,sans-serif; font-size:11px; color:#888; margin-bottom:28px; }
  .section-lbl { font-family:Arial,sans-serif; font-size:10px; letter-spacing:3px; color:#bbb; text-transform:uppercase; margin-bottom:10px; }
  .section { margin-bottom:28px; }
  .guest { font-family:Arial,sans-serif; font-size:13px; line-height:1.9; }
  .guest strong { font-size:15px; color:#2c2c2c; display:block; }
  table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; }
  table td { padding:10px 0; border-bottom:1px solid #f0ede8; font-size:13px; vertical-align:top; }
  table td:first-child { color:#888; }
  table td:last-child { text-align:right; font-weight:500; color:#2c2c2c; }
  .pending-row td { color:#bbb !important; }
  .total-row td { border-bottom:none; border-top:2px solid #2c2c2c; padding-top:14px; font-size:15px; font-weight:700; }
  .total-row td:last-child { color:#c9a96e; }
  .status { margin-top:24px; padding:14px 18px; font-family:Arial,sans-serif; font-size:13px; font-weight:700; }
  .status--paid { background:#f0fdf4; border-left:3px solid #22c55e; color:#166534; }
  .status--pending { background:#fefce8; border-left:3px solid #ca8a04; color:#854d0e; }
  .legal { margin-top:36px; padding-top:20px; border-top:1px solid #f0ede8; font-family:Arial,sans-serif; font-size:11px; color:#bbb; line-height:1.8; }
  .legal p + p { margin-top:6px; }
  @media print {
    body { background:#fff; }
    .wrap { margin:0; padding:36px; max-width:100%; }
    .download-wrap { display:none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="download-wrap">
    <a href="${pdfUrl}" class="download-btn">Descargar PDF</a>
  </div>
  <div class="hdr">
    <p class="hdr__tag">Vivienda Tur&iacute;stica</p>
    <h1 class="hdr__name">Casa Caldereta</h1>
    <p class="hdr__sub">Aielo de Rugat &middot; Valencia &middot; CV-VUT0058371-V</p>
    <p class="hdr__doc">${docLabel}</p>
  </div>
  <div class="meta">
    <span>Ref:&nbsp;<strong>${ref}</strong></span>
    <span>${emitDate}</span>
  </div>
  <div class="section">
    <p class="section-lbl">Hu&eacute;sped</p>
    <div class="guest">
      <strong>${escapeHtml(booking.guestName)}</strong>
      ${escapeHtml(booking.guestEmail)}<br>
      ${escapeHtml(booking.guestPhone)}
    </div>
  </div>
  <div class="section">
    <p class="section-lbl">Estancia</p>
    <table>
      <tr><td>Check-in</td><td>${checkIn}</td></tr>
      <tr><td>Check-out</td><td>${checkOut}</td></tr>
      <tr><td>Noches</td><td>${nights}</td></tr>
      <tr><td style="border-bottom:none;">H&uacute;espedes</td><td style="border-bottom:none;">${guests}</td></tr>
    </table>
  </div>
  <div class="section">
    <p class="section-lbl">Pagos</p>
    <table>
      <tr>
        <td>Dep&oacute;sito (50&nbsp;%) &mdash; cobrado al reservar</td>
        <td>${depositFmt}&nbsp;&euro;</td>
      </tr>
      ${remainingRow}
      <tr class="total-row">
        <td>${isFullyPaid ? 'Total estancia' : 'Importe abonado'}</td>
        <td>${isFullyPaid ? totalFmt : depositFmt}&nbsp;&euro;</td>
      </tr>
    </table>
  </div>
  ${statusBlock}
  <div class="legal">
    <p>Este documento es un comprobante de pago emitido autom&aacute;ticamente. No constituye factura fiscal con desglose de IVA.</p>
    <p>Licencia tur&iacute;stica: CV-VUT0058371-V &mdash; Registro de Turisme de la Comunitat Valenciana (Decreto 92/2009).</p>
    <p>Pol&iacute;tica de cancelaci&oacute;n: reembolso &iacute;ntegro si se cancela con m&aacute;s de 7&nbsp;d&iacute;as de antelaci&oacute;n. Sin reembolso si se cancela con 7&nbsp;d&iacute;as o menos (arras penitenciales, art.&nbsp;1454 CC).</p>
    <p style="margin-top:8px;">Casa Caldereta &middot; Aielo de Rugat, Valencia &middot; casacaldereta@gmail.com</p>
  </div>
</div>
</body>
</html>`;
}

// ─── PDF del comprobante ──────────────────────────────────────────────────────

export async function generateInvoicePdf(booking: IBookingDocument): Promise<Buffer> {
  const isFullyPaid  = !!booking.remainingPaidAt;
  const ref          = `CC-${String(booking._id).slice(-6).toUpperCase()}`;
  const emitDate     = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const checkInStr   = formatDate(booking.checkIn);
  const checkOutStr  = formatDate(booking.checkOut);
  const nights       = nightCount(booking.checkIn, booking.checkOut);
  const guestsStr    = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;
  const depositFmt   = `${booking.depositAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
  const remainingFmt = `${booking.remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
  const totalFmt     = `${booking.totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;

  const docTitle = isFullyPaid
    ? 'Comprobante de pago completo'
    : 'Comprobante de depósito — Primer pago (50%)';

  return new Promise<Buffer>((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 56, compress: true, info: { Title: docTitle, Author: 'Casa Caldereta' } });
    const chunks: Buffer[] = [];

    doc.on('data',  (chunk: Buffer) => chunks.push(chunk));
    doc.on('end',   ()             => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error)   => reject(err));

    const W    = doc.page.width - 112;
    const L    = 56;
    const GOLD = '#C9A96E';
    const DARK = '#2C2C2C';
    const GREY = '#888888';
    const DIM  = '#BBBBBB';

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor(GOLD)
       .text('VIVIENDA TURISTICA  ·  CV-VUT0058371-V', L, doc.y, { width: W, align: 'center', characterSpacing: 2 });
    doc.moveDown(0.4);
    doc.fontSize(24).font('Helvetica').fillColor(DARK)
       .text('Casa Caldereta', L, doc.y, { width: W, align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').fillColor(GREY)
       .text('Aielo de Rugat  ·  Valencia', L, doc.y, { width: W, align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
       .text(docTitle.toUpperCase(), L, doc.y, { width: W, align: 'center', characterSpacing: 0.8 });
    doc.moveDown(0.7);

    const headerLineY = doc.y;
    doc.moveTo(L, headerLineY).lineTo(L + W, headerLineY).strokeColor(DARK).lineWidth(2).stroke();
    doc.y = headerLineY + 16;

    // ── Ref + Fecha ──────────────────────────────────────────────────────────
    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor(GREY)
       .text('Ref.  ', L, metaY, { continued: true });
    doc.font('Helvetica-Bold').fillColor(DARK).text(ref, { continued: false });
    doc.fontSize(9).font('Helvetica').fillColor(GREY)
       .text(emitDate, L, metaY, { width: W, align: 'right' });
    doc.y = metaY + 22;
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
    doc.y += 18;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const sectionLabel = (text: string): void => {
      doc.fontSize(7.5).font('Helvetica').fillColor(DIM)
         .text(text.toUpperCase(), L, doc.y, { width: W, characterSpacing: 2.5 });
      doc.y += 14;
    };

    const tableRow = (
      label: string,
      value: string,
      opts?: { bold?: boolean; dimmed?: boolean; topBorder?: boolean },
    ): void => {
      if (opts?.topBorder) {
        doc.y += 6;
        doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(DARK).lineWidth(1.5).stroke();
        doc.y += 12;
      }

      const rowY     = doc.y;
      const leftW    = W * 0.65;
      const rightX   = L + leftW;
      const rightW   = W * 0.35;
      const size     = opts?.bold ? 13 : 11;
      const font     = opts?.bold ? 'Helvetica-Bold' : 'Helvetica';
      const labelClr = opts?.dimmed ? DIM : GREY;
      const valueClr = opts?.bold ? GOLD : opts?.dimmed ? DIM : DARK;

      doc.fontSize(size).font(font).fillColor(labelClr)
         .text(label, L, rowY, { width: leftW });
      const afterLabel = doc.y;

      doc.fontSize(size).font(font).fillColor(valueClr)
         .text(value, rightX, rowY, { width: rightW, align: 'right' });
      const afterValue = doc.y;

      doc.y = Math.max(afterLabel, afterValue) + 4;

      if (!opts?.topBorder) {
        doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor('#EBEBEB').lineWidth(0.5).stroke();
        doc.y += 8;
      } else {
        doc.y += 6;
      }
    };

    // ── Huésped ──────────────────────────────────────────────────────────────
    sectionLabel('Huésped');
    doc.fontSize(13).font('Helvetica-Bold').fillColor(DARK)
       .text(booking.guestName, L, doc.y, { width: W });
    doc.y += 4;
    doc.fontSize(10).font('Helvetica').fillColor(GREY)
       .text(booking.guestEmail, L, doc.y, { width: W });
    doc.y += 2;
    doc.fontSize(10).font('Helvetica').fillColor(GREY)
       .text(booking.guestPhone, L, doc.y, { width: W });
    doc.y += 22;

    // ── Estancia ─────────────────────────────────────────────────────────────
    sectionLabel('Estancia');
    tableRow('Check-in',   checkInStr);
    tableRow('Check-out',  checkOutStr);
    tableRow('Noches',     String(nights));
    tableRow('Huéspedes', guestsStr);
    doc.y += 8;

    // ── Pagos ─────────────────────────────────────────────────────────────────
    sectionLabel('Pagos');
    tableRow('Depósito (50%) — cobrado al reservar', depositFmt);

    if (isFullyPaid) {
      tableRow('Segundo pago (50%) — abonado', remainingFmt);
      tableRow('Total estancia', totalFmt, { bold: true, topBorder: true });
    } else {
      tableRow('Importe abonado', depositFmt, { bold: true, topBorder: true });
    }
    doc.y += 14;

    // ── Estado ───────────────────────────────────────────────────────────────
    const statusY   = doc.y;
    const blockH    = 40;
    const bgColor   = isFullyPaid ? '#F0FDF4' : '#FEFCE8';
    const acColor   = isFullyPaid ? '#22C55E' : '#CA8A04';
    const txColor   = isFullyPaid ? '#166534' : '#854D0E';
    const statusTxt = isFullyPaid
      ? 'PAGO COMPLETO  —  Estancia totalmente abonada'
      : 'DEPÓSITO ABONADO  —  Segundo pago pendiente';

    doc.rect(L, statusY, W, blockH).fillColor(bgColor).fill();
    doc.moveTo(L, statusY).lineTo(L, statusY + blockH).strokeColor(acColor).lineWidth(3).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor(txColor)
       .text(statusTxt, L + 14, statusY + 13, { width: W - 20 });
    doc.y = statusY + blockH + 22;

    // ── Legal ─────────────────────────────────────────────────────────────────
    doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
    doc.y += 12;

    const legalLines = [
      'Este documento es un comprobante de pago emitido automáticamente. No constituye factura fiscal con desglose de IVA.',
      'Licencia turística: CV-VUT0058371-V — Registro de Turisme de la Comunitat Valenciana (Decreto 92/2009).',
      'Política de cancelación: reembolso íntegro si se cancela con más de 7 días de antelación.',
      'Sin reembolso si se cancela con 7 días o menos (arras penitenciales, art. 1454 CC).',
      'Casa Caldereta  ·  Aielo de Rugat, Valencia  ·  casacaldereta@gmail.com',
    ];

    for (const line of legalLines) {
      doc.fontSize(8).font('Helvetica').fillColor(DIM).text(line, L, doc.y, { width: W });
      doc.y += 4;
    }

    doc.end();
  });
}
