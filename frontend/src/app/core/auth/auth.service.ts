import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IUser, IAuthTokens, ILoginCredentials, UserRole } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { LoggerService } from '../services/logger.service';

const ACCESS_TOKEN_KEY = 'cc_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _currentUser = signal<IUser | null>(null);

  readonly currentUser     = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin         = computed(() => this._currentUser()?.role === 'admin');

  constructor() {
    this.restoreSession();
  }

  login(credentials: ILoginCredentials): Observable<ApiResponse<IAuthTokens>> {
    return this.http
      .post<ApiResponse<IAuthTokens>>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(tap(response => {
        if (response.success) {
          this.storeTokens(response.data);
          const user = this.decodeUser(response.data.accessToken);
          this._currentUser.set(user);
          this.logger.info('Admin autenticado');
        }
      }));
  }

  logout(): void {
    this.http
      .post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe();
    this.clearSession();
    void this.router.navigate(['/admin/login']);
  }

  getAccessToken(): string | null { return sessionStorage.getItem(ACCESS_TOKEN_KEY); }

  refreshTokens(): Observable<ApiResponse<IAuthTokens>> {
    return this.http
      .post<ApiResponse<IAuthTokens>>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap(response => {
        if (response.success) {
          this.storeTokens(response.data);
          const user = this.decodeUser(response.data.accessToken);
          this._currentUser.set(user);
        }
      }));
  }

  private restoreSession(): void {
    const token = this.getAccessToken();
    if (!token) return;
    if (this.isTokenExpired(token)) { this.clearSession(); return; }
    const user = this.decodeUser(token);
    if (user) this._currentUser.set(user);
  }

  private decodeUser(token: string): IUser | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const payload = JSON.parse(atob(part)) as { sub: string; role: string };
      return { id: payload.sub, email: payload.sub, role: payload.role as UserRole };
    } catch {
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const part = token.split('.')[1];
      if (!part) return true;
      const payload = JSON.parse(atob(part)) as { exp?: number };
      if (!payload.exp) return true;
      return Date.now() / 1000 > payload.exp;
    } catch {
      return true;
    }
  }

  private storeTokens(tokens: IAuthTokens): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  clearSession(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    this._currentUser.set(null);
  }
}
