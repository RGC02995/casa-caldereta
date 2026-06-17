import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IBooking } from '../models/booking.model';
import { ICheckinFormInfo, ICheckinSettings, ITodayActivity, ITravelerDocument, ITravelerInput } from '../models/checkin.model';

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private readonly api = inject(ApiService);

  getForm(token: string): Observable<ApiResponse<ICheckinFormInfo>> {
    return this.api.get<ICheckinFormInfo>(`checkin/form/${token}`);
  }

  submitForm(token: string, travelers: ITravelerInput[]): Observable<ApiResponse<void>> {
    return this.api.post<void>(`checkin/form/${token}`, { travelers });
  }

  getTodayActivity(): Observable<ApiResponse<ITodayActivity>> {
    return this.api.get<ITodayActivity>('checkin/today');
  }

  sendPreArrivalEmail(bookingId: string): Observable<ApiResponse<void>> {
    return this.api.post<void>(`checkin/send-form/${bookingId}`, {});
  }

  recordCheckIn(bookingId: string): Observable<ApiResponse<IBooking>> {
    return this.api.patch<IBooking>(`checkin/${bookingId}/check-in`, {});
  }

  recordCheckOut(bookingId: string): Observable<ApiResponse<IBooking>> {
    return this.api.patch<IBooking>(`checkin/${bookingId}/check-out`, {});
  }

  getTravelers(bookingId: string): Observable<ApiResponse<ITravelerDocument[]>> {
    return this.api.get<ITravelerDocument[]>(`checkin/${bookingId}/travelers`);
  }

  getSettings(): Observable<ApiResponse<ICheckinSettings>> {
    return this.api.get<ICheckinSettings>('checkin/settings');
  }

  updateSettings(checkInTime: string, checkOutTime: string): Observable<ApiResponse<ICheckinSettings>> {
    return this.api.patch<ICheckinSettings>('checkin/settings', { checkInTime, checkOutTime });
  }
}
