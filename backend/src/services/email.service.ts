import { Resend } from 'resend';
import { env } from '../config/environment';
import { IBookingDocument, BookingStatus } from '../models/booking.model';

interface ISendOptions {
  readonly to:      string;
  readonly subject: string;
  readonly html:    string;
  readonly text:    string;
}

interface ITemplateData {
  readonly booking:  IBookingDocument;
  readonly checkIn:  string;
  readonly checkOut: string;
}

interface IStatusTemplateData extends ITemplateData {
  readonly newStatus: 'confirmed' | 'cancelled';
}

interface IRefundTemplateData extends ITemplateData {
  readonly amount: number;
}

type OwnerCancellationReason = 'deleted' | 'refunded' | 'admin_cancelled' | 'guest_cancelled_pending';

interface IOwnerCancellationTemplateData extends ITemplateData {
  readonly reason: OwnerCancellationReason;
  readonly amount?: number; // solo para 'refunded'
}

interface IPreArrivalTemplateData extends ITemplateData {
  readonly formUrl:      string;
  readonly checkInTime:  string;
  readonly checkOutTime: string;
}

interface ICheckinTraveler {
  readonly tipoDocumento:       string;
  readonly numDocumento:        string;
  readonly numSoporte:          string;
  readonly apellido1:           string;
  readonly apellido2:           string;
  readonly nombre:              string;
  readonly sexo?:               string;
  readonly fechaNacimiento:     string;
  readonly parentesco?:         string;
  readonly pais:                string;
  readonly paisResidencia:      string;
  readonly ciudadResidencia:    string;
  readonly direccionResidencia: string;
  readonly codigoPostal:        string;
  readonly contacto:            string;
}

// ─── Utilidades de formato ────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
}

