import { Document, Model, Schema, model } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface IBookingDocument extends Document {
  checkIn:    Date;
  checkOut:   Date;
  guestName:  string;
  guestEmail: string;
  guestPhone?: string;
  guests:      number;
  totalPrice: number;
  status:     BookingStatus;
  notes?:     string;
  createdAt:  Date;
  updatedAt:  Date;
}

const bookingSchema = new Schema<IBookingDocument>(
  {
    checkIn: {
      type:     Date,
      required: true,
    },
    checkOut: {
      type:     Date,
      required: true,
    },
    guestName: {
      type:     String,
      required: true,
      trim:     true,
      maxlength: 100,
    },
    guestEmail: {
      type:      String,
      required:  true,
      trim:      true,
      lowercase: true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email no válido'],
    },
    guestPhone: {
      type:      String,
      required:  false,
      trim:      true,
      maxlength: 20,
    },
    guests: {
      type:     Number,
      required: true,
      min:      1,
      max:      20,
    },
    totalPrice: {
      type:     Number,
      required: true,
      min:      0,
    },
    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'cancelled', 'completed'] as BookingStatus[],
      default: 'pending' as BookingStatus,
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: 500,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ guestEmail: 1 });

export const BookingModel: Model<IBookingDocument> = model<IBookingDocument>('Booking', bookingSchema);
