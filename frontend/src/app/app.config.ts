import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideTranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { appReducers } from './store/app.reducers';
import { AppEffects } from './store/app.effects';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore(appReducers),
    provideEffects([AppEffects]),
    provideRouterStore(),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
      autoPause: true,
    }),
    provideTranslateService({ defaultLanguage: environment.defaultLanguage }),
    ...provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
  ],
};
