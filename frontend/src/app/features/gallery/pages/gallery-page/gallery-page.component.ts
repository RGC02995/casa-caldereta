import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { IPhoto, PhotoCategory } from '../../../../core/models/photo.model';
import { GalleryLightboxComponent } from '../../components/gallery-lightbox/gallery-lightbox.component';
import { GalleryPhoto } from '../../gallery.types';
import { SeoService } from '../../../../core/services/seo.service';

type CategoryFilter = 'todas' | PhotoCategory;

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior:   'Exterior',
  interior:   'Interior',
  cocina:     'Cocina',
  dormitorio: 'Dormitorios',
  bano:       'Baños',
  jardin:     'Jardín',
  otros:      'Otros',
};

@Component({
  selector: 'gallery-page',
  standalone: true,
  imports: [GalleryLightboxComponent],
  templateUrl: './gallery-page.component.html',
  styleUrl: './gallery-page.component.scss',
})
export class GalleryPageComponent {
  private readonly photoService = inject(PhotoService);

  constructor() {
    inject(SeoService).setPage({
      title:         'Galería de Fotos',
      description:   'Descubre Casa Caldereta a través de sus imágenes. Exteriores, interiores, cocina, dormitorios, jacuzzi y vistas a la montaña en Aielo de Rugat, Valencia.',
      canonicalPath: '/galeria',
      keywords:      'fotos casa rural Valencia, galería alojamiento Aielo de Rugat, imágenes jacuzzi rural Valencia',
    });
  }

  readonly isLoading      = signal(true);
  readonly loadError      = signal('');
  readonly activeCategory = signal<CategoryFilter>('todas');

  readonly allPhotos = toSignal(
    this.photoService.getAll().pipe(
      map(response => {
        this.isLoading.set(false);
        return response.data;
      }),
      catchError(() => {
        this.loadError.set('No se pudieron cargar las imágenes.');
        this.isLoading.set(false);
        return of([] as IPhoto[]);
      }),
    ),
    { initialValue: [] as IPhoto[] },
  );

  readonly availableCategories = computed((): CategoryFilter[] => {
    const cats = new Set(this.allPhotos().map(photo => photo.category));
    return cats.size > 0 ? ['todas', ...Array.from(cats)] as CategoryFilter[] : [];
  });

  readonly filteredPhotos = computed((): IPhoto[] => {
    const cat = this.activeCategory();
    const photos = this.allPhotos();
    return cat === 'todas' ? photos : photos.filter(photo => photo.category === cat);
  });

  readonly lightboxPhotos = computed((): GalleryPhoto[] =>
    this.filteredPhotos().map((photo, photoIndex) => ({
      id:  photoIndex,
      src: photo.url,
      alt: photo.alt,
    })),
  );

  readonly selectedIndex  = signal(-1);
  readonly isLightboxOpen = computed(() => this.selectedIndex() >= 0);

  categoryLabel(cat: CategoryFilter): string {
    return cat === 'todas' ? 'Todas' : (CATEGORY_LABELS[cat as PhotoCategory] ?? cat);
  }

  openLightbox(photoIndex: number): void {
    this.selectedIndex.set(photoIndex);
  }

  closeLightbox(): void {
    this.selectedIndex.set(-1);
  }
}
