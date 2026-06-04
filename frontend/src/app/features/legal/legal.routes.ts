import { Routes } from '@angular/router';

export const legalRoutes: Routes = [
  { path: '', redirectTo: 'aviso-legal', pathMatch: 'full' },
  {
    path: 'aviso-legal',
    loadComponent: () => import('./pages/legal-notice-page/legal-notice-page.component').then(m => m.LegalNoticePageComponent),
  },
];
