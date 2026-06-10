import { Component, computed, inject, signal } from '@angular/core';
import { GalleryLightboxComponent } from '../../components/gallery-lightbox/gallery-lightbox.component';
import { GalleryPhoto } from '../../gallery.types';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'gallery-page',
  standalone: true,
  imports: [GalleryLightboxComponent],
  templateUrl: './gallery-page.component.html',
  styleUrl: './gallery-page.component.scss',
})
export class GalleryPageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Galería de Fotos',
      description:   'Descubre Casa Caldereta a través de sus imágenes. Exteriores, interiores, cocina, dormitorios, jacuzzi y vistas a la montaña en Aielo de Rugat, Valencia.',
      canonicalPath: '/galeria',
      keywords:      'fotos casa rural Valencia, galería alojamiento Aielo de Rugat, imágenes jacuzzi rural Valencia',
    });
  }

  // Añadir fotos reales en assets/images/gallery/ con estos nombres
  readonly photos: GalleryPhoto[] = Array.from({ length: 12 }, (_, photoIndex) => ({
    id: photoIndex + 1,
    src: `assets/images/gallery/foto-${photoIndex + 1}.jpg`,
    alt: `Casa Caldereta — foto ${photoIndex + 1}`,
  }));

  readonly selectedIndex  = signal(-1);
  readonly isLightboxOpen = computed(() => this.selectedIndex() >= 0);

  openLightbox(index: number): void {
    this.selectedIndex.set(index);
  }

  closeLightbox(): void {
    this.selectedIndex.set(-1);
  }
}
