import { Component, inject, signal, viewChild, ElementRef, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PhotoService } from '../../../../core/services/photo.service';
import { PhotoCategory } from '../../../../core/models/photo.model';

@Component({
  selector:    'admin-gallery-upload',
  standalone:  true,
  imports:     [],
  templateUrl: './admin-gallery-upload.component.html',
  styleUrl:    './admin-gallery-upload.component.scss',
})
export class AdminGalleryUploadComponent {
  private readonly photoService = inject(PhotoService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly uploadAlt      = signal('');
  readonly uploadCategory = signal<PhotoCategory>('otros');
  readonly isUploading    = signal(false);
  readonly selectedFile   = signal<File | null>(null);
  readonly previewUrl     = signal<string | null>(null);
  readonly uploadError    = signal('');

  readonly uploadCompleted = output<void>();

  readonly categories: { label: string; value: PhotoCategory }[] = [
    { label: 'Exterior',   value: 'exterior'   },
    { label: 'Interior',   value: 'interior'   },
    { label: 'Cocina',     value: 'cocina'     },
    { label: 'Dormitorio', value: 'dormitorio' },
    { label: 'Baño',       value: 'bano'       },
    { label: 'Jardín',     value: 'jardin'     },
    { label: 'Otros',      value: 'otros'      },
  ];

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
      this.uploadError.set('Selecciona una imagen y escribe un texto alternativo.');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set('');

    this.photoService.upload(file, alt, this.uploadCategory())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.isUploading.set(false);
        this.resetUploadForm();
        this.uploadCompleted.emit();
      },
      error: () => {
        this.uploadError.set('No se pudo subir la foto. Inténtalo de nuevo.');
        this.isUploading.set(false);
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
