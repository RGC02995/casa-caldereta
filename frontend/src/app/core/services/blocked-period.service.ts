import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IBlockedPeriod, IBlockedPeriodAvailability, ICreateBlockedPeriodRequest } from '../models/blocked-period.model';

@Injectable({ providedIn: 'root' })
export class BlockedPeriodService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IBlockedPeriod[]>> {
    return this.api.get<IBlockedPeriod[]>('blocked-periods');
  }

  getAvailability(): Observable<ApiResponse<IBlockedPeriodAvailability[]>> {
    return this.api.get<IBlockedPeriodAvailability[]>('blocked-periods/availability');
  }

  create(data: ICreateBlockedPeriodRequest): Observable<ApiResponse<IBlockedPeriod>> {
    return this.api.post<IBlockedPeriod>('blocked-periods', data);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`blocked-periods/${id}`);
  }
}
