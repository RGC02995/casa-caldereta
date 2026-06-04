export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface IBooking {
  readonly id: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone: string;
  readonly guests: number;
  readonly totalPrice: number;
  readonly status: BookingStatus;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface IBookingRequest {
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guestName: string;
  readonly guestEmail: string;
  readonly guestPhone: string;
  readonly guests: number;
  readonly notes?: string;
}

export interface ICalendarDay {
  readonly date: string;
  readonly price: number | null;
  readonly isAvailable: boolean;
  readonly isBlocked: boolean;
  readonly bookingId?: string;
}

export interface IPriceRule {
  readonly id: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly pricePerNight: number;
  readonly label?: string;
}
