import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IBooking, IBookingRequest, BookingStatus } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings');
  }

  getUpcoming(): Observable<ApiResponse<IBooking[]>> {
    return this.api.get<IBooking[]>('bookings/upcoming');
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
