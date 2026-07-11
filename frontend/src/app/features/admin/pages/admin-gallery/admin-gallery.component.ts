import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PhotoService } from '../../../../core/services/photo.service';
import { SiteSettingsService } from '../../../../core/services/site-settings.service';
import { IPhoto, PhotoCategory } from '../../../../core/models/photo.model';
import { AdminGalleryUploadComponent } from '../../components/admin-gallery-upload/admin-gallery-upload.component';
import {
  AdminGalleryGridComponent,
  IPhotoDeleteEvent,
} from '../../components/admin-gallery-grid/admin-gallery-grid.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

type CategoryFilter = 'all' | PhotoCategory;

interface IPendingConfirm {
  readonly message: string;
  readonly action:  () => void;
}

@Component({
  selector:    'admin-gallery',
  imports:     [AdminGalleryUploadComponent, AdminGalleryGridComponent, ConfirmModalComponent],
  templateUrl: './admin-gallery.component.html',
  styleUrl:    './admin-gallery.component.scss',
})
export class AdminGalleryComponent {
  private readonly photoService        = inject(PhotoService);
  private readonly siteSettingsService = inject(SiteSettingsService);
  private readonly destroyRef          = inject(DestroyRef);

  readonly pendingConfirm = signal<IPendingConfirm | null>(null);

  readonly loadError    = signal('');
  readonly deleteError  = signal('');
  readonly heroError    = signal('');
  readonly activeFilter = signal<CategoryFilter>('all');
  readonly processingId = signal<string | null>(null);

  private readonly refresh$         = new BehaviorSubject<void>(undefined);
  private readonly settingsRefresh$ = new BehaviorSubject<void>(undefined);

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

  readonly heroPhotoId = toSignal(
    this.settingsRefresh$.pipe(
      switchMap(() => this.siteSettingsService.get().pipe(
        map(response => response.data.heroPhotoId),
        catchError(() => of(null as string | null)),
      )),
    ),
    { initialValue: null as string | null },
  );

  readonly filteredPhotos = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allPhotos();
    return this.allPhotos().filter(photo => photo.category === filter);
  });

  onUploadCompleted(): void {
    this.activeFilter.set('all');
    this.refresh$.next();
  }

  onDeleteRequested(event: IPhotoDeleteEvent): void {
    if (this.processingId()) return;

    this.pendingConfirm.set({
      message: `"${event.photoAlt}"\n\n¿Eliminar esta foto? Se borrará de Cloudinary y no se puede recuperar.`,
      action:  () => this.executeDelete(event),
    });
  }

  private executeDelete(event: IPhotoDeleteEvent): void {
    this.processingId.set(event.photoId);
    this.deleteError.set('');

    this.photoService.delete(event.photoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.deleteError.set('No se pudo eliminar la foto. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  onSetHeroRequested(photoId: string): void {
    if (this.processingId()) return;

    this.processingId.set(photoId);
    this.heroError.set('');

    this.siteSettingsService.setHeroPhoto(photoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processingId.set(null);
          this.settingsRefresh$.next();
        },
        error: () => {
          this.heroError.set('No se pudo actualizar la imagen del hero. Inténtalo de nuevo.');
          this.processingId.set(null);
        },
      });
  }

  onConfirmModalConfirmed(): void {
    const action = this.pendingConfirm()?.action;
    this.pendingConfirm.set(null);
    action?.();
  }

  onConfirmModalCancelled(): void {
    this.pendingConfirm.set(null);
  }
}
