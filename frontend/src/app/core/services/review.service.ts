import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { IReview, ICreateReview } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reviews`;

  getApproved(): Observable<ApiResponse<IReview[]>> {
    return this.http.get<ApiResponse<IReview[]>>(this.baseUrl);
  }

  getAll(): Observable<ApiResponse<IReview[]>> {
    return this.http.get<ApiResponse<IReview[]>>(`${this.baseUrl}/all`);
  }

  submit(data: ICreateReview): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(this.baseUrl, data);
  }

  approve(id: string): Observable<ApiResponse<IReview>> {
    return this.http.patch<ApiResponse<IReview>>(`${this.baseUrl}/${id}/approve`, {});
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
