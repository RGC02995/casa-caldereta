import { Routes } from '@angular/router';

export const bookingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/booking-page/booking-page.component').then(m => m.BookingPageComponent),
  },
  {
    path: 'pago-exitoso',
    loadComponent: () => import('./pages/booking-success-page/booking-success-page.component').then(m => m.BookingSuccessPageComponent),
  },
  {
    path: 'pago-cancelado',
    loadComponent: () => import('./pages/booking-cancel-page/booking-cancel-page.component').then(m => m.BookingCancelPageComponent),
  },
];
