import { BookingModel, BookingStatus, IBookingDocument } from '../models/booking.model';
import { IPricingRuleDocument } from '../models/pricing-rule.model';
import { pricingRuleService } from './pricing-rule.service';
import { withId } from '../utils/mongoose.util';
import { stripe } from '../config/stripe';
import { env } from '../config/environment';

const DEFAULT_PRICE_PER_NIGHT = 150;

export interface ICreateBookingData {
  checkIn:     string;
  checkOut:    string;
  guestName:   string;
  guestEmail:  string;
  guestPhone:  string;
  guests:      number;
  notes?:      string | undefined;
}

export interface ICheckoutSessionResult {
  sessionUrl:  string;
  bookingId:   string;
  totalPrice:  number;
}

export interface IUpdateStatusData {
  status: BookingStatus;
}

export interface IBookingAvailability {
  checkIn:  Date;
  checkOut: Date;
}

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

  // Devuelve solo fechas de reservas activas — sin datos personales del huésped.
  // Incluye pending_payment con sesión Stripe aún no expirada para evitar dobles reservas.
  async getAvailability(): Promise<IBookingAvailability[]> {
    const now = new Date();
    return BookingModel.find(
      {
        $or: [
          { status: { $in: ['pending', 'confirmed'] } },
          { status: 'pending_payment', stripeSessionExpiresAt: { $gt: now } },
        ],
      },
      { checkIn: 1, checkOut: 1, _id: 0 },
    ).lean<IBookingAvailability[]>();
  }

  async getById(id: string): Promise<IBookingDocument | null> {
    const doc = await BookingModel.findById(id).lean<IBookingDocument>();
    return doc ? withId(doc) : null;
  }

  async create(data: ICreateBookingData): Promise<IBookingDocument> {
    const checkIn  = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('Fechas no válidas');
    }

    if (checkOut <= checkIn) {
      throw new Error('La fecha de salida debe ser posterior a la de entrada');
    }

    const conflict = await BookingModel.findOne({
      status:  { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    if (conflict) {
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    const rules      = await pricingRuleService.getOverlapping(checkIn, checkOut);
    const totalPrice = this.calculateTotalPrice(checkIn, checkOut, rules);

    const bookingData: Record<string, unknown> = {
      checkIn,
      checkOut,
      guestName:  data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guests:     data.guests,
      totalPrice,
      status:     'pending',
    };

    if (data.notes) bookingData['notes'] = data.notes;

    const booking  = new BookingModel(bookingData);
    const savedDoc = await booking.save();
    const result   = await BookingModel.findById(savedDoc._id).lean<IBookingDocument>();
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

  async delete(id: string): Promise<boolean> {
    const result = await BookingModel.findByIdAndDelete(id);
    return result !== null;
  }

  // ─── Stripe ────────────────────────────────────────────────────────────────

  async createCheckoutSession(data: ICreateBookingData): Promise<ICheckoutSessionResult> {
    const checkIn  = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('Fechas no válidas');
    }
    if (checkOut <= checkIn) {
      throw new Error('La fecha de salida debe ser posterior a la de entrada');
    }

    const now = new Date();
    const conflict = await BookingModel.findOne({
      $or: [
        { status: { $in: ['pending', 'confirmed'] } },
        { status: 'pending_payment', stripeSessionExpiresAt: { $gt: now } },
      ],
      checkIn:  { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    if (conflict) {
      throw Object.assign(new Error('Las fechas seleccionadas ya no están disponibles'), { code: 'DATE_CONFLICT' });
    }

    const rules      = await pricingRuleService.getOverlapping(checkIn, checkOut);
    const totalPrice = this.calculateTotalPrice(checkIn, checkOut, rules);

    // Sesión Stripe con expiración de 30 minutos
    const SESSION_TTL_SECONDS = 1800;
    const stripeSessionExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    const session = await stripe.checkout.sessions.create({
      mode:               'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     'eur',
            unit_amount:  Math.round(totalPrice * 100), // Stripe trabaja en céntimos
            product_data: {
              name:        'Casa Caldereta — Reserva',
              description: `Check-in: ${data.checkIn} · Check-out: ${data.checkOut} · ${data.guests} persona${data.guests === 1 ? '' : 's'}`,
            },
          },
        },
      ],
      customer_email:          data.guestEmail,
      expires_at:              Math.floor(stripeSessionExpiresAt.getTime() / 1000),
      success_url:             `${env.frontendUrl}/reservar/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:              `${env.frontendUrl}/reservar/pago-cancelado`,
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
      totalPrice,
      status:                'pending_payment',
      stripeSessionId:       session.id,
      stripeSessionExpiresAt,
    };
    if (data.notes) bookingData['notes'] = data.notes;

    const booking  = new BookingModel(bookingData);
    const savedDoc = await booking.save();

    return {
      sessionUrl: session.url,
      bookingId:  String(savedDoc._id),
      totalPrice,
    };
  }

  // Llamado desde el webhook — idempotente: si ya está confirmed lo ignora
  async confirmFromStripe(
    stripeSessionId: string,
    paymentIntentId: string,
  ): Promise<IBookingDocument | null> {
    const booking = await BookingModel.findOne({ stripeSessionId });
    if (!booking) return null;
    if (booking.status === 'confirmed') return withId(booking.toObject() as IBookingDocument);

    const doc = await BookingModel.findByIdAndUpdate(
      booking._id,
      { status: 'confirmed', stripePaymentIntentId: paymentIntentId },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return doc ? withId(doc) : null;
  }

  async refund(id: string): Promise<IBookingDocument> {
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

    await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });

    const updated = await BookingModel.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { returnDocument: 'after', runValidators: true },
    ).lean<IBookingDocument>();

    return withId(updated!);
  }

  private calculateTotalPrice(
    checkIn: Date,
    checkOut: Date,
    rules: IPricingRuleDocument[],
  ): number {
    let total    = 0;
    const cursor = new Date(checkIn);
    cursor.setHours(12, 0, 0, 0);

    while (cursor < checkOut) {
      const rule = rules.find(r => {
        const start = new Date(r.startDate);
        const end   = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return cursor >= start && cursor <= end;
      });
      total += rule ? rule.pricePerNight : DEFAULT_PRICE_PER_NIGHT;
      cursor.setDate(cursor.getDate() + 1);
    }

    return total;
  }
}

export const bookingService = new BookingService();
