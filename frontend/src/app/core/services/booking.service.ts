import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import {
  IBooking,
  IBookingAvailability,
  IBookingRequest,
  ICheckoutSessionResult,
  IPriceEstimate,
  BookingStatus,
} from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings');
  }

  getUpcoming(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings/upcoming');
  }

  getAvailability(): Observable<ApiResponse<IBookingAvailability[]>> {
    return this.api.get<IBookingAvailability[]>('bookings/availability');
  }

  getById(id: string): Observable<ApiResponse<IBooking>> {
    return this.api.get<IBooking>(`bookings/${id}`);
  }

  create(data: IBookingRequest): Observable<ApiResponse<IBooking>> {
    return this.api.post<IBooking>('bookings', data);
  }

  updateStatus(id: string, status: BookingStatus): Observable<ApiResponse<IBooking>> {
    return this.api.patch<IBooking>(`bookings/${id}/status`, { status });
  }

  createCheckoutSession(data: IBookingRequest): Observable<ApiResponse<ICheckoutSessionResult>> {
    return this.api.post<ICheckoutSessionResult>('bookings/checkout', data);
  }

  refundBooking(id: string): Observable<ApiResponse<IBooking>> {
    return this.api.post<IBooking>(`bookings/${id}/refund`, {});
  }

  createRemainingPaymentSession(id: string): Observable<ApiResponse<{ sessionUrl: string; remainingAmount: number }>> {
    return this.api.post<{ sessionUrl: string; remainingAmount: number }>(`bookings/${id}/remaining-payment`, {});
  }

  getPriceEstimate(checkIn: string, checkOut: string, guests: number): Observable<ApiResponse<IPriceEstimate>> {
    return this.api.get<IPriceEstimate>(
      `bookings/price-estimate?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
    );
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`bookings/${id}`);
  }
}
