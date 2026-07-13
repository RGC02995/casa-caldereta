export type BookingStatus = 'pending_payment' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface IBooking {
  readonly id:              string;
  readonly checkIn:         string;
  readonly checkOut:        string;
  readonly guestName:       string;
  readonly guestEmail:      string;
  readonly guestPhone:      string;
  readonly guests:          number;
  readonly totalPrice:      number;
  readonly depositAmount:   number;
  readonly remainingAmount: number;
  readonly status:                         BookingStatus;
  readonly notes?:                         string;
  readonly stripePaymentIntentId?:         string;
  readonly stripeRemainingPaymentIntentId?: string;
  readonly remainingPaidAt?:               string;
  readonly remainingPaymentEmailSentAt?:   string;
  readonly checkedInAt?:                   string;
  readonly checkedOutAt?:                  string;
  readonly guestFormSubmittedAt?:          string;
  readonly preArrivalEmailSentAt?:         string;
  readonly autoCheckinEmailSentAt?:        string;
  readonly createdAt:                      string;
}

export interface IBookingRequest {
  readonly checkIn:    string;
  readonly checkOut:   string;
  readonly guestName:  string;
  readonly guestEmail: string;
  readonly guestPhone: string;
  readonly guests:     number;
  readonly notes?:     string;
}

export interface ICheckoutSessionResult {
  readonly sessionUrl:      string;
  readonly bookingId:       string;
  readonly totalPrice:      number;
  readonly depositAmount:   number;
  readonly remainingAmount: number;
  readonly holdExpiresAt:   string;   // ISO — cuándo se libera la fecha (bloqueo de 10 min)
}

export interface IPriceEstimate {
  readonly totalPrice:      number;
  readonly depositAmount:   number;
  readonly remainingAmount: number;
  readonly nights:          number;
  readonly pricePerNight:   number[];
}

// Respuesta del endpoint público /availability — solo fechas, sin datos del huésped
export interface IBookingAvailability {
  readonly checkIn:  string;
  readonly checkOut: string;
}

export interface ICalendarDay {
  readonly date:        string;
  readonly price:       number | null;
  readonly isAvailable: boolean;
  readonly isBlocked:   boolean;
  readonly bookingId?:  string;
}

export interface IPriceRule {
  readonly id:            string;
  readonly startDate:     string;
  readonly endDate:       string;
  readonly pricePerNight: number;
  readonly label?:        string;
}
