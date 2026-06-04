import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IUser, IAuthTokens, ILoginCredentials } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { LoggerService } from '../services/logger.service';

const ACCESS_TOKEN_KEY  = 'cc_access_token';
const REFRESH_TOKEN_KEY = 'cc_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http    = inject(HttpClient);
  private readonly router  = inject(Router);
  private readonly logger  = inject(LoggerService);
  private readonly apiUrl  = environment.apiUrl;

  private readonly _currentUser = signal<IUser | null>(null);

  readonly currentUser     = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isAdmin         = computed(() => this._currentUser()?.role === 'admin');

  login(credentials: ILoginCredentials): Observable<ApiResponse<{ user: IUser; tokens: IAuthTokens }>> {
    return this.http
      .post<ApiResponse<{ user: IUser; tokens: IAuthTokens }>>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(tap(response => {
        if (response.success) {
          this.storeTokens(response.data.tokens);
          this._currentUser.set(response.data.user);
          this.logger.info('Admin autenticado');
        }
      }));
  }

  logout(): void {
    this.clearTokens();
    this._currentUser.set(null);
    void this.router.navigate(['/']);
  }

  getAccessToken():  string | null { return sessionStorage.getItem(ACCESS_TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_TOKEN_KEY); }

  refreshTokens(): Observable<ApiResponse<IAuthTokens>> {
    return this.http
      .post<ApiResponse<IAuthTokens>>(`${this.apiUrl}/auth/refresh`, { refreshToken: this.getRefreshToken() })
      .pipe(tap(r => { if (r.success) this.storeTokens(r.data); }));
  }

  private storeTokens(tokens: IAuthTokens): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private clearTokens(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
