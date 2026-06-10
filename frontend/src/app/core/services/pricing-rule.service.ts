import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IPricingRule, ICreatePricingRuleRequest, IUpdatePricingRuleRequest } from '../models/pricing-rule.model';

@Injectable({ providedIn: 'root' })
export class PricingRuleService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IPricingRule[]>> {
    return this.api.get<IPricingRule[]>('pricing-rules');
  }

  create(data: ICreatePricingRuleRequest): Observable<ApiResponse<IPricingRule>> {
    return this.api.post<IPricingRule>('pricing-rules', data);
  }

  update(id: string, data: IUpdatePricingRuleRequest): Observable<ApiResponse<IPricingRule>> {
    return this.api.put<IPricingRule>(`pricing-rules/${id}`, data);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`pricing-rules/${id}`);
  }
}
