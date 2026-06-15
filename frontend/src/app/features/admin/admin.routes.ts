import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';
import { noAuthGuard } from '../../core/auth/no-auth.guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'reservas',
        loadComponent: () => import('./pages/admin-bookings/admin-bookings.component').then(m => m.AdminBookingsComponent),
      },
      {
        path: 'fotos',
        loadComponent: () => import('./pages/admin-gallery/admin-gallery.component').then(m => m.AdminGalleryComponent),
      },
      {
        path: 'rutas',
        loadComponent: () => import('./pages/admin-routes/admin-routes.component').then(m => m.AdminRoutesComponent),
      },
      {
        path: 'calendario',
        loadComponent: () => import('./pages/admin-calendar/admin-calendar.component').then(m => m.AdminCalendarComponent),
      },
      {
        path: 'resenas',
        loadComponent: () => import('./pages/admin-reviews/admin-reviews.component').then(m => m.AdminReviewsComponent),
      },
    ],
  },
];
