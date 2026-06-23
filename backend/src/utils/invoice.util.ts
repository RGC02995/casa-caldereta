import { createHmac } from 'crypto';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export function generateInvoiceHtml(booking: IBookingDocument): string {
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

  const remainingRow = isFullyPaid
    ? `<tr>
        <td>Segundo pago (50&nbsp;%) &mdash; cobrado 7&nbsp;d&iacute;as antes del check-in</td>
        <td>${remainingFmt}&nbsp;&euro;</td>
       </tr>`
    : `<tr class="pending-row">
        <td>Segundo pago (50&nbsp;%) &mdash; pendiente de cobro</td>
        <td>${remainingFmt}&nbsp;&euro;</td>
       </tr>`;

  const statusBlock = isFullyPaid
    ? `<div class="status status--paid">&#10003;&nbsp; Estancia completamente abonada</div>`
    : `<div class="status status--pending">&#9203;&nbsp; Dep&oacute;sito abonado &mdash; segundo pago pendiente</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comprobante de pago &mdash; Casa Caldereta</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Georgia,serif; background:#f5f3ef; color:#2c2c2c; }
  .wrap { max-width:680px; margin:40px auto; background:#fff; padding:56px; }
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
  .print-btn { display:block; margin:0 auto 36px; padding:12px 36px; background:#2c2c2c; color:#fff; border:none; font-family:Arial,sans-serif; font-size:11px; letter-spacing:2px; text-transform:uppercase; cursor:pointer; border-radius:2px; }
  .print-btn:hover { background:#444; }
  @media print {
    body { background:#fff; }
    .wrap { margin:0; padding:36px; max-width:100%; }
    .print-btn { display:none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  <div class="hdr">
    <p class="hdr__tag">Vivienda Tur&iacute;stica</p>
    <h1 class="hdr__name">Casa Caldereta</h1>
    <p class="hdr__sub">Aielo de Rugat &middot; Valencia &middot; CV-VUT0058371-V</p>
    <p class="hdr__doc">Comprobante de pago</p>
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
        <td>Total estancia</td>
        <td>${totalFmt}&nbsp;&euro;</td>
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
