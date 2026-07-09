import { Component, computed, inject, signal, viewChild, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, switchMap, concatMap, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RouteService } from '../../../../core/services/route.service';
import { IRoute } from '../../../../core/models/route.model';
import { AdminRouteFormComponent, IRouteFormSubmitEvent } from '../../components/admin-route-form/admin-route-form.component';
import { AdminRouteListComponent } from '../../components/admin-route-list/admin-route-list.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

type FormMode = 'hidden' | 'create' | 'edit';

interface IPendingConfirm {
  readonly message: string;
  readonly action:  () => void;
}

@Component({
  selector:    'admin-routes',
  imports:     [AdminRouteFormComponent, AdminRouteListComponent, ConfirmModalComponent],
  templateUrl: './admin-routes.component.html',
  styleUrl:    './admin-routes.component.scss',
})
export class AdminRoutesComponent {
  private readonly routeService = inject(RouteService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly routeFormRef = viewChild<AdminRouteFormComponent>('routeForm');

  readonly pendingConfirm = signal<IPendingConfirm | null>(null);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly isSubmitting = signal(false);
  readonly processingId = signal<string | null>(null);
  readonly formMode     = signal<FormMode>('hidden');
  readonly editingRoute = signal<IRoute | null>(null);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly allRoutes = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.routeService.getAll().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudieron cargar las rutas.');
          return of([] as IRoute[]);
        }),
      )),
    ),
    { initialValue: [] as IRoute[] },
  );

  readonly sortedRoutes = computed(() =>
    [...this.allRoutes()].sort((routeA, routeB) => routeA.order - routeB.order),
  );

  openCreateForm(): void {
    this.editingRoute.set(null);
    this.actionError.set('');
    this.formMode.set('create');
  }

  openEditForm(route: IRoute): void {
    this.editingRoute.set(route);
    this.actionError.set('');
    this.formMode.set('edit');
  }

  closeForm(): void {
    this.formMode.set('hidden');
    this.editingRoute.set(null);
    this.actionError.set('');
  }

  onFormSubmit(event: IRouteFormSubmitEvent): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.actionError.set('');

    const currentFormMode  = this.formMode();
    const currentRoute     = this.editingRoute();

    const saveRequest = currentFormMode === 'create'
      ? this.routeService.create({ ...event.payload, isPublished: false })
      : this.routeService.update(currentRoute!.id, event.payload);

    saveRequest.pipe(
      concatMap(response => {
        const routeId = currentFormMode === 'create' ? response.data.id : currentRoute!.id;
        const uploads: Observable<unknown>[] = [];

        if (event.coverImageFile) {
          uploads.push(
            this.routeService.uploadCoverImage(routeId, event.coverImageFile).pipe(
              catchError(() => {
                this.actionError.set('Ruta guardada, pero la imagen de portada no se pudo subir.');
                return of(null);
              }),
            ),
          );
        }

        event.pointImageFiles.forEach((file, index) => {
          if (!file) return;
          uploads.push(
            this.routeService.uploadPointImage(routeId, index, file).pipe(
              catchError(() => {
                this.actionError.set('Ruta guardada, pero alguna imagen de punto no se pudo subir.');
                return of(null);
              }),
            ),
          );
        });

        event.galleryImageFiles.forEach(file => {
          uploads.push(
            this.routeService.uploadGalleryImage(routeId, file).pipe(
              catchError(() => {
                this.actionError.set('Ruta guardada, pero alguna imagen de galería no se pudo subir.');
                return of(null);
              }),
            ),
          );
        });

        return uploads.length ? from(uploads).pipe(concatMap(upload => upload)) : of(null);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeForm();
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo guardar la ruta. Inténtalo de nuevo.');
        this.isSubmitting.set(false);
      },
    });
  }

  onGalleryImageDelete(publicId: string): void {
    const route = this.editingRoute();
    if (!route) return;

    this.routeService.deleteGalleryImage(route.id, publicId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.routeFormRef()?.removeGalleryPreviewLocally(publicId);
        },
        error: () => {
          this.actionError.set('No se pudo eliminar la imagen de la galería.');
        },
      });
  }

  onTogglePublished(route: IRoute): void {
    if (this.processingId()) return;
    this.processingId.set(route.id);
    this.actionError.set('');

    this.routeService.togglePublished(route.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo cambiar el estado de publicación.');
        this.processingId.set(null);
      },
    });
  }

  onDeleteRoute(route: IRoute): void {
    if (this.processingId()) return;

    this.pendingConfirm.set({
      message: `¿Eliminar la ruta "${route.title}"? Esta acción no se puede deshacer.`,
      action:  () => this.executeDeleteRoute(route),
    });
  }

  private executeDeleteRoute(route: IRoute): void {
    this.processingId.set(route.id);
    this.actionError.set('');

    this.routeService.delete(route.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la ruta. Inténtalo de nuevo.');
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
