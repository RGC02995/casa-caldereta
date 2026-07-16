import { Types } from 'mongoose';
import { BookingModel, BookingStatus, IBookingDocument } from '../models/booking.model';
import { BlockedPeriodModel } from '../models/blocked-period.model';
import { withId } from '../utils/mongoose.util';
import { stripe } from '../config/stripe';
import { env } from '../config/environment';
import { calculateStayTotal, isSunday, IPricingRuleOverride } from '../utils/pricing.util';
import { pricingSettingsService } from './pricing-settings.service';
import { pricingRuleService } from './pricing-rule.service';

export interface ICreateBookingData {
  checkIn:    string;
  checkOut:   string;
  guestName:  string;
  guestEmail: string;
  guestPhone: string;
  guests:     number;
  notes?:     string | undefined;
}

export interface ICheckoutSessionResult {
  sessionUrl:      string;
  bookingId:       string;
  totalPrice:      number;
  depositAmount:   number;
  remainingAmount: number;
  holdExpiresAt:   string;   // ISO — cuándo se libera la fecha (10 min); el front lo usa para "reanudar pago"
}

export interface IRemainingPaymentSessionResult {
  sessionUrl:  string;
  bookingId:   string;
  remainingAmount: number;
}

export interface IUpdateStatusData {
  status: BookingStatus;
}

export interface IBookingAvailability {
  checkIn:  Date;
  checkOut: Date;
}

export interface IBookingExportRange {
  id:       string;
  checkIn:  Date;
  checkOut: Date;
}

export interface IPriceEstimate {
  totalPrice:      number;
  depositAmount:   number;
  remainingAmount: number;
  nights:          number;
  pricePerNight:   number[];
}

const SESSION_TTL_SECONDS = 1800; // 30 min — mínimo que Stripe exige para expires_at de la sesión
const HOLD_TTL_SECONDS    = 600;  // 10 min — bloqueo interno de la fecha (libera antes que Stripe)

// Resultado de intentar confirmar el depósito desde el webhook de Stripe.
export type DepositConfirmResult =
  | { outcome: 'confirmed';         booking: IBookingDocument }
  | { outcome: 'already_confirmed'; booking: IBookingDocument }
  | { outcome: 'not_found' }
  | { outcome: 'conflict';          booking: IBookingDocument };

class BookingService {
  async getAll(): Promise<IBookingDocument[]> {
    const docs = await BookingModel.find().sort({ checkIn: -1 }).lean<IBookingDocument[]>();
    return docs.map(withId);
  }

  async getUpcoming(): Promise<IBookingDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const docs = await BookingModel.find({
      checkIn: { $gte: today },
      status:  { $in: ['pending_payment', 'pending', 'confirmed'] },
    })
      .sort({ checkIn: 1 })
      .lean<IBookingDocument[]>();

