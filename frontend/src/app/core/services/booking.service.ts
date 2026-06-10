import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IBooking, IBookingAvailability, IBookingRequest, BookingStatus } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings');
  }

  getUpcoming(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings/upcoming');
  }

  // Endpoint público — solo devuelve rangos de fechas, sin datos personales
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

  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`bookings/${id}`);
  }
}
