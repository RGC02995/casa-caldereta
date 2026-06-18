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

interface IPreArrivalTemplateData extends ITemplateData {
  readonly formUrl:      string;
  readonly checkInTime:  string;
  readonly checkOutTime: string;
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

function ownerPaymentReceivedHtml(data: ITemplateData): string {
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
    'Pago recibido — reserva confirmada',
    `<h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2C2C2C;">&#10003; Pago recibido — Reserva confirmada</h2>
    <p style="margin:0 0 24px;font-size:12px;color:#999;font-family:Arial,sans-serif;">Confirmada el ${formatDateTime()}</p>
    <p style="margin:0 0 4px;font-size:16px;color:#2C2C2C;"><strong>${guestName}</strong></p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">
      <a href="mailto:${guestEmail}" style="color:#C9A96E;text-decoration:none;">${guestEmail}</a>
    </p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#666;">${guestPhone}</p>
    <div style="margin-top:12px;padding:10px 14px;background:#F0FDF4;border-left:3px solid #22C55E;font-family:Arial,sans-serif;font-size:12px;color:#166534;">
      El pago ha sido procesado autom&#225;ticamente por Stripe. No es necesaria ninguna acci&#243;n adicional.
    </div>
    ${detailsTable(data)}
    ${notesBlock}`,
  );
}

function guestRefundCancellationHtml(data: ITemplateData): string {
  const { booking } = data;
  return emailWrapper(
    'Reserva cancelada y reembolso procesado',
    `<h2 style="margin:0 0 16px;font-size:20px;font-weight:400;color:#2C2C2C;">Reserva cancelada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.7;">
      Hola, <strong>${escapeHtml(booking.guestName)}</strong>. Tu reserva en <strong>Casa Caldereta</strong> ha sido cancelada
      y el importe abonado ha sido reembolsado &#237;ntegramente. El reembolso puede tardar entre 5 y 10 d&#237;as h&#225;biles
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
      subject: `Pago recibido — ${booking.guestName} · ${checkIn}`,
      html:    ownerPaymentReceivedHtml({ booking, checkIn, checkOut }),
      text:    [
        `Pago confirmado de ${booking.guestName}.`,
        `Email: ${booking.guestEmail} | Tel: ${booking.guestPhone}`,
        `Check-in: ${checkIn}`,
        `Check-out: ${checkOut}`,
        `Huéspedes: ${booking.guests} | Total pagado: ${booking.totalPrice} €`,
        booking.notes ? `Notas: ${booking.notes}` : '',
      ].filter(Boolean).join('\n'),
    });
  }

  async sendGuestPaymentConfirmed(booking: IBookingDocument): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);
    const guests   = `${booking.guests} persona${booking.guests === 1 ? '' : 's'}`;

    await this.send({
      to:      booking.guestEmail,
      subject: 'Reserva confirmada — Casa Caldereta',
      html:    guestStatusUpdateHtml({ booking, checkIn, checkOut, newStatus: 'confirmed' }),
      text:    `Hola ${booking.guestName}, tu reserva en Casa Caldereta del ${checkIn} al ${checkOut} (${guests}) está confirmada. El importe de ${booking.totalPrice} € ha sido procesado. ¡Te esperamos!`,
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

  async sendGuestRefundCancellation(booking: IBookingDocument): Promise<void> {
    if (!this.client) return;

    const checkIn  = formatDate(booking.checkIn);
    const checkOut = formatDate(booking.checkOut);

    await this.send({
      to:      booking.guestEmail,
      subject: 'Reserva cancelada y reembolso procesado — Casa Caldereta',
      html:    guestRefundCancellationHtml({ booking, checkIn, checkOut }),
      text:    `Hola ${booking.guestName}, tu reserva del ${checkIn} al ${checkOut} ha sido cancelada y el importe de ${booking.totalPrice} € ha sido reembolsado. El reembolso puede tardar entre 5 y 10 días hábiles.`,
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
