import { Routes } from '@angular/router';

export const galleryRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/gallery-page/gallery-page.component').then(m => m.GalleryPageComponent),
  },
];
