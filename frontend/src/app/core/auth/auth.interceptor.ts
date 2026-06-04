import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return auth.refreshTokens().pipe(
          switchMap(response => {
            if (!response.success) { auth.logout(); return throwError(() => error); }
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${response.data.accessToken}` } }));
          }),
          catchError(() => { auth.logout(); return throwError(() => error); })
        );
      }
      return throwError(() => error);
    })
  );
};