function formatDateTime(): string {
  return new Date().toLocaleDateString('es-ES', {
    year:   'numeric',
    month:  'long',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Bloques de HTML reutilizables ───────────────────────────────────────────

function emailWrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F3EF;font-family:Georgia,serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" style="max-width:580px;width:100%;background:#FFF;border-radius:4px;">
        <tr>
          <td style="background:#2C2C2C;padding:32px 40px;text-align:center;">
            <p style="margin:0;color:#C9A96E;font-size:10px;letter-spacing:4px;font-family:Arial,sans-serif;text-transform:uppercase;">Vivienda Tur&#237;stica</p>
            <h1 style="margin:8px 0 0;color:#FFF;font-size:26px;font-weight:400;letter-spacing:2px;">Casa Caldereta</h1>
            <p style="margin:6px 0 0;color:#888;font-size:10px;letter-spacing:2px;font-family:Arial,sans-serif;">Aielo de Rugat &middot; Valencia</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#F5F3EF;border-top:1px solid #E8E4DC;padding:20px 40px;">
            <p style="margin:0;color:#AAA;font-size:10px;text-align:center;line-height:1.8;font-family:Arial,sans-serif;">
              Casa Caldereta &middot; Aielo de Rugat, Valencia<br>
              Licencia tur&#237;stica CV-VUT0058371-V<br>
              Mensaje generado autom&#225;ticamente &mdash; no responder a este correo.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function detailsTable({ booking, checkIn, checkOut }: ITemplateData): string {
  const guests = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;
  const price  = `${booking.totalPrice.toLocaleString('es-ES')} &#8364;`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-top:1px solid #F0EDE8;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;width:40%;">Check-in</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${checkIn}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Check-out</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${checkOut}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Hu&#233;spedes</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${guests}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Importe estimado</td>
      <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#C9A96E;">${price}</td>
    </tr>
  </table>`;
}

// ─── Templates de email ──────────────────────────────────────────────────────

function ownerNewBookingHtml(data: ITemplateData): string {
  const { booking } = data;
  const guestName  = escapeHtml(booking.guestName);
  const guestEmail = escapeHtml(booking.guestEmail);
  const guestPhone = escapeHtml(booking.guestPhone);
  const notesBlock  = booking.notes
    ? `<div style="margin-top:20px;padding:16px;background:#F9F7F4;border-left:3px solid #C9A96E;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Notas del hu&#233;sped</p>
        <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#555;">${escapeHtml(booking.notes)}</p>
       </div>`
    : '';

  return emailWrapper(
    'Nueva solicitud de reserva',
    `<h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2C2C2C;">Nueva solicitud de reserva</h2>
    <p style="margin:0 0 24px;font-size:12px;color:#999;font-family:Arial,sans-serif;">Recibida el ${formatDateTime()}</p>
    <p style="margin:0 0 4px;font-size:16px;color:#2C2C2C;"><strong>${guestName}</strong></p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">
      <a href="mailto:${guestEmail}" style="color:#C9A96E;text-decoration:none;">${guestEmail}</a>
    </p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">${guestPhone}</p>
    ${detailsTable(data)}
    ${notesBlock}`,
  );
}

function ownerPaymentReceivedHtml(data: ITemplateData, label: string = 'Dep&#243;sito (50&nbsp;%) recibido &mdash; Reserva confirmada'): string {
  const { booking } = data;
  const guestName  = escapeHtml(booking.guestName);
  const guestEmail = escapeHtml(booking.guestEmail);
  const guestPhone = escapeHtml(booking.guestPhone);
  const notesBlock  = booking.notes
    ? `<div style="margin-top:20px;padding:16px;background:#F9F7F4;border-left:3px solid #C9A96E;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Notas del hu&#233;sped</p>
        <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#555;">${escapeHtml(booking.notes)}</p>
       </div>`
    : '';

  const depositFmt   = booking.depositAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const remainingFmt = booking.remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const totalFmt     = booking.totalPrice.toLocaleString('es-ES',     { minimumFractionDigits: 2 });

  const paymentBreakdown = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid #F0EDE8;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Dep&oacute;sito cobrado</td>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;text-align:right;">${depositFmt}&nbsp;&euro;</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Restante pendiente (7&nbsp;d&iacute;as antes)</td>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#888;text-align:right;">${remainingFmt}&nbsp;&euro;</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Total estancia</td>
        <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#C9A96E;text-align:right;">${totalFmt}&nbsp;&euro;</td>
      </tr>
    </table>`;

  return emailWrapper(
    label,
    `<h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2C2C2C;">&#10003; ${label}</h2>
    <p style="margin:0 0 24px;font-size:12px;color:#999;font-family:Arial,sans-serif;">Recibido el ${formatDateTime()}</p>
    <p style="margin:0 0 4px;font-size:16px;color:#2C2C2C;"><strong>${guestName}</strong></p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">
      <a href="mailto:${guestEmail}" style="color:#C9A96E;text-decoration:none;">${guestEmail}</a>
    </p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">${guestPhone}</p>
    <div style="margin-top:12px;padding:10px 14px;background:#F0FDF4;border-left:3px solid #22C55E;font-family:Arial,sans-serif;font-size:12px;color:#166534;">
      El pago ha sido procesado autom&#225;ticamente por Stripe.
    </div>
    ${detailsTable(data)}
    ${paymentBreakdown}
    ${notesBlock}`,
  );
}

const OWNER_CANCELLATION_COPY: Record<OwnerCancellationReason, { title: string; message: (amount?: number) => string }> = {
  deleted: {
    title:   'Reserva eliminada',
    message: () => 'Has eliminado la siguiente reserva del sistema.',
  },
  refunded: {
    title:   'Reembolso procesado',
    message: (amount) => `Has reembolsado <strong>${(amount ?? 0).toFixed(2)}&nbsp;&euro;</strong> y la reserva ha quedado cancelada.`,
  },
  admin_cancelled: {
    title:   'Reserva cancelada',
    message: () => 'Has cancelado la siguiente reserva (sin reembolso).',
  },
  guest_cancelled_pending: {
    title:   'Reserva pendiente cancelada por el huésped',
    message: () => 'El hu&#233;sped ha cancelado su solicitud antes de completar el pago; la fecha vuelve a estar libre.',
  },
};

function ownerCancellationHtml(data: IOwnerCancellationTemplateData): string {
  const { booking, reason, amount } = data;
  const { title, message } = OWNER_CANCELLATION_COPY[reason];
  const guestName = escapeHtml(booking.guestName);

  return emailWrapper(
    title,
    `<h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2C2C2C;">${title}</h2>
    <p style="margin:0 0 24px;font-size:12px;color:#999;font-family:Arial,sans-serif;">Notificado el ${formatDateTime()}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      ${message(amount)}
    </p>
    <p style="margin:0 0 4px;font-size:16px;color:#2C2C2C;"><strong>${guestName}</strong></p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">
      <a href="mailto:${escapeHtml(booking.guestEmail)}" style="color:#C9A96E;text-decoration:none;">${escapeHtml(booking.guestEmail)}</a>
    </p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">${escapeHtml(booking.guestPhone)}</p>
    ${detailsTable(data)}`,
  );
}

function guestRefundCancellationHtml(data: IRefundTemplateData): string {
  const { booking, amount } = data;
  const isFullRefund = Math.round(amount * 100) === Math.round(booking.totalPrice * 100);
  const amountFmt    = amount.toFixed(2);

  const refundText = isFullRefund
    ? `y el importe de <strong>${amountFmt}&nbsp;&euro;</strong> que abonaste ha sido reembolsado &#237;ntegramente.`
    : `Se ha procesado un reembolso de <strong>${amountFmt}&nbsp;&euro;</strong> sobre los ${booking.totalPrice.toFixed(2)}&nbsp;&euro; abonados.`;

  return emailWrapper(
    'Reserva cancelada y reembolso procesado',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">Reserva cancelada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Tu reserva en <strong>Casa Caldereta</strong> ha sido cancelada
      ${refundText} El reembolso puede tardar entre 5 y 10 d&#237;as h&#225;biles
      en aparecer en tu estado de cuenta.
    </p>
    ${detailsTable(data)}
    <p style="margin:20px 0 0;font-size:13px;color:#888;font-family:Arial,sans-serif;line-height:1.6;">
      Esperamos tener la oportunidad de recibirte en Casa Caldereta en otra ocasi&#243;n.
    </p>`,
  );
}

function guestBookingReceivedHtml(data: ITemplateData): string {
  const { booking } = data;
  return emailWrapper(
    'Hemos recibido tu solicitud',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">Hola, ${escapeHtml(booking.guestName)}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hemos recibido correctamente tu solicitud de reserva en <strong>Casa Caldereta</strong>.
      Revisaremos la disponibilidad y nos pondremos en contacto contigo en las pr&#243;ximas horas para confirmar.
    </p>
    ${detailsTable(data)}
    <p style="margin:28px 0 0;font-size:13px;color:#888;font-family:Arial,sans-serif;line-height:1.6;">
      Si tienes alguna pregunta o necesitas modificar la solicitud, no dudes en contactarnos.<br>
      &#161;Gracias por elegir Casa Caldereta!
    </p>`,
  );
}

function guestPreArrivalHtml(data: IPreArrivalTemplateData): string {
  const { booking, checkIn, checkOut, formUrl, checkInTime, checkOutTime } = data;
  return emailWrapper(
    'Preparativos para tu estancia',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">Hola, ${escapeHtml(booking.guestName)}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Tu estancia en <strong>Casa Caldereta</strong> comienza en pocos d&#237;as.
      Aqu&#237; tienes toda la informaci&#243;n que necesitas para una llegada sin contratiempos.
    </p>
    <div style="margin:0 0 24px;padding:20px;background:#F9F7F4;border-left:3px solid #C9A96E;">
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Horarios</p>
      <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:14px;color:#2C2C2C;">
        <strong>Entrada:</strong> ${checkIn} &mdash; a partir de las <strong>${checkInTime} h</strong>
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#2C2C2C;">
        <strong>Salida:</strong> ${checkOut} &mdash; antes de las <strong>${checkOutTime} h</strong>
      </p>
    </div>
    <div style="margin:0 0 24px;padding:20px;background:#FFF8EC;border:1px solid #F0D89A;">
      <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:13px;color:#8B6914;font-weight:bold;">
        &#9888;&#65039; Registro obligatorio de viajeros
      </p>
      <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.6;">
        En cumplimiento del Real Decreto 933/2021, todos los viajeros mayores de 14 a&#241;os deben registrar
        sus datos antes del alojamiento. Por favor, completa el formulario antes de tu llegada.
      </p>
      <table role="presentation" width="100%"><tr><td align="center">
        <a href="${formUrl}" style="display:inline-block;padding:14px 32px;background:#2C2C2C;color:#FFF;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:2px;letter-spacing:1px;">
          Completar registro
        </a>
      </td></tr></table>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#999;text-align:center;">
        Este enlace es personal, intransferible y caduca el d&#237;a de tu llegada.
      </p>
    </div>
    ${detailsTable(data)}
    <p style="margin:24px 0 0;font-size:13px;color:#888;font-family:Arial,sans-serif;line-height:1.6;">
      &#161;Nos vemos pronto en Casa Caldereta!
    </p>`,
  );
}

function guestPaymentConfirmedHtml(data: ITemplateData, invoiceUrl?: string): string {
  const { booking, checkIn, checkOut } = data;
  const depositFmt   = booking.depositAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const remainingFmt = booking.remainingAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 });
  const totalFmt     = booking.totalPrice.toLocaleString('es-ES',     { minimumFractionDigits: 2 });

  const invoiceBtn = invoiceUrl
    ? `<table role="presentation" width="100%"><tr><td align="center" style="padding:28px 0 0;">
        <a href="${invoiceUrl}" style="display:inline-block;padding:12px 28px;background:#2C2C2C;color:#FFF;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;text-decoration:none;border-radius:2px;letter-spacing:2px;text-transform:uppercase;">
          Ver comprobante del dep&oacute;sito
        </a>
       </td></tr></table>
       <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#AAA;text-align:center;">
         Disponible para descargar en PDF desde la p&aacute;gina del comprobante.
       </p>`
    : '';

  return emailWrapper(
    'Reserva confirmada — depósito recibido',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">&#10003; Dep&oacute;sito recibido &mdash; Reserva confirmada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Hemos recibido el dep&oacute;sito del 50&nbsp;%
      y tu reserva en <strong>Casa Caldereta</strong> est&aacute; confirmada.
    </p>
    ${detailsTable({ booking, checkIn, checkOut })}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid #F0EDE8;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Dep&oacute;sito abonado ahora</td>
        <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#2C2C2C;text-align:right;">${depositFmt}&nbsp;&euro;</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Segundo pago (7&nbsp;d&iacute;as antes del check-in)</td>
        <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:13px;color:#888;text-align:right;">${remainingFmt}&nbsp;&euro;</td>
      </tr>
    </table>
    <div style="margin-top:12px;padding:10px 14px;background:#F0FDF4;border-left:3px solid #22C55E;font-family:Arial,sans-serif;font-size:12px;color:#166534;">
      Recibir&aacute;s un email 7&nbsp;d&iacute;as antes de tu llegada con el enlace para abonar los ${remainingFmt}&nbsp;&euro; restantes.
      Importe total de la estancia: <strong>${totalFmt}&nbsp;&euro;</strong>.
    </div>
    ${invoiceBtn}`,
  );
}

function guestFullyPaidHtml(data: ITemplateData, invoiceUrl?: string): string {
  const { booking, checkIn, checkOut } = data;
  const totalFmt = booking.totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 });

  const invoiceBtn = invoiceUrl
    ? `<table role="presentation" width="100%"><tr><td align="center" style="padding:28px 0 0;">
        <a href="${invoiceUrl}" style="display:inline-block;padding:12px 28px;background:#2C2C2C;color:#FFF;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;text-decoration:none;border-radius:2px;letter-spacing:2px;text-transform:uppercase;">
          Ver comprobante de pago completo
        </a>
       </td></tr></table>
       <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#AAA;text-align:center;">
         Disponible para descargar en PDF desde la p&aacute;gina del comprobante.
       </p>`
    : '';

  return emailWrapper(
    'Reserva completamente abonada',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">&#10003; Pago completo &mdash; &#161;Todo listo!</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Hemos recibido el segundo pago.
      Tu estancia en <strong>Casa Caldereta</strong> est&aacute; completamente confirmada y abonada (${totalFmt}&nbsp;&euro;).
      &#161;Nos vemos pronto!
    </p>
    ${detailsTable({ booking, checkIn, checkOut })}
    <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.7;">
      Recibir&aacute;s el email de pre-llegada con instrucciones y el formulario de registro de viajeros unos d&iacute;as antes de tu check-in.
    </p>
    ${invoiceBtn}`,
  );
}

function guestStatusUpdateHtml(data: IStatusTemplateData): string {
  const { booking, newStatus } = data;

  if (newStatus === 'confirmed') {
    return emailWrapper(
      'Reserva confirmada',
      `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">&#10003; Reserva confirmada</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
        Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Nos complace confirmarte que tu reserva en
        <strong>Casa Caldereta</strong> est&#225; confirmada. &#161;Te esperamos con los brazos abiertos!
      </p>
      ${detailsTable(data)}
      <div style="margin-top:28px;padding:20px;background:#F9F7F4;border-top:2px solid #C9A96E;text-align:center;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#555;line-height:1.6;">
          Casa Caldereta &middot; Aielo de Rugat, Valencia<br>
          Si tienes alguna duda, no dudes en contactarnos.
        </p>
      </div>`,
    );
  }

  return emailWrapper(
    'Reserva cancelada',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">Reserva cancelada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Lamentamos informarte de que tu reserva en
      <strong>Casa Caldereta</strong> ha sido cancelada. Si tienes alguna pregunta al respecto,
      por favor con&#769;tactanos.
    </p>
    ${detailsTable(data)}
    <p style="margin:20px 0 0;font-size:13px;color:#888;font-family:Arial,sans-serif;line-height:1.6;">
      Esperamos tener la oportunidad de recibirte en Casa Caldereta en otra ocasi&#243;n.
    </p>`,
  );
}

