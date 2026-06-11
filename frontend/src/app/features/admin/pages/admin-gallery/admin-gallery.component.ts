import { Component, inject, signal, computed, ElementRef, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PhotoService } from '../../../../core/services/photo.service';
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

@Component({
  selector: 'admin-gallery',
  imports: [],
  templateUrl: './admin-gallery.component.html',
  styleUrl:    './admin-gallery.component.scss',
})
export class AdminGalleryComponent {
  private readonly photoService = inject(PhotoService);

  readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly loadError      = signal('');
  readonly actionError    = signal('');
  readonly uploadAlt      = signal('');
  readonly uploadCategory = signal<PhotoCategory>('otros');
  readonly isUploading    = signal(false);
  readonly processingId   = signal<string | null>(null);
  readonly activeFilter   = signal<CategoryFilter>('all');
  readonly selectedFile   = signal<File | null>(null);
  readonly previewUrl     = signal<string | null>(null);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly allPhotos = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.photoService.getAll().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudieron cargar las fotos.');
          return of([] as IPhoto[]);
        }),
      )),
    ),
    { initialValue: [] as IPhoto[] },
  );

  readonly filteredPhotos = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allPhotos();
    return this.allPhotos().filter(photo => photo.category === filter);
  });

  readonly filters: { label: string; value: CategoryFilter }[] = [
    { label: 'Todas',       value: 'all'        },
    { label: 'Exterior',    value: 'exterior'   },
    { label: 'Interior',    value: 'interior'   },
    { label: 'Cocina',      value: 'cocina'     },
    { label: 'Dormitorio',  value: 'dormitorio' },
    { label: 'Baño',        value: 'bano'       },
    { label: 'Jardín',      value: 'jardin'     },
    { label: 'Otros',       value: 'otros'      },
  ];

  readonly categories: { label: string; value: PhotoCategory }[] = [
    { label: 'Exterior',    value: 'exterior'   },
    { label: 'Interior',    value: 'interior'   },
    { label: 'Cocina',      value: 'cocina'     },
    { label: 'Dormitorio',  value: 'dormitorio' },
    { label: 'Baño',        value: 'bano'       },
    { label: 'Jardín',      value: 'jardin'     },
    { label: 'Otros',       value: 'otros'      },
  ];

  getCategoryLabel(category: PhotoCategory): string {
    return CATEGORY_LABELS[category];
  }

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0] ?? null;
    this.selectedFile.set(file);

    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
    this.previewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  onUploadSubmit(event: Event): void {
    event.preventDefault();
    const file = this.selectedFile();
    const alt  = this.uploadAlt().trim();

    if (!file || !alt) {
      this.actionError.set('Selecciona una imagen y escribe un texto alternativo.');
      return;
    }

    this.isUploading.set(true);
    this.actionError.set('');

    this.photoService.upload(file, alt, this.uploadCategory()).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.activeFilter.set('all');
        this.resetUploadForm();
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo subir la foto. Inténtalo de nuevo.');
        this.isUploading.set(false);
      },
    });
  }

  deletePhoto(photoId: string, photoAlt: string): void {
    if (this.processingId()) return;
    if (!confirm(`"${photoAlt}"\n\n¿Eliminar esta foto? Se borrará de Cloudinary y no se puede recuperar.`)) return;

    this.processingId.set(photoId);
    this.actionError.set('');

    this.photoService.delete(photoId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la foto. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  private resetUploadForm(): void {
    this.uploadAlt.set('');
    this.uploadCategory.set('otros');
    this.selectedFile.set(null);
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
      this.previewUrl.set(null);
    }
    this.fileInputRef().nativeElement.value = '';
  }
}
