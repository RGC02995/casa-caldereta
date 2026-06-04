import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private toHttpParams(params: Record<string, string | number>): HttpParams {
    return new HttpParams({ fromObject: params as Record<string, string> });
  }

  get<T>(endpoint: string, params?: Record<string, string | number>): Observable<ApiResponse<T>> {
    return params
      ? this.http.get<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: this.toHttpParams(params) })
      : this.http.get<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`);
  }

  getPaginated<T>(endpoint: string, params?: Record<string, string | number>): Observable<PaginatedResponse<T>> {
    return params
      ? this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: this.toHttpParams(params) })
      : this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${endpoint}`);
  }

  post<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body);
  }

  put<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body);
  }

  patch<T>(endpoint: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`);
  }

  upload<T>(endpoint: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, formData);
  }
}
