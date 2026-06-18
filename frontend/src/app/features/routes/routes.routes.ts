import { Routes } from '@angular/router';

export const routesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/routes-page/routes-page.component').then(m => m.RoutesPageComponent),
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/route-detail-page/route-detail-page.component').then(m => m.RouteDetailPageComponent),
  },
];
