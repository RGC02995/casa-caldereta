import { Routes } from '@angular/router';

export const routesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/routes-page/routes-page.component').then(m => m.RoutesPageComponent),
  },
];