function ownerCheckinFormSubmittedHtml(booking: IBookingDocument, travelers: ICheckinTraveler[]): string {
  const guestName = escapeHtml(booking.guestName);
  const checkIn   = formatDate(booking.checkIn);
  const checkOut  = formatDate(booking.checkOut);

  const td  = (val: string) =>
    `<td style="padding:8px 10px;font-family:Arial,sans-serif;font-size:12px;color:#555;border-bottom:1px solid #F0EDE8;vertical-align:top;">${val}</td>`;
  const tdLabel = (val: string) =>
    `<td style="padding:8px 10px;font-family:Arial,sans-serif;font-size:11px;color:#888;border-bottom:1px solid #F0EDE8;white-space:nowrap;vertical-align:top;">${val}</td>`;

  const travelersBlocks = travelers.map((t, i) => {
    const fechaNac  = new Date(t.fechaNacimiento).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const nombre    = `${escapeHtml(t.apellido1)} ${escapeHtml(t.apellido2)}, ${escapeHtml(t.nombre)}`;
    const bg        = i % 2 === 0 ? '#FFF' : '#F9F7F4';
    return `
    <tr style="background:#2C2C2C;">
      <td colspan="4" style="padding:8px 12px;font-family:Arial,sans-serif;font-size:11px;color:#C9A96E;letter-spacing:1px;font-weight:400;">
        VIAJERO ${i + 1}
      </td>
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Apellidos, Nombre')}${td(escapeHtml(nombre))}
      ${tdLabel('Fecha nacimiento')}${td(fechaNac)}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Tipo documento')}${td(escapeHtml(t.tipoDocumento))}
      ${tdLabel('N&#186; documento')}${td(escapeHtml(t.numDocumento))}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('N&#186; soporte')}${td(escapeHtml(t.numSoporte))}
      ${tdLabel('Sexo')}${td(escapeHtml(t.sexo === 'H' ? 'Hombre' : t.sexo === 'M' ? 'Mujer' : 'No indicado'))}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Parentesco')}${td(escapeHtml(t.parentesco ?? 'No indicado'))}
      ${tdLabel('Nacionalidad')}${td(escapeHtml(t.pais))}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Pa&#237;s residencia')}${td(escapeHtml(t.paisResidencia))}
      ${tdLabel('Ciudad residencia')}${td(escapeHtml(t.ciudadResidencia))}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Direcci&#243;n')}${td(escapeHtml(t.direccionResidencia))}
      ${tdLabel('C&#243;digo postal')}${td(escapeHtml(t.codigoPostal))}
    </tr>
    <tr style="background:${bg};">
      ${tdLabel('Tel&#233;fono / Email')}${td(escapeHtml(t.contacto))}
      <td></td><td></td>
    </tr>
    <tr><td colspan="4" style="padding:4px 0;"></td></tr>`;
  }).join('');

  return emailWrapper(
    'Formulario de viajeros recibido',
    `<h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2C2C2C;">Formulario de viajeros completado</h2>
    <p style="margin:0 0 24px;font-size:12px;color:#999;font-family:Arial,sans-serif;">Recibido el ${formatDateTime()}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#2C2C2C;font-family:Arial,sans-serif;">
      <strong>${guestName}</strong> ha completado el registro de viajeros para la reserva
      del <strong>${checkIn}</strong> al <strong>${checkOut}</strong>.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#888;font-family:Arial,sans-serif;">
      ${travelers.length} viajero${travelers.length === 1 ? '' : 's'} registrado${travelers.length === 1 ? '' : 's'} &mdash; RD 933/2021.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E8E4DC;border-collapse:collapse;">
      <tbody>
        ${travelersBlocks}
      </tbody>
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#F9F7F4;border-left:3px solid #C9A96E;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#555;line-height:1.6;">
        Los datos quedan registrados en el sistema. Puedes consultarlos en el panel de administraci&#243;n
        desde <strong>Reservas</strong> &rarr; bot&#243;n <strong>Ver viajeros</strong>.
      </p>
    </div>`,
  );
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

class EmailService {
  private readonly client: Resend | null;

  constructor() {
    this.client = env.resendApiKey ? new Resend(env.resendApiKey) : null;

    if (!this.client) {
      console.info('[email] RESEND_API_KEY no configurada — notificaciones por email desactivadas');
    }
  }

  async notifyOwnerNewBooking(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Nueva solicitud de reserva — ${booking.guestName}`,
      html:    ownerNewBookingHtml({ booking, checkIn, checkOut }),
      text:    [
        `Nueva reserva de ${booking.guestName}.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Huéspedes: ${booking.guests} | Total: ${booking.totalPrice} €`,
        booking.notes ? `Notas: ${booking.notes}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  async sendGuestBookingReceived(booking: IBookingDocument): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);
    const guests   = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;

    await this.send({
      to:      booking.guestEmail,
      subject: 'Hemos recibido tu solicitud de reserva — Casa Caldereta',
      html:    guestBookingReceivedHtml({ booking, checkIn, checkOut }),
      text:    `Hola ${booking.guestName}, hemos recibido tu solicitud para Casa Caldereta del ${checkIn} al ${checkOut} (${guests}). Importe estimado: ${booking.totalPrice} €. Nos pondremos en contacto contigo en breve.`,
    });
  }

  async notifyOwnerPaymentReceived(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Depósito recibido — ${booking.guestName} · ${checkIn}`,
      html:    ownerPaymentReceivedHtml({ booking, checkIn, checkOut }),
      text:    [
        `Depósito (50 %) confirmado de ${booking.guestName}.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Huéspedes: ${booking.guests}`,
        `Depósito: ${booking.depositAmount} € | Restante: ${booking.remainingAmount} € | Total: ${booking.totalPrice} €`,
        booking.notes ? `Notas: ${booking.notes}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  async notifyOwnerRemainingPaymentReceived(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Pago completo recibido — ${booking.guestName} · ${checkIn}`,
      html:    ownerPaymentReceivedHtml(
        { booking, checkIn, checkOut },
        'Segundo pago recibido &mdash; Estancia completamente abonada',
      ),
      text:    [
        `Segundo pago (50 %) confirmado de ${booking.guestName}.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Total abonado: ${booking.totalPrice} €`,
      ].join('\n'),
    });
  }

  async sendGuestPaymentConfirmed(booking: IBookingDocument, invoiceUrl?: string): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);
    const guests   = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;

    await this.send({
      to:      booking.guestEmail,
      subject: 'Reserva confirmada — Casa Caldereta',
      html:    guestPaymentConfirmedHtml({ booking, checkIn, checkOut }, invoiceUrl),
      text:    [
        `Hola ${booking.guestName}, tu reserva en Casa Caldereta del ${checkIn} al ${checkOut} (${guests}) está confirmada.`,
        `Depósito abonado: ${booking.depositAmount} €.`,
        `Segundo pago (${booking.remainingAmount} €): recibirás el enlace 7 días antes de tu llegada.`,
        invoiceUrl ? `Comprobante de pago: ${invoiceUrl}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  async sendPreArrivalEmail(
    booking: IBookingDocument,
    formUrl: string,
    checkInTime: string,
    checkOutTime: string,
  ): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      booking.guestEmail,
      subject: `Preparativos para tu estancia — Casa Caldereta · ${checkIn}`,
      html:    guestPreArrivalHtml({ booking, checkIn, checkOut, formUrl, checkInTime, checkOutTime }),
      text:    `Hola ${booking.guestName}, tu estancia en Casa Caldereta comienza el ${checkIn}. Hora de entrada: ${checkInTime} h. Completa el registro obligatorio de viajeros antes de tu llegada: ${formUrl} — El enlace caduca el día de tu llegada.`,
    });
  }

  async sendGuestRefundCancellation(booking: IBookingDocument, amount: number): Promise<void> {
    if (!this.client) return;

    const checkIn      = formatDate(booking.checkIn);
    const checkOut      = formatDate(booking.checkOut);
    const isFullRefund = Math.round(amount * 100) === Math.round(booking.totalPrice * 100);
    const amountText   = isFullRefund
      ? `el importe de ${amount.toFixed(2)} € ha sido reembolsado íntegramente`
      : `se ha reembolsado ${amount.toFixed(2)} € de los ${booking.totalPrice.toFixed(2)} € abonados`;

    await this.send({
      to:      booking.guestEmail,
      subject: 'Reserva cancelada y reembolso procesado — Casa Caldereta',
      html:    guestRefundCancellationHtml({ booking, checkIn, checkOut, amount }),
      text:    `Hola ${booking.guestName}, tu reserva del ${checkIn} al ${checkOut} ha sido cancelada y ${amountText}. El reembolso puede tardar entre 5 y 10 días hábiles.`,
    });
  }

  // Aviso al propietario cuando el webhook reembolsa automáticamente un pago que no se pudo
  // confirmar (las fechas ya no estaban disponibles al llegar el pago tardío de Stripe).
  async notifyOwnerAutoRefund(booking: IBookingDocument, amount: number, reason: string): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Pago reembolsado automáticamente — ${booking.guestName} · ${checkIn}`,
      html:    [
        '<p>Un pago llegó tarde y las fechas ya no estaban disponibles, así que se ha',
        ' cancelado la reserva y reembolsado el importe automáticamente.</p>',
        `<p><strong>Motivo:</strong> ${reason}</p>`,
        '<ul>',
        `<li>Huésped: ${booking.guestName} (${booking.guestEmail} · ${booking.guestPhone})</li>`,
        `<li>Entrada: ${checkIn} · Salida: ${checkOut}</li>`,
        `<li>Reembolsado: ${amount.toFixed(2)} €</li>`,
        '</ul>',
        '<p>Verifica el reembolso en el panel de Stripe.</p>',
      ].join(''),
      text:    [
        'Pago reembolsado automáticamente (fechas no disponibles al confirmar).',
        `Motivo: ${reason}`,
        `Huésped: ${booking.guestName} (${booking.guestEmail} · ${booking.guestPhone})`,
        `Entrada: ${checkIn} · Salida: ${checkOut}`,
        `Reembolsado: ${amount.toFixed(2)} €`,
      ].join('\n'),
    });
  }

  // ─── Anulaciones — aviso al propietario ──────────────────────────────────────

  async notifyOwnerBookingDeleted(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Reserva eliminada — ${booking.guestName}`,
      html:    ownerCancellationHtml({ booking, checkIn, checkOut, reason: 'deleted' }),
      text:    [
        `Has eliminado la reserva de ${booking.guestName}.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
      ].join('\n'),
    });
  }

  async notifyOwnerRefundProcessed(booking: IBookingDocument, amount: number): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Reembolso procesado — ${booking.guestName}`,
      html:    ownerCancellationHtml({ booking, checkIn, checkOut, reason: 'refunded', amount }),
      text:    [
        `Has reembolsado ${amount.toFixed(2)} € a ${booking.guestName} — reserva cancelada.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
      ].join('\n'),
    });
  }

  async notifyOwnerBookingCancelled(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Reserva cancelada — ${booking.guestName}`,
      html:    ownerCancellationHtml({ booking, checkIn, checkOut, reason: 'admin_cancelled' }),
      text:    [
        `Has cancelado la reserva de ${booking.guestName} (sin reembolso).`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
      ].join('\n'),
    });
  }

  async notifyOwnerGuestCancelledPending(booking: IBookingDocument): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Solicitud pendiente cancelada por el huésped — ${booking.guestName}`,
      html:    ownerCancellationHtml({ booking, checkIn, checkOut, reason: 'guest_cancelled_pending' }),
      text:    [
        `${booking.guestName} ha cancelado su solicitud antes de completar el pago.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
      ].join('\n'),
    });
  }

  async sendGuestStatusUpdate(booking: IBookingDocument, newStatus: BookingStatus): Promise<void> {
    if (!this.client) return;
    if (newStatus !== 'confirmed' && newStatus !== 'cancelled') return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    const subject = newStatus === 'confirmed'
      ? 'Tu reserva en Casa Caldereta está confirmada'
      : 'Tu reserva en Casa Caldereta ha sido cancelada';

    const text = newStatus === 'confirmed'
      ? `Hola ${booking.guestName}, tu reserva del ${checkIn} al ${checkOut} está confirmada. ¡Te esperamos!`
      : `Hola ${booking.guestName}, tu reserva del ${checkIn} al ${checkOut} ha sido cancelada. Contáctanos si tienes alguna duda.`;

    await this.send({
      to:      booking.guestEmail,
      subject,
      html:    guestStatusUpdateHtml({ booking, checkIn, checkOut, newStatus }),
      text,
    });
  }

  async notifyOwnerCheckinFormSubmitted(
    booking: IBookingDocument,
    travelers: ICheckinTraveler[],
  ): Promise<void> {
    if (!this.client || !env.ownerEmail) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      env.ownerEmail,
      subject: `Viajeros registrados — ${booking.guestName} · ${checkIn}`,
      html:    ownerCheckinFormSubmittedHtml(booking, travelers),
      text:    [
        `${booking.guestName} ha completado el registro de viajeros (RD 933/2021).`,
        `Reserva: ${checkIn} al ${checkOut} · ${booking.guests} huéspedes.`,
        `Viajeros registrados: ${travelers.length}.`,
        `Consulta los detalles en el panel de administración → Reservas → Ver viajeros.`,
      ].join('\n'),
    });
  }

  // ─── Segundo pago — recordatorio (7 días antes del check-in) ────────────────

  async sendRemainingPaymentReminder(booking: IBookingDocument, paymentUrl: string): Promise<void> {
    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);
    const amount   = booking.remainingAmount.toLocaleString('es-ES');

    const msPerDay         = 1000 * 60 * 60 * 24;
    const daysUntilCheckin = Math.floor(
      (new Date(booking.checkIn).getTime() - Date.now()) / msPerDay,
    );
    const arrivalLabel = daysUntilCheckin <= 0
      ? 'Tu llegada es hoy'
      : daysUntilCheckin === 1
        ? 'Falta 1 día para tu llegada'
        : `Faltan ${daysUntilCheckin} días para tu llegada`;

    await this.send({
      to:      booking.guestEmail,
      subject: `Casa Caldereta — Pago pendiente: ${amount} € antes de tu llegada`,
      html: emailWrapper('Pago pendiente — Casa Caldereta', `
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:400;color:#2C2C2C;letter-spacing:1px;">
          ${arrivalLabel}
        </h2>
        <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:14px;color:#666;line-height:1.7;">
          Hola, ${escapeHtml(booking.guestName)}. Tu reserva en Casa Caldereta se acerca.
          Para completar la reserva debes abonar el pago restante antes de tu llegada.
        </p>
        ${detailsTable({ booking, checkIn, checkOut })}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-top:1px solid #F0EDE8;">
          <tr>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Ya pagado (dep&#243;sito)</td>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${booking.depositAmount.toLocaleString('es-ES')} &#8364;</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Pendiente de pago</td>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#C9A96E;">${amount} &#8364;</td>
          </tr>
        </table>
        <div style="text-align:center;margin-top:28px;">
          <a href="${paymentUrl}" style="display:inline-block;background:#2C2C2C;color:#FFF;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
            Completar pago
          </a>
        </div>
        <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#AAA;text-align:center;line-height:1.6;">
          Este enlace caduca en 24 horas.<br>
          Si tienes alguna duda, escr&#237;benos a casacaldereta@gmail.com.
        </p>
      `),
      text: [
        `Hola, ${booking.guestName}.`,
        `${arrivalLabel} a Casa Caldereta.`,
        ``,
        `PAGO PENDIENTE: ${amount} €`,
        `Enlace de pago: ${paymentUrl}`,
        ``,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Huéspedes: ${booking.guests}`,
      ].join('\n'),
    });
  }

  // ─── Segundo pago — confirmación ─────────────────────────────────────────────

  async sendGuestRemainingPaymentConfirmed(booking: IBookingDocument, invoiceUrl?: string): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);
    const guests   = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;

    await this.send({
      to:      booking.guestEmail,
      subject: 'Casa Caldereta — Pago completo ✓',
      html:    guestFullyPaidHtml({ booking, checkIn, checkOut }, invoiceUrl),
      text:    [
        `Hola, ${booking.guestName}.`,
        `Pago completo. Tu reserva del ${checkIn} al ${checkOut} (${guests}) está totalmente abonada.`,
        `Total: ${booking.totalPrice.toLocaleString('es-ES')} €`,
        invoiceUrl ? `Comprobante de pago: ${invoiceUrl}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  // ─── Check-in automático — email de bienvenida ───────────────────────────────

  async sendGuestAutoCheckinWelcome(booking: IBookingDocument, checkOutTime: string): Promise<void> {
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      booking.guestEmail,
      subject: '¡Bienvenido/a a Casa Caldereta!',
      html: emailWrapper('¡Bienvenido/a! — Casa Caldereta', `
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:400;color:#2C2C2C;letter-spacing:1px;">
          &#161;Bienvenido/a a Casa Caldereta!
        </h2>
        <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:14px;color:#666;line-height:1.7;">
          Hola, ${escapeHtml(booking.guestName)}. Esperamos que disfrutes al m&#225;ximo de tu estancia.
          Estamos a tu disposici&#243;n en casacaldereta@gmail.com si necesitas cualquier cosa.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;border-top:1px solid #F0EDE8;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:12px;color:#999;">Check-out</td>
            <td style="padding:10px 0;border-bottom:1px solid #F0EDE8;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${checkOut} antes de las ${checkOutTime} h</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:12px;color:#999;">Hu&#233;spedes</td>
            <td style="padding:10px 0;font-family:Arial,sans-serif;font-size:13px;color:#2C2C2C;">${booking.guests} persona${booking.guests === 1 ? '' : 's'}</td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.7;">
          Recuerda dejar el alojamiento en el mismo estado en que lo encontraste.
          &#161;Gracias por elegir Casa Caldereta!
        </p>
      `),
      text: [
        `¡Bienvenido/a a Casa Caldereta, ${booking.guestName}!`,
        ``,
        `Check-out: ${checkOut} antes de las ${checkOutTime} h`,
        `Contacto: casacaldereta@gmail.com`,
      ].join('\n'),
    });
  }

  private async send(options: ISendOptions): Promise<void> {
    if (!this.client) return;

    try {
      const recipient = env.resendOverrideTo || options.to;
      const subject   = env.resendOverrideTo && env.resendOverrideTo !== options.to
        ? `[→ ${options.to}] ${options.subject}`
        : options.subject;

      const { error } = await this.client.emails.send({
        from:    env.resendFromEmail,
        to:      [recipient],
        subject,
        html:    options.html,
        text:    options.text,
      });

      if (error) {
        console.error(`[email] Error al enviar a ${options.to}: ${error.message}`);
        return;
      }

      console.info(`[email] Enviado a ${options.to} — "${options.subject}"`);
    } catch (err) {
      console.error('[email] Excepción inesperada:', err instanceof Error ? err.message : String(err));
    }
  }
}

export const emailService = new EmailService();
