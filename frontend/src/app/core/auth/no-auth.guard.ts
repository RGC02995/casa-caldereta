import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return router.createUrlTree(['/admin']);

  return auth.refreshTokens().pipe(
    map(response => response.success ? router.createUrlTree(['/admin']) : true),
    catchError(() => of(true)),
  );
};
