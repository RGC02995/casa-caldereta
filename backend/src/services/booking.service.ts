import { BookingModel, BookingStatus, IBookingDocument } from '../models/booking.model';
import { IPricingRuleDocument } from '../models/pricing-rule.model';
import { pricingRuleService } from './pricing-rule.service';
import { withId } from '../utils/mongoose.util';

const DEFAULT_PRICE_PER_NIGHT = 150;

export interface ICreateBookingData {
  checkIn:     string;
  checkOut:    string;
  guestName:   string;
  guestEmail:  string;
  guestPhone: string;
  guests:      number;
  notes?:      string | undefined;
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
      status:  { $in: ['pending', 'confirmed'] },
    })
      .sort({ checkIn: 1 })
      .lean<IBookingDocument[]>();

    return docs.map(withId);
  }

  // Devuelve solo fechas de reservas activas — sin datos personales del huésped
  async getAvailability(): Promise<IBookingAvailability[]> {
    return BookingModel.find(
      { status: { $in: ['pending', 'confirmed'] } },
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
