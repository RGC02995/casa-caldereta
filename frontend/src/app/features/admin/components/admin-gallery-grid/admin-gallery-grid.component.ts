import { Component, input, output } from '@angular/core';
import { IPhoto, PhotoCategory } from '../../../../core/models/photo.model';

type CategoryFilter = 'all' | PhotoCategory;

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  exterior:   'Exterior',
  interior:   'Interior',
  cocina:     'Cocina',
  dormitorio: 'Dormitorio',
  bano:       'Baño',
  jardin:     'Jardín',
  otros:      'Otros',
};

export interface IPhotoDeleteEvent {
  readonly photoId:  string;
  readonly photoAlt: string;
}

export interface IPhotoReplaceEvent {
  readonly photoId:  string;
  readonly photoAlt: string;
  readonly file:     File;
}

@Component({
  selector:    'admin-gallery-grid',
  imports:     [],
  templateUrl: './admin-gallery-grid.component.html',
  styleUrl:    './admin-gallery-grid.component.scss',
})
export class AdminGalleryGridComponent {
  readonly photos       = input<IPhoto[]>([]);
  readonly processingId = input<string | null>(null);
  readonly activeFilter = input<CategoryFilter>('all');
  readonly loadError    = input('');
  readonly deleteError  = input('');
  readonly replaceError = input('');
  readonly heroError    = input('');
  readonly heroPhotoId  = input<string | null>(null);

  readonly filterChanged    = output<CategoryFilter>();
  readonly deleteRequested  = output<IPhotoDeleteEvent>();
  readonly replaceRequested = output<IPhotoReplaceEvent>();
  readonly setHeroRequested = output<string>();

  readonly filters: { label: string; value: CategoryFilter }[] = [
    { label: 'Todas',      value: 'all'        },
    { label: 'Exterior',   value: 'exterior'   },
    { label: 'Interior',   value: 'interior'   },
    { label: 'Cocina',     value: 'cocina'     },
    { label: 'Dormitorio', value: 'dormitorio' },
    { label: 'Baño',       value: 'bano'       },
    { label: 'Jardín',     value: 'jardin'     },
    { label: 'Otros',      value: 'otros'      },
  ];

  getCategoryLabel(category: PhotoCategory): string {
    return CATEGORY_LABELS[category];
  }

  onReplaceFileSelected(event: Event, photo: IPhoto): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;

    this.replaceRequested.emit({ photoId: photo.id, photoAlt: photo.alt, file });
    inputElement.value = '';
  }
}
