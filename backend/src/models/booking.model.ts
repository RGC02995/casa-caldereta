import { Document, Model, Schema, model } from 'mongoose';

export type BookingStatus = 'pending_payment' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface IBookingDocument extends Document {
  checkIn:                   Date;
  checkOut:                  Date;
  guestName:                 string;
  guestEmail:                string;
  guestPhone:                string;
  guests:                    number;
  totalPrice:                number;  // precio total de la estancia
  depositAmount:             number;  // 50 % cobrado al reservar
  remainingAmount:           number;  // 50 % pendiente
  status:                    BookingStatus;
  notes?:                    string;
  // Stripe — pago inicial (depósito)
  stripeSessionId?:          string;
  stripePaymentIntentId?:    string;
  stripeSessionExpiresAt?:   Date;
  // Stripe — segundo pago (restante)
  stripeRemainingSessionId?:        string;
  stripeRemainingPaymentIntentId?:  string;
  remainingPaidAt?:                 Date;
  remainingPaymentEmailSentAt?:     Date;
  // Check-in / check-out
  guestFormToken?:           string;   // SHA-256 hash (select:false)
  guestFormTokenExpiresAt?:  Date;
  guestFormSubmittedAt?:     Date;
  checkedInAt?:              Date;
  checkedOutAt?:             Date;
  preArrivalEmailSentAt?:    Date;
  autoCheckinEmailSentAt?:   Date;
  createdAt:                 Date;
  updatedAt:                 Date;
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
      type:      String,
      required:  true,
      trim:      true,
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
      required:  true,
      trim:      true,
      maxlength: 20,
    },
    guests: {
      type:     Number,
      required: true,
      min:      1,
      max:      6,
    },
    totalPrice: {
      type:     Number,
      required: true,
      min:      0,
    },
    depositAmount: {
      type:     Number,
      required: true,
      min:      0,
    },
    remainingAmount: {
      type:     Number,
      required: true,
      min:      0,
    },
    status: {
      type:    String,
      enum:    ['pending_payment', 'pending', 'confirmed', 'cancelled', 'completed'] as BookingStatus[],
      default: 'pending' as BookingStatus,
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: 500,
    },
    // Stripe — depósito inicial
    stripeSessionId: {
      type:   String,
      sparse: true,
      index:  true,
    },
    stripePaymentIntentId: {
      type:   String,
      sparse: true,
      index:  true,
    },
    stripeSessionExpiresAt: {
      type: Date,
    },
    // Stripe — segundo pago
    stripeRemainingSessionId: {
      type:   String,
      sparse: true,
      index:  true,
    },
    stripeRemainingPaymentIntentId: {
      type:   String,
      sparse: true,
      index:  true,
    },
    remainingPaidAt:             { type: Date },
    remainingPaymentEmailSentAt: { type: Date },
    // Check-in / check-out
    guestFormToken: {
      type:   String,
      select: false,
      sparse: true,
      index:  true,
    },
    guestFormTokenExpiresAt:  { type: Date },
    guestFormSubmittedAt:     { type: Date },
    checkedInAt:              { type: Date },
    checkedOutAt:             { type: Date },
    preArrivalEmailSentAt:    { type: Date },
    autoCheckinEmailSentAt:   { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ guestEmail: 1 });

export const BookingModel: Model<IBookingDocument> = model<IBookingDocument>('Booking', bookingSchema);
