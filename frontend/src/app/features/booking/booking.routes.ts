import { Routes } from '@angular/router';

export const bookingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/booking-page/booking-page.component').then(m => m.BookingPageComponent),
  },
];
