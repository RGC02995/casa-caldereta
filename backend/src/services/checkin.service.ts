import { randomBytes, createHash } from 'crypto';
import { BookingModel, IBookingDocument } from '../models/booking.model';
import { CheckinSettingsModel, ICheckinSettingsDocument } from '../models/checkin-settings.model';
import { TravelerDocumentModel, ITravelerDocumentDoc } from '../models/traveler-document.model';
import { withId } from '../utils/mongoose.util';
import { emailService } from './email.service';
import { env } from '../config/environment';

const DAYS_BEFORE_CHECKIN = 3;

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
  tipoDocumento:    string;
  numDocumento:     string;
  numSoporte?:      string;
  apellido1:        string;
  apellido2?:       string;
  nombre:           string;
  sexo:             string;
  fechaNacimiento:  string;
  pais:             string;
  paisResidencia?:  string;
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

    const travelerDocs = travelers.map(travelerInput => ({
      bookingId:       booking._id,
      tipoDocumento:   travelerInput.tipoDocumento,
      numDocumento:    travelerInput.numDocumento,
      numSoporte:      travelerInput.numSoporte,
      apellido1:       travelerInput.apellido1,
      apellido2:       travelerInput.apellido2,
      nombre:          travelerInput.nombre,
      sexo:            travelerInput.sexo,
      fechaNacimiento: new Date(travelerInput.fechaNacimiento),
      pais:            travelerInput.pais,
      paisResidencia:  travelerInput.paisResidencia,
      fechaEntrada:    booking.checkIn,
    }));

    await TravelerDocumentModel.insertMany(travelerDocs);

    // Marcar como enviado e invalidar el token (no se puede volver a usar)
    await BookingModel.findByIdAndUpdate(booking._id, {
      guestFormSubmittedAt: new Date(),
      guestFormToken:       null,
    });
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
}

export const checkinService = new CheckinService();
