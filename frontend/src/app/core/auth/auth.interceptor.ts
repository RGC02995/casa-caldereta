import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq = req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      const isAuthEndpoint = req.url.includes('/auth/refresh') || req.url.includes('/auth/login');

      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthEndpoint) {
        return auth.refreshTokens().pipe(
          switchMap(response => {
            if (!response.success) {
              auth.clearSession();
              return throwError(() => error);
            }
            return next(req.clone({
              withCredentials: true,
              setHeaders: { Authorization: `Bearer ${response.data.accessToken}` },
            }));
          }),
          catchError(() => {
            auth.clearSession();
            return throwError(() => error);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
