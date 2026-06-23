import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IPricingSettings } from '../models/pricing-settings.model';

@Injectable({ providedIn: 'root' })
export class PricingSettingsService {
  private readonly api = inject(ApiService);

  get(): Observable<ApiResponse<IPricingSettings>> {
    return this.api.get<IPricingSettings>('pricing-settings');
  }

  update(data: Partial<IPricingSettings>): Observable<ApiResponse<IPricingSettings>> {
    return this.api.patch<IPricingSettings>('pricing-settings', data);
  }
}
