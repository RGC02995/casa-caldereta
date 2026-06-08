import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { IRoute, IRouteCreateRequest, IRouteUpdateRequest } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly api = inject(ApiService);

  getAll(): Observable<ApiResponse<IRoute[]>> {
    return this.api.get<IRoute[]>('routes');
  }

  getPublished(): Observable<ApiResponse<IRoute[]>> {
    return this.api.get<IRoute[]>('routes/published');
  }

  getBySlug(slug: string): Observable<ApiResponse<IRoute>> {
    return this.api.get<IRoute>(`routes/slug/${slug}`);
  }

  create(data: IRouteCreateRequest): Observable<ApiResponse<IRoute>> {
    return this.api.post<IRoute>('routes', data);
  }

  update(id: string, data: IRouteUpdateRequest): Observable<ApiResponse<IRoute>> {
    return this.api.patch<IRoute>(`routes/${id}`, data);
  }

  togglePublished(id: string): Observable<ApiResponse<IRoute>> {
    return this.api.patch<IRoute>(`routes/${id}/published`, {});
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.api.delete<void>(`routes/${id}`);
  }
}
