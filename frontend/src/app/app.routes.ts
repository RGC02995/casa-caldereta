import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.routes').then(m => m.homeRoutes),
  },
  {
    path: 'reservar',
    loadChildren: () => import('./features/booking/booking.routes').then(m => m.bookingRoutes),
  },
  {
    path: 'galeria',
    loadChildren: () => import('./features/gallery/gallery.routes').then(m => m.galleryRoutes),
  },
  {
    path: 'rutas',
    loadChildren: () => import('./features/routes/routes.routes').then(m => m.routesRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes),
  },
  {
    path: 'legal',
    loadChildren: () => import('./features/legal/legal.routes').then(m => m.legalRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/pages/not-found-page/not-found-page.component')
        .then(m => m.NotFoundPageComponent),
  },
];
