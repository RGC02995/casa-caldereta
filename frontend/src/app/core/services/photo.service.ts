import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { IPhoto, PhotoCategory } from '../models/photo.model';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/photos`;

  getAll(): Observable<ApiResponse<IPhoto[]>> {
    return this.http.get<ApiResponse<IPhoto[]>>(this.baseUrl);
  }

  upload(file: File, alt: string, category: PhotoCategory, order?: number): Observable<ApiResponse<IPhoto>> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('alt', alt);
    formData.append('category', category);
    if (order !== undefined) formData.append('order', String(order));
    return this.http.post<ApiResponse<IPhoto>>(this.baseUrl, formData);
  }

  updateOrder(id: string, order: number): Observable<ApiResponse<IPhoto>> {
    return this.http.patch<ApiResponse<IPhoto>>(`${this.baseUrl}/${id}/order`, { order });
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
