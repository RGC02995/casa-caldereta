import { randomBytes, createHash } from 'crypto';
import { BookingModel, IBookingDocument } from '../models/booking.model';
import { CheckinSettingsModel, ICheckinSettingsDocument } from '../models/checkin-settings.model';
import { TravelerDocumentModel, ITravelerDocumentDoc } from '../models/traveler-document.model';
import { withId } from '../utils/mongoose.util';
import { isValidDni, isValidContact } from '../utils/traveler-validation.util';
import { emailService } from './email.service';
import { bookingService, IRemainingPaymentSessionResult } from './booking.service';
import { env } from '../config/environment';

const DAYS_BEFORE_CHECKIN            = 2;
const DAYS_BEFORE_REMAINING_PAYMENT  = 7;
const DAYS_SECOND_REMAINING_REMINDER = 3;
const DAYS_FINAL_REMAINING_REMINDER  = 1;

export interface ICheckinFormInfo {
  bookingId:        string;
  guestName:        string;
  checkIn:          Date;
  checkOut:         Date;
  guests:           number;
  checkInTime:      string;
  checkOutTime:     string;
  alreadySubmitted: boolean;
}

export interface ITravelerInput {
  tipoDocumento:       string;
  numDocumento:        string;
  numSoporte:          string;
  apellido1:           string;
  apellido2:           string;
  nombre:              string;
  sexo?:               string;
  fechaNacimiento:     string;
  parentesco?:         string;
  pais:                string;
  paisResidencia:      string;
  ciudadResidencia:    string;
  direccionResidencia: string;
  codigoPostal:        string;
  contacto:            string;
}

export interface ITodayActivity {
  checkIns:  IBookingDocument[];
  checkOuts: IBookingDocument[];
}

class CheckinService {

