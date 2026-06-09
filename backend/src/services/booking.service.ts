import { BookingModel, BookingStatus, IBookingDocument } from '../models/booking.model';
import { withId } from '../utils/mongoose.util';

export interface ICreateBookingData {
  checkIn:    string;
  checkOut:   string;
  guestName:  string;
  guestEmail: string;
  guestPhone: string;
  guests:     number;
  totalPrice: number;
  notes?:     string | undefined;
}

export interface IUpdateStatusData {
  status: BookingStatus;
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

    const booking  = new BookingModel({ ...data, checkIn, checkOut, status: 'pending' });
    const savedDoc = await booking.save();
    const result   = await BookingModel.findById(savedDoc._id).lean<IBookingDocument>();
    return withId(result!);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<IBookingDocument | null> {
    const doc = await BookingModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).lean<IBookingDocument>();
    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await BookingModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const bookingService = new BookingService();
