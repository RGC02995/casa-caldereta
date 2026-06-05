import { Routes } from '@angular/router';

export const legalRoutes: Routes = [
  { path: '', redirectTo: 'aviso-legal', pathMatch: 'full' },
  {
    path: 'aviso-legal',
    loadComponent: () => import('./pages/legal-notice-page/legal-notice-page.component').then(m => m.LegalNoticePageComponent),
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./pages/privacy-page/privacy-page.component').then(m => m.PrivacyPageComponent),
  },
  {
    path: 'cookies',
    loadComponent: () => import('./pages/cookies-page/cookies-page.component').then(m => m.CookiesPageComponent),
  },
  {
    path: 'terminos',
    loadComponent: () => import('./pages/terms-page/terms-page.component').then(m => m.TermsPageComponent),
  },
];