    return docs.map(withId);
  }

  async getAvailability(): Promise<IBookingAvailability[]> {
    const now = new Date();
    return BookingModel.find(
      {
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
      },
      { checkIn: 1, checkOut: 1, _id: 0 },
    ).lean<IBookingAvailability[]>();
  }

  // Reservas a exportar en el feed .ics público (mismos criterios que getAvailability, con id)
  async getExportRanges(): Promise<IBookingExportRange[]> {
    const now = new Date();
    const docs = await BookingModel.find(
      {
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
      },
      { checkIn: 1, checkOut: 1 },
    ).lean<{ _id: unknown; checkIn: Date; checkOut: Date }[]>();

    return docs.map(doc => ({ id: String(doc._id), checkIn: doc.checkIn, checkOut: doc.checkOut }));
  }

  async getById(id: string): Promise<IBookingDocument | null> {
    const doc = await BookingModel.findById(id).lean<IBookingDocument>();
    return doc ? withId(doc) : null;
  }

  async getEstimate(
    rawCheckIn: string,
    rawCheckOut: string,
    guests: number,
  ): Promise<IPriceEstimate> {
    const { checkIn, checkOut } = this.parseDates(rawCheckIn, rawCheckOut);
    this.validateCheckInDay(checkIn);
    const [config, rules] = await Promise.all([
      pricingSettingsService.getConfig(),
      pricingRuleService.getOverlapping(checkIn, checkOut),
    ]);
    const stay = calculateStayTotal(checkIn, checkOut, guests, config, rules);
    this.validateMinNights(stay.nights, rules);
    return {
      totalPrice:      stay.subtotal,
      depositAmount:   stay.deposit,
      remainingAmount: stay.remaining,
      nights:          stay.nights,
      pricePerNight:   stay.pricePerNight,
    };
  }

  async create(data: ICreateBookingData): Promise<IBookingDocument> {
    const { checkIn, checkOut } = this.parseDates(data.checkIn, data.checkOut);
    this.validateCheckInDay(checkIn);

    const now = new Date();
    const [conflict, blockedConflict] = await Promise.all([
      BookingModel.findOne({
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
        checkIn:  { $lt: checkOut },
        checkOut: { $gt: checkIn },
      }),
      this.hasBlockedConflict(checkIn, checkOut),
    ]);

    if (conflict || blockedConflict) {
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    const [config, rules] = await Promise.all([
      pricingSettingsService.getConfig(),
      pricingRuleService.getOverlapping(checkIn, checkOut),
    ]);
    const stay = calculateStayTotal(checkIn, checkOut, data.guests, config, rules);

    const bookingData: Record<string, unknown> = {
      checkIn,
      checkOut,
      guestName:       data.guestName,
      guestEmail:      data.guestEmail,
      guestPhone:      data.guestPhone,
      guests:          data.guests,
      totalPrice:      stay.subtotal,
      depositAmount:   stay.deposit,
      remainingAmount: stay.remaining,
      status:          'pending',
    };

    if (data.notes) bookingData['notes'] = data.notes;

    const booking  = new BookingModel(bookingData);
    const savedDoc = await booking.save();

    if (await this.revalidateAfterSave(savedDoc._id, checkIn, checkOut)) {
      await BookingModel.findByIdAndDelete(savedDoc._id);
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    const result = await BookingModel.findById(savedDoc._id).lean<IBookingDocument>();
    return withId(result!);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<IBookingDocument | null> {
    const doc = await BookingModel.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();
    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<IBookingDocument | null> {
    const doc = await BookingModel.findByIdAndDelete(id).lean<IBookingDocument>();
    return doc ? withId(doc) : null;
  }

  // Público — el propio huésped cancela su reserva pending_payment (aún no pagada) para
  // liberar la fecha y poder empezar de cero. Solo toca pending_payment: nunca borra pending,
  // confirmed, cancelled ni completed. Bajo riesgo: requiere el ObjectId exacto (no adivinable)
  // y solo afecta a un pago aún no confirmado.
  async cancelOwnPendingPayment(id: string): Promise<IBookingDocument | null> {
    const booking = await BookingModel.findOne({ _id: id, status: 'pending_payment' }).lean<IBookingDocument>();
    if (!booking) return null;

    if (booking.stripeSessionId) {
      try {
        await stripe.checkout.sessions.expire(booking.stripeSessionId);
      } catch {
        // Sesión ya expirada/completada — best-effort.
      }
    }
    await BookingModel.findByIdAndDelete(id);
    return withId(booking);
  }

  // Llamado por el cron: borra las reservas pending_payment cuyo bloqueo de 10 min ya expiró
  // y cierra su sesión de Stripe (best-effort) para que no puedan pagarse tras liberar la fecha.
  async cleanupExpiredPendingPayments(): Promise<number> {
    const now = new Date();
    const expired = await BookingModel.find({
      status:        'pending_payment',
      holdExpiresAt: { $lt: now },
    }).lean<IBookingDocument[]>();

    for (const booking of expired) {
      if (booking.stripeSessionId) {
        try {
          await stripe.checkout.sessions.expire(booking.stripeSessionId);
        } catch {
          // La sesión pudo expirar o completarse ya en Stripe — best-effort, seguimos.
        }
      }
      await BookingModel.findByIdAndDelete(booking._id);
    }

    return expired.length;
  }

  // ─── Stripe — depósito inicial (50 %) ────────────────────────────────────────

  async createCheckoutSession(data: ICreateBookingData): Promise<ICheckoutSessionResult> {
    const { checkIn, checkOut } = this.parseDates(data.checkIn, data.checkOut);
    this.validateCheckInDay(checkIn);

    // Reintento del mismo usuario: si ya tiene un pending_payment vivo para EXACTAMENTE estas
    // fechas (volvió atrás desde Stripe), se expira y borra antes de crear el nuevo — así su
    // propia reserva fantasma no le bloquea con un 409.
    await this.releaseOwnPendingPayment(data.guestEmail, checkIn, checkOut);

    const now = new Date();
    const [conflict, blockedConflict] = await Promise.all([
      BookingModel.findOne({
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
        checkIn:  { $lt: checkOut },
        checkOut: { $gt: checkIn },
      }),
      this.hasBlockedConflict(checkIn, checkOut),
    ]);

    if (conflict || blockedConflict) {
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    const [config, rules] = await Promise.all([
      pricingSettingsService.getConfig(),
      pricingRuleService.getOverlapping(checkIn, checkOut),
    ]);
    const stay = calculateStayTotal(checkIn, checkOut, data.guests, config, rules);
    this.validateMinNights(stay.nights, rules);
    const stripeSessionExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const holdExpiresAt          = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    const checkInFormatted  = new Date(checkIn).toLocaleDateString('es-ES');
    const checkOutFormatted = new Date(checkOut).toLocaleDateString('es-ES');

    // Solo se cobra el 50 % (depósito) — el resto se cobra 7 días antes de la entrada
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:    'eur',
            unit_amount: Math.round(stay.deposit * 100),
            product_data: {
              name:        'Casa Caldereta — Depósito de reserva (50 %)',
              description: `Entrada: ${checkInFormatted} · Salida: ${checkOutFormatted} · ${data.guests} persona${data.guests === 1 ? '' : 's'} · Total estancia: ${stay.subtotal} €`,
            },
          },
        },
      ],
      customer_email:  data.guestEmail,
      expires_at:      Math.floor(stripeSessionExpiresAt.getTime() / 1000),
      success_url:     `${env.frontendUrl}/reservar/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:      `${env.frontendUrl}/reservar/pago-cancelado`,
      metadata: {
        type: 'deposit',
      },
    });

    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de pago');
    }

    const bookingData: Record<string, unknown> = {
      checkIn,
      checkOut,
      guestName:             data.guestName,
      guestEmail:            data.guestEmail,
      guestPhone:            data.guestPhone,
      guests:                data.guests,
      totalPrice:            stay.subtotal,
      depositAmount:         stay.deposit,
      remainingAmount:       stay.remaining,
      status:                'pending_payment',
      stripeSessionId:       session.id,
      stripeSessionExpiresAt,
      holdExpiresAt,
    };
    if (data.notes) bookingData['notes'] = data.notes;

    const booking  = new BookingModel(bookingData);
    const savedDoc = await booking.save();

    if (await this.revalidateAfterSave(savedDoc._id, checkIn, checkOut)) {
      await BookingModel.findByIdAndDelete(savedDoc._id);
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (err) {
        console.error('[booking] No se pudo expirar la sesion de Stripe tras conflicto de concurrencia:', err);
      }
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    return {
      sessionUrl:      session.url,
      bookingId:       String(savedDoc._id),
      totalPrice:      stay.subtotal,
      depositAmount:   stay.deposit,
      remainingAmount: stay.remaining,
      holdExpiresAt:   holdExpiresAt.toISOString(),
    };
  }

  // Llamado desde el webhook — idempotente y defensivo.
  // Como la fecha se libera a los 10 min pero la sesión de Stripe vive 30 min, un pago tardío
  // podría llegar cuando la fecha ya la ocupó otra reserva (o la reserva fantasma fue borrada).
  // En esos casos NO se confirma: el controlador reembolsará el importe recién cobrado.
  async confirmDepositPayment(
    stripeSessionId: string,
    paymentIntentId: string,
  ): Promise<DepositConfirmResult> {
    const booking = await BookingModel.findOne({ stripeSessionId });
    if (!booking) return { outcome: 'not_found' };
    if (booking.status === 'confirmed') {
      return { outcome: 'already_confirmed', booking: withId(booking.toObject() as IBookingDocument) };
    }

    const now = new Date();
    const [conflict, blockedConflict] = await Promise.all([
      BookingModel.findOne({
        _id: { $ne: booking._id },
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
        checkIn:  { $lt: booking.checkOut },
        checkOut: { $gt: booking.checkIn },
      }),
      this.hasBlockedConflict(booking.checkIn, booking.checkOut),
    ]);

    if (conflict || blockedConflict) {
      const cancelled = await BookingModel.findByIdAndUpdate(
        booking._id,
        { status: 'cancelled', stripePaymentIntentId: paymentIntentId },
        { returnDocument: 'after', runValidators: true },
      ).lean<IBookingDocument>();
      return { outcome: 'conflict', booking: withId(cancelled!) };
    }

    const doc = await BookingModel.findByIdAndUpdate(
      booking._id,
      { status: 'confirmed', stripePaymentIntentId: paymentIntentId, depositPaidAt: now },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return { outcome: 'confirmed', booking: withId(doc!) };
  }

  // ─── Stripe — segundo pago (50 % restante) ───────────────────────────────────

  async createRemainingPaymentSession(id: string): Promise<IRemainingPaymentSessionResult> {
    const booking = await BookingModel.findById(id).lean<IBookingDocument>();

    if (!booking) {
      throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });
    }
    if (booking.status !== 'confirmed') {
      throw Object.assign(new Error('Solo se puede cobrar el resto a reservas confirmadas'), { code: 'INVALID_STATUS' });
    }
    if (booking.remainingPaidAt) {
      throw Object.assign(new Error('El pago restante ya fue abonado'), { code: 'ALREADY_PAID' });
    }

    if (booking.stripeRemainingSessionId) {
      try {
        await stripe.checkout.sessions.expire(booking.stripeRemainingSessionId);
      } catch {
        // Ya pagada, expirada o completada — no bloquea la creación de la nueva sesión
      }
    }

    const checkInFormatted  = new Date(booking.checkIn).toLocaleDateString('es-ES');
    const checkOutFormatted = new Date(booking.checkOut).toLocaleDateString('es-ES');

    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:    'eur',
            unit_amount: Math.round(booking.remainingAmount * 100),
            product_data: {
              name:        'Casa Caldereta — Pago restante de estancia',
              description: `Entrada: ${checkInFormatted} · Salida: ${checkOutFormatted} · ${booking.guestName}`,
            },
          },
        },
      ],
      customer_email: booking.guestEmail,
      success_url:    `${env.frontendUrl}/reservar/pago-exitoso?type=remaining`,
      cancel_url:     `${env.frontendUrl}/reservar/pago-cancelado`,
      metadata: {
        type:      'remaining',
        bookingId: String(booking._id),
      },
    });

    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de pago');
    }

    await BookingModel.findByIdAndUpdate(id, {
      stripeRemainingSessionId: session.id,
    });

    return {
      sessionUrl:      session.url,
      bookingId:       String(booking._id),
      remainingAmount: booking.remainingAmount,
    };
  }

  // Llamado desde el webhook para el segundo pago
  async confirmRemainingFromStripe(
    stripeSessionId: string,
    paymentIntentId: string,
  ): Promise<IBookingDocument | null> {
    const booking = await BookingModel.findOne({ stripeRemainingSessionId: stripeSessionId });
    if (!booking) return null;
    if (booking.remainingPaidAt) return withId(booking.toObject() as IBookingDocument);

    const doc = await BookingModel.findByIdAndUpdate(
      booking._id,
      {
        remainingPaidAt:                new Date(),
        stripeRemainingPaymentIntentId: paymentIntentId,
      },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return doc ? withId(doc) : null;
  }

  // ─── Reembolso (propietario) ─────────────────────────────────────────────────

  async refund(id: string, amountEuros: number): Promise<IBookingDocument> {
    const booking = await BookingModel.findById(id).lean<IBookingDocument>();

    if (!booking) {
      throw Object.assign(new Error('Reserva no encontrada'), { code: 'NOT_FOUND' });
    }
    if (booking.status !== 'confirmed') {
      throw Object.assign(new Error('Solo se pueden reembolsar reservas confirmadas'), { code: 'INVALID_STATUS' });
    }
    if (!booking.stripePaymentIntentId) {
      throw Object.assign(new Error('Esta reserva no tiene pago de Stripe asociado'), { code: 'NO_PAYMENT' });
    }

    const depositCents   = Math.round(booking.depositAmount * 100);
    const remainingCents = booking.remainingPaidAt ? Math.round(booking.remainingAmount * 100) : 0;
    const maxRefundCents = depositCents + remainingCents;
    const amountCents    = Math.round(amountEuros * 100);

    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > maxRefundCents) {
      throw Object.assign(
        new Error(`El importe debe estar entre 0,01 € y ${(maxRefundCents / 100).toFixed(2)} €`),
        { code: 'VALIDATION' },
      );
    }

    let remainingToRefund = amountCents;
    let depositRefunded   = false;

    try {
      // Reembolsar primero contra el depósito, y el resto (si queda) contra el segundo pago
      const fromDeposit = Math.min(remainingToRefund, depositCents);
      if (fromDeposit > 0) {
        await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId, amount: fromDeposit });
        depositRefunded = true;
        remainingToRefund -= fromDeposit;
      }

      if (remainingToRefund > 0 && booking.stripeRemainingPaymentIntentId) {
        await stripe.refunds.create({ payment_intent: booking.stripeRemainingPaymentIntentId, amount: remainingToRefund });
      }
    } catch (err) {
      const detail = depositRefunded
        ? 'El depósito ya se reembolsó correctamente, pero falló el reembolso del resto. Revisa Stripe antes de reintentar.'
        : 'No se pudo procesar el reembolso en Stripe.';
      throw Object.assign(new Error(detail), { code: 'REFUND_FAILED', cause: err });
    }

    const updated = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return withId(updated!);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private parseDates(rawCheckIn: string, rawCheckOut: string): { checkIn: Date; checkOut: Date } {
    const checkIn  = new Date(rawCheckIn);
    const checkOut = new Date(rawCheckOut);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw Object.assign(new Error('Fechas no válidas'), { code: 'INVALID_DATES' });
    }
    if (checkOut <= checkIn) {
      throw Object.assign(new Error('La fecha de salida debe ser posterior a la de entrada'), { code: 'INVALID_DATES' });
    }
    return { checkIn, checkOut };
  }

  private validateCheckInDay(checkIn: Date): void {
    if (isSunday(checkIn)) {
      throw Object.assign(
        new Error('Los domingos el alojamiento está cerrado a nuevas entradas'),
        { code: 'SUNDAY_CLOSED' },
      );
    }
  }

  // Solo se llama desde el checkout público (getEstimate/createCheckoutSession) — las
  // reservas manuales del admin (create()) pueden saltarse el mínimo de noches a propósito.
  // Si varias reglas solapan, manda la más restrictiva (el minNights más alto).
  private validateMinNights(nights: number, rules: IPricingRuleOverride[]): void {
    const binding = rules
      .filter(r => r.minNights > nights)
      .sort((a, b) => b.minNights - a.minNights)[0];

    if (binding) {
      const start = new Date(binding.startDate).toLocaleDateString('es-ES');
      const end   = new Date(binding.endDate).toLocaleDateString('es-ES');
      throw Object.assign(
        new Error(`Las fechas del ${start} al ${end} requieren una estancia mínima de ${binding.minNights} noches`),
        { code: 'MIN_NIGHTS' },
      );
    }
  }

  // Revalida tras guardar de forma optimista, para cerrar la ventana de carrera entre la
  // comprobacion previa y el guardado. Desempate por _id: los ObjectId de Mongo son
  // estrictamente crecientes en este proceso Node, asi que solo la reserva creada DESPUES
  // se autocancela si detecta a otra ya guardada antes con fechas solapadas.
  private async revalidateAfterSave(
    savedId: Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
  ): Promise<boolean> {
    const now = new Date();
    const [conflict, blockedConflict] = await Promise.all([
      BookingModel.findOne({
        _id: { $lt: savedId },
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', holdExpiresAt: { $gt: now } },
        ],
        checkIn:  { $lt: checkOut },
        checkOut: { $gt: checkIn },
      }),
      this.hasBlockedConflict(checkIn, checkOut),
    ]);
    return conflict !== null || blockedConflict;
  }

  // Expira y borra la(s) reserva(s) pending_payment vivas del mismo huésped para EXACTAMENTE
  // estas fechas, para que un reintento (volver atrás desde Stripe) no choque con su propia
  // reserva anterior. No toca reservas de otros huéspedes ni de otras fechas.
  private async releaseOwnPendingPayment(guestEmail: string, checkIn: Date, checkOut: Date): Promise<void> {
    const now = new Date();
    const own = await BookingModel.find({
      status:        'pending_payment',
      guestEmail:    guestEmail.trim().toLowerCase(),
      checkIn,
      checkOut,
      holdExpiresAt: { $gt: now },
    }).lean<IBookingDocument[]>();

    for (const booking of own) {
      if (booking.stripeSessionId) {
        try {
          await stripe.checkout.sessions.expire(booking.stripeSessionId);
        } catch {
          // Sesión ya expirada/completada — best-effort.
        }
      }
      await BookingModel.findByIdAndDelete(booking._id);
    }
  }

  private async hasBlockedConflict(checkIn: Date, checkOut: Date): Promise<boolean> {
    // Los bloqueos manuales se crean/pintan como inclusivos (endDate incluido);
    // los importados de Airbnb/Booking ya son exclusivos por naturaleza del feed.
    const conflict = await BlockedPeriodModel.findOne({
      $or: [
        { origin: 'manual',          startDate: { $lt: checkOut }, endDate: { $gte: checkIn } },
        { origin: { $ne: 'manual' }, startDate: { $lt: checkOut }, endDate: { $gt:  checkIn } },
      ],
    });
    return conflict !== null;
  }
}

export const bookingService = new BookingService();