  // ─── Token ────────────────────────────────────────────────────────────────────

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  // Admin: genera token seguro, lo guarda hashed en la reserva y envía email al huésped
  async generateAndSendFormToken(bookingId: string): Promise<void> {
    const booking = await BookingModel.findById(bookingId).lean<IBookingDocument>();
    if (!booking) throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });
    if (booking.status !== 'confirmed') {
      throw Object.assign(new Error('Solo se puede enviar el formulario a reservas confirmadas'), { code: 'INVALID_STATUS' });
    }

    // 256 bits de entropía — imposible de adivinar
    const rawToken    = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);

    // El token expira el mismo día del check-in a las 23:59:59
    const expiresAt = new Date(booking.checkIn);
    expiresAt.setHours(23, 59, 59, 999);

    const settings = await this.getSettings();
    const formUrl  = `${env.frontendUrl}/checkin/${rawToken}`;

    // Email primero — si falla, no se escribe nada en BD y el cron reintenta al día siguiente
    // El rawToken nunca se almacena, solo se envía por email
    await emailService.sendPreArrivalEmail(
      withId(booking),
      formUrl,
      settings.checkInTime,
      settings.checkOutTime,
    );

    // Una sola escritura tras el email exitoso: token + preArrivalEmailSentAt juntos
    await BookingModel.findByIdAndUpdate(bookingId, {
      guestFormToken:          hashedToken,
      guestFormTokenExpiresAt: expiresAt,
      guestFormSubmittedAt:    null,  // reset si se reenvía
      preArrivalEmailSentAt:   new Date(),
    });
  }

  // Público: valida el token del huésped; devuelve info de la reserva sin datos sensibles
  async validateToken(rawToken: string): Promise<ICheckinFormInfo | null> {
    const hashedToken = this.hashToken(rawToken);

    const booking = await BookingModel
      .findOne({ guestFormToken: hashedToken })
      .select('+guestFormToken')  // select:false por defecto — necesitamos el campo para filtrar
      .lean<IBookingDocument>();

    if (!booking) return null;
    if (!booking.guestFormTokenExpiresAt || new Date() > booking.guestFormTokenExpiresAt) return null;

    const settings = await this.getSettings();

    return {
      bookingId:        String(booking._id),
      guestName:        booking.guestName,
      checkIn:          booking.checkIn,
      checkOut:         booking.checkOut,
      guests:           booking.guests,
      checkInTime:      settings.checkInTime,
      checkOutTime:     settings.checkOutTime,
      alreadySubmitted: !!booking.guestFormSubmittedAt,
    };
  }

  // Público: envía el formulario de viajeros — un solo intento por token
  async submitGuestForm(rawToken: string, travelers: ITravelerInput[]): Promise<void> {
    const hashedToken = this.hashToken(rawToken);

    const booking = await BookingModel
      .findOne({ guestFormToken: hashedToken })
      .select('+guestFormToken')
      .lean<IBookingDocument>();

    if (!booking) {
      throw Object.assign(new Error('Enlace no válido o expirado'), { code: 'INVALID_TOKEN' });
    }
    if (!booking.guestFormTokenExpiresAt || new Date() > booking.guestFormTokenExpiresAt) {
      throw Object.assign(new Error('Enlace no válido o expirado'), { code: 'INVALID_TOKEN' });
    }
    if (booking.guestFormSubmittedAt) {
      throw Object.assign(new Error('El formulario ya fue enviado'), { code: 'ALREADY_SUBMITTED' });
    }
    if (!travelers || travelers.length === 0) {
      throw Object.assign(new Error('Debes registrar al menos un viajero'), { code: 'VALIDATION' });
    }
    if (travelers.length > booking.guests) {
      throw Object.assign(new Error('El número de viajeros supera los declarados en la reserva'), { code: 'VALIDATION' });
    }

    for (let i = 0; i < travelers.length; i++) {
      const traveler        = travelers[i]!;
      const prefix          = `Viajero ${i + 1}`;
      const fechaNacimiento = new Date(traveler.fechaNacimiento);

      if (Number.isNaN(fechaNacimiento.getTime())) {
        throw Object.assign(new Error(`${prefix}: la fecha de nacimiento no es válida`), { code: 'VALIDATION' });
      }
      if (fechaNacimiento > new Date()) {
        throw Object.assign(new Error(`${prefix}: la fecha de nacimiento no puede ser una fecha futura`), { code: 'VALIDATION' });
      }
      if (traveler.tipoDocumento === 'DNI') {
        if (!isValidDni(traveler.numDocumento)) {
          throw Object.assign(new Error(`${prefix}: el formato del DNI no es válido`), { code: 'VALIDATION' });
        }
        // Normalizado sin espacios/guion antes de guardar — el formulario admite "12345678-Z"
        traveler.numDocumento = traveler.numDocumento.trim().replace(/[\s-]/g, '');
      }
      if (!isValidContact(traveler.contacto)) {
        throw Object.assign(new Error(`${prefix}: el teléfono o correo electrónico no tiene un formato válido`), { code: 'VALIDATION' });
      }
    }

    const travelerDocs = travelers.map(travelerInput => ({
      bookingId:           booking._id,
      tipoDocumento:       travelerInput.tipoDocumento,
      numDocumento:        travelerInput.numDocumento,
      numSoporte:          travelerInput.numSoporte,
      apellido1:           travelerInput.apellido1,
      apellido2:           travelerInput.apellido2,
      nombre:              travelerInput.nombre,
      sexo:                travelerInput.sexo?.trim() || undefined,
      fechaNacimiento:     new Date(travelerInput.fechaNacimiento),
      parentesco:          travelerInput.parentesco?.trim() || undefined,
      pais:                travelerInput.pais,
      paisResidencia:      travelerInput.paisResidencia,
      ciudadResidencia:    travelerInput.ciudadResidencia,
      direccionResidencia: travelerInput.direccionResidencia,
      codigoPostal:        travelerInput.codigoPostal,
      contacto:            travelerInput.contacto,
      fechaEntrada:        booking.checkIn,
    }));

    await TravelerDocumentModel.insertMany(travelerDocs);

    // Marcar como enviado e invalidar el token (no se puede volver a usar)
    await BookingModel.findByIdAndUpdate(booking._id, {
      guestFormSubmittedAt: new Date(),
      guestFormToken:       null,
    });

    // Notificar al propietario con la lista de viajeros — fire-and-forget
    void emailService.notifyOwnerCheckinFormSubmitted(withId(booking), travelers);
  }

  // ─── Admin: Check-in / Check-out ─────────────────────────────────────────────

  async recordCheckIn(bookingId: string): Promise<IBookingDocument> {
    const booking = await BookingModel.findById(bookingId).lean<IBookingDocument>();
    if (!booking) throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });

    const updated = await BookingModel.findByIdAndUpdate(
      bookingId,
      { checkedInAt: new Date() },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return withId(updated!);
  }

  async recordCheckOut(bookingId: string): Promise<IBookingDocument> {
    const booking = await BookingModel.findById(bookingId).lean<IBookingDocument>();
    if (!booking) throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });

    const updated = await BookingModel.findByIdAndUpdate(
      bookingId,
      { checkedOutAt: new Date(), status: 'completed' },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return withId(updated!);
  }

  async getTravelers(bookingId: string): Promise<ITravelerDocumentDoc[]> {
    const docs = await TravelerDocumentModel.find({ bookingId }).lean<ITravelerDocumentDoc[]>();
    return docs.map(withId);
  }

  // Admin: reservas con check-in o check-out hoy
  async getTodayActivity(): Promise<ITodayActivity> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [checkIns, checkOuts] = await Promise.all([
      BookingModel.find({
        checkIn: { $gte: today, $lt: tomorrow },
        status:  { $in: ['confirmed', 'completed'] },
      }).lean<IBookingDocument[]>(),
      BookingModel.find({
        checkOut: { $gte: today, $lt: tomorrow },
        status:   { $in: ['confirmed', 'completed'] },
      }).lean<IBookingDocument[]>(),
    ]);

    return {
      checkIns:  checkIns.map(withId),
      checkOuts: checkOuts.map(withId),
    };
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(): Promise<ICheckinSettingsDocument> {
    const settings = await CheckinSettingsModel.findOne().lean<ICheckinSettingsDocument>();
    if (settings) return withId(settings);

    // Primera vez: crear con valores por defecto
    const created  = new CheckinSettingsModel({ checkInTime: '16:00', checkOutTime: '11:00' });
    const savedDoc = await created.save();
    const result   = await CheckinSettingsModel.findById(savedDoc._id).lean<ICheckinSettingsDocument>();
    return withId(result!);
  }

  async updateSettings(checkInTime: string, checkOutTime: string): Promise<ICheckinSettingsDocument> {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(checkInTime) || !timeRegex.test(checkOutTime)) {
      throw Object.assign(new Error('Formato de hora no válido (HH:MM)'), { code: 'VALIDATION' });
    }

    const updated = await CheckinSettingsModel.findOneAndUpdate(
      {},
      { checkInTime, checkOutTime },
      { upsert: true, returnDocument: 'after', runValidators: true },
    ).lean<ICheckinSettingsDocument>();

    return withId(updated!);
  }

  // ─── Segundo pago: crear sesión + enviar email + marcar centinela ────────────
  // Punto único reutilizado por: el botón "Enviar/Reenviar segundo pago" del admin,
  // el aviso last-minute post-webhook y los crons de recordatorio (7d/3d/1d).
  // No comprueba si ya se había enviado antes — llamarlo de nuevo es un reenvío
  // intencional (createRemainingPaymentSession ya expira la sesión de Stripe anterior).

  async sendRemainingPaymentEmailNow(bookingId: string): Promise<IRemainingPaymentSessionResult> {
    const booking = await BookingModel.findById(bookingId).lean<IBookingDocument>();
    if (!booking) {
      throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });
    }

    const result = await bookingService.createRemainingPaymentSession(bookingId);
    await emailService.sendRemainingPaymentReminder(booking, result.sessionUrl);
    await BookingModel.findByIdAndUpdate(bookingId, { remainingPaymentEmailSentAt: new Date() });

    return result;
  }

  // ─── Webhook: comprobaciones post-confirmación ───────────────────────────────
  // Llamado desde el webhook de Stripe tras confirmar el depósito.
  // Envía el recordatorio del segundo pago y/o el formulario de viajeros si el
  // check-in está suficientemente próximo y los emails aún no se han enviado.
  // Usa los mismos centinelas que los crons para evitar duplicados.

  async handleWebhookPostConfirmation(booking: IBookingDocument): Promise<void> {
    const now              = new Date();
    const msPerDay         = 1000 * 60 * 60 * 24;
    const daysUntilCheckin = Math.floor(
      (new Date(booking.checkIn).getTime() - now.getTime()) / msPerDay,
    );

    // Segundo pago: check-in dentro de 7 días, aún sin pagar ni avisado
    if (
      daysUntilCheckin <= DAYS_BEFORE_REMAINING_PAYMENT &&
      !booking.remainingPaidAt &&
      !booking.remainingPaymentEmailSentAt
    ) {
      try {
        await this.sendRemainingPaymentEmailNow(String(booking._id));
        console.info(`[webhook] Email segundo pago enviado (last-minute) a ${booking.guestEmail}`);
      } catch (err) {
        console.error(
          `[webhook] Error enviando segundo pago last-minute para ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Formulario viajeros: check-in dentro de 2 días, aún no enviado
    if (daysUntilCheckin <= DAYS_BEFORE_CHECKIN && !booking.preArrivalEmailSentAt) {
      try {
        await this.generateAndSendFormToken(String(booking._id));
        console.info(`[webhook] Formulario pre-llegada enviado (last-minute) a ${booking.guestEmail}`);
      } catch (err) {
        console.error(
          `[webhook] Error formulario last-minute para ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  // ─── Cron: emails pre-llegada ─────────────────────────────────────────────────

  // Llamado cada día a las 09:00 desde server.ts — envía email a reservas confirmadas
  // con check-in en exactamente DAYS_BEFORE_CHECKIN días y sin email enviado aún
  async sendScheduledPreArrivalEmails(): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + DAYS_BEFORE_CHECKIN);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const bookings = await BookingModel.find({
      status:                'confirmed',
      checkIn:               { $gte: targetDate, $lt: nextDay },
      preArrivalEmailSentAt: null,
    }).lean<IBookingDocument[]>();

    for (const booking of bookings) {
      try {
        await this.generateAndSendFormToken(String(booking._id));
      } catch (err) {
        console.error(
          `[checkin-cron] Error sending pre-arrival email for booking ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (bookings.length > 0) {
      console.info(`[checkin-cron] ${bookings.length} email(s) pre-llegada enviados`);
    }
  }

  // ─── Cron: recordatorio segundo pago (7 días antes del check-in) ──────────────
  // La query busca TODAS las reservas confirmadas con check-in dentro de los
  // próximos 7 días (no solo exactamente en 7 días). Esto cubre reservas
  // de última hora confirmadas después de que el cron normal ya pasó.
  // Si el check-in está además a ≤ 2 días y el formulario no se envió,
  // lo envía también en el mismo ciclo.

  async sendScheduledRemainingPaymentEmails(): Promise<void> {
    const now       = new Date();
    const cutoff    = new Date(now);
    cutoff.setDate(cutoff.getDate() + DAYS_BEFORE_REMAINING_PAYMENT);
    cutoff.setHours(23, 59, 59, 999);

    const bookings = await BookingModel.find({
      status:                      'confirmed',
      checkIn:                     { $gte: now, $lte: cutoff },
      remainingPaidAt:             null,
      remainingPaymentEmailSentAt: null,
    }).lean<IBookingDocument[]>();

    for (const booking of bookings) {
      try {
        await this.sendRemainingPaymentEmailNow(String(booking._id));

        console.info(`[payment-cron] Email pago restante enviado a ${booking.guestEmail}`);

        // Si el check-in está a ≤ 2 días y el formulario de viajeros no se ha enviado,
        // enviarlo ahora (reserva last-minute, el cron de pre-llegada no lo alcanzará).
        const msPerDay         = 1000 * 60 * 60 * 24;
        const daysUntilCheckin = Math.floor((new Date(booking.checkIn).getTime() - now.getTime()) / msPerDay);

        if (daysUntilCheckin <= DAYS_BEFORE_CHECKIN && !booking.preArrivalEmailSentAt) {
          try {
            await this.generateAndSendFormToken(String(booking._id));
            console.info(`[payment-cron] Formulario pre-llegada enviado (last-minute) a ${booking.guestEmail}`);
          } catch (formErr) {
            console.error(
              `[payment-cron] Error enviando formulario last-minute para ${String(booking._id)}:`,
              formErr instanceof Error ? formErr.message : String(formErr),
            );
          }
        }
      } catch (err) {
        console.error(
          `[payment-cron] Error en reserva ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  // ─── Cron: recordatorios escalonados si sigue sin pagar (3 días y 1 día antes) ──
  // A diferencia del cron de 7 días (rango, cubre reservas last-minute), aquí basta
  // con el día exacto: toda reserva ya pasó por el primer aviso mucho antes de
  // llegar a estos dos. No se encadenan entre sí — cada uno tiene su propio
  // centinela y se dispara igual aunque el recordatorio anterior no se marcara.

  async sendSecondRemainingPaymentReminders(): Promise<void> {
    await this.sendRemainingPaymentReminderForDay(
      DAYS_SECOND_REMAINING_REMINDER,
      'remainingPaymentReminder3dSentAt',
      '[payment-cron-3d]',
    );
  }

  async sendFinalRemainingPaymentReminders(): Promise<void> {
    await this.sendRemainingPaymentReminderForDay(
      DAYS_FINAL_REMAINING_REMINDER,
      'remainingPaymentReminder1dSentAt',
      '[payment-cron-1d]',
    );
  }

  private async sendRemainingPaymentReminderForDay(
    daysBeforeCheckin: number,
    sentinelField:     'remainingPaymentReminder3dSentAt' | 'remainingPaymentReminder1dSentAt',
    logLabel:          string,
  ): Promise<void> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeCheckin);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const bookings = await BookingModel.find({
      status:           'confirmed',
      checkIn:          { $gte: targetDate, $lt: nextDay },
      remainingPaidAt:  null,
      [sentinelField]:  null,
    }).lean<IBookingDocument[]>();

    for (const booking of bookings) {
      try {
        await this.sendRemainingPaymentEmailNow(String(booking._id));
        await BookingModel.findByIdAndUpdate(booking._id, { [sentinelField]: new Date() });
        console.info(`${logLabel} Recordatorio de pago restante enviado a ${booking.guestEmail}`);
      } catch (err) {
        console.error(
          `${logLabel} Error en reserva ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }

  // ─── Cron: check-in automático ────────────────────────────────────────────────

  // Llamado cada hora — registra check-in automático a la hora configurada
  // y envía email de bienvenida si aún no se ha enviado
  async runAutoCheckin(): Promise<void> {
    const settings = await CheckinSettingsModel.findOne().lean<ICheckinSettingsDocument>();
    const checkInTime  = settings?.checkInTime  ?? '16:00';
    const checkOutTime = settings?.checkOutTime ?? '11:00';

    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
    const now = new Date();

    // Solo ejecutar en la hora correcta (±30 min de margen)
    const isCheckinHour =
      now.getHours() === checkInHour &&
      Math.abs(now.getMinutes() - (checkInMinute ?? 0)) <= 30;

    if (!isCheckinHour) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await BookingModel.find({
      status:               'confirmed',
      checkIn:              { $gte: today, $lt: tomorrow },
      checkedInAt:          null,
      autoCheckinEmailSentAt: null,
    }).lean<IBookingDocument[]>();

    for (const booking of bookings) {
      try {
        await BookingModel.findByIdAndUpdate(booking._id, {
          checkedInAt:            new Date(),
          autoCheckinEmailSentAt: new Date(),
        });

        await emailService.sendGuestAutoCheckinWelcome(booking, checkOutTime);
        console.info(`[checkin-auto] Check-in registrado para ${booking.guestName}`);
      } catch (err) {
        console.error(
          `[checkin-auto] Error en reserva ${String(booking._id)}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }
}

export const checkinService = new CheckinService();
