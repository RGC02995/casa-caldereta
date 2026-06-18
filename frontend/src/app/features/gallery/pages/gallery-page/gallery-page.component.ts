import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { PhotoService } from '../../../../core/services/photo.service';
import { IPhoto, PhotoCategory } from '../../../../core/models/photo.model';
import { GalleryLightboxComponent } from '../../components/gallery-lightbox/gallery-lightbox.component';
import { GalleryPhoto } from '../../gallery.types';
import { SeoService } from '../../../../core/services/seo.service';

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior:   'gallery.categories.exterior',
  interior:   'gallery.categories.interior',
  cocina:     'gallery.categories.cocina',
  dormitorio: 'gallery.categories.dormitorio',
  bano:       'gallery.categories.bano',
  jardin:     'gallery.categories.jardin',
  otros:      'gallery.categories.otros',
};

const SECTION_ORDER: PhotoCategory[] = [
  'exterior', 'interior', 'cocina', 'dormitorio', 'bano', 'jardin', 'otros',
];

interface PhotoSection {
  category: PhotoCategory;
  label:    string;
  photos:   IPhoto[];
  offset:   number;
}

@Component({
  selector: 'gallery-page',
  imports: [GalleryLightboxComponent, TranslatePipe],
  templateUrl: './gallery-page.component.html',
  styleUrl:    './gallery-page.component.scss',
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

  readonly isLoading = signal(true);
  readonly loadError = signal('');

  readonly allPhotos = toSignal(
    this.photoService.getAll().pipe(
      map(response => {
        this.isLoading.set(false);
        return response.data;
      }),
      catchError(() => {
        this.loadError.set('gallery.loadError');
        this.isLoading.set(false);
        return of([] as IPhoto[]);
      }),
    ),
    { initialValue: [] as IPhoto[] },
  );

  readonly photoSections = computed((): PhotoSection[] => {
    const photos = this.allPhotos();
    const byCategory = new Map<PhotoCategory, IPhoto[]>();

    for (const photo of photos) {
      if (!byCategory.has(photo.category)) byCategory.set(photo.category, []);
      byCategory.get(photo.category)!.push(photo);
    }

    let offset = 0;
    return SECTION_ORDER
      .filter(cat => byCategory.has(cat))
      .map(cat => {
        const catPhotos = byCategory.get(cat)!;
        const section: PhotoSection = {
          category: cat,
          label:    CATEGORY_LABELS[cat],
          photos:   catPhotos,
          offset,
        };
        offset += catPhotos.length;
        return section;
      });
  });

  readonly lightboxPhotos = computed((): GalleryPhoto[] =>
    this.photoSections().flatMap(section =>
      section.photos.map((photo, i) => ({
        id:  section.offset + i,
        src: photo.url,
        alt: photo.alt,
      }))
    )
  );

  readonly selectedIndex  = signal(-1);
  readonly isLightboxOpen = computed(() => this.selectedIndex() >= 0);

  openLightbox(index: number): void {
    this.selectedIndex.set(index);
  }

  closeLightbox(): void {
    this.selectedIndex.set(-1);
  }
}
