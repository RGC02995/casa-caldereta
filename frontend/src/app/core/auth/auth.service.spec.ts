import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/auth`;

// JWT mínimo con payload real (sin firma válida — el servicio solo decodifica base64)
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = btoa(JSON.stringify(payload));
  return `${header}.${body}.test_signature`;
}

const VALID_PAYLOAD = {
  sub: 'admin@test.com', role: 'admin',
  exp: Math.floor(Date.now() / 1000) + 3600,
};
const EXPIRED_PAYLOAD = {
  sub: 'admin@test.com', role: 'admin',
  exp: Math.floor(Date.now() / 1000) - 60,
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/login', redirectTo: '' }]),
      ],
    });
    service = TestBed.inject(AuthService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('isAuthenticated() → false por defecto (sin sesión guardada)', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login() → POST /auth/login, guarda token, isAuthenticated() = true', () => {
    const token = makeToken(VALID_PAYLOAD);
    service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();

    const req = http.expectOne(`${BASE}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { accessToken: token, refreshToken: 'rt' } });

    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout() → limpia la sesión, isAuthenticated() = false', () => {
    // Establecer sesión via login primero
    const token = makeToken(VALID_PAYLOAD);
    service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();
    http.expectOne(`${BASE}/login`).flush({ success: true, data: { accessToken: token, refreshToken: 'rt' } });
    expect(service.isAuthenticated()).toBe(true);

    service.logout();
    // Absorber el fire-and-forget POST /auth/logout para que verify() no falle
    http.expectOne(`${BASE}/logout`).flush({});

    expect(service.isAuthenticated()).toBe(false);
  });

  it('isTokenExpired() con token válido → false', () => {
    expect(service.isTokenExpired(makeToken(VALID_PAYLOAD))).toBe(false);
  });

  it('isTokenExpired() con token expirado → true', () => {
    expect(service.isTokenExpired(makeToken(EXPIRED_PAYLOAD))).toBe(true);
  });

  it('isTokenExpired() con string malformado → true', () => {
    expect(service.isTokenExpired('not.a.token')).toBe(true);
  });
});
