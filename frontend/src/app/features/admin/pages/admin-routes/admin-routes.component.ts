import { Component, computed, inject, signal, viewChild, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, switchMap, concatMap, from, of } from 'rxjs';
import { map, catchError, toArray } from 'rxjs/operators';
import { RouteService } from '../../../../core/services/route.service';
import { IRoute } from '../../../../core/models/route.model';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { AdminRouteFormComponent, IRouteFormSubmitEvent } from '../../components/admin-route-form/admin-route-form.component';
import { AdminRouteListComponent } from '../../components/admin-route-list/admin-route-list.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

type FormMode = 'hidden' | 'create' | 'edit';

interface IPendingConfirm {
  readonly message: string;
  readonly action:  () => void;
}

interface IUploadTask {
  readonly label:   string;
  readonly request: Observable<ApiResponse<IRoute>>;
}

interface IUploadOutcome {
  readonly label:   string;
  readonly success: boolean;
  readonly route?:  IRoute;
  readonly reason?: string;
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

  readonly loadError      = signal('');
  readonly actionError    = signal('');
  readonly uploadFailures = signal<string[]>([]);
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
    this.uploadFailures.set([]);
    this.formMode.set('create');
  }

  openEditForm(route: IRoute): void {
    this.editingRoute.set(route);
    this.actionError.set('');
    this.uploadFailures.set([]);
    this.formMode.set('edit');
  }

  closeForm(): void {
    this.formMode.set('hidden');
    this.editingRoute.set(null);
    this.actionError.set('');
    this.uploadFailures.set([]);
  }

  onFormSubmit(event: IRouteFormSubmitEvent): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.actionError.set('');
    this.uploadFailures.set([]);

    const currentFormMode = this.formMode();
    const currentRoute    = this.editingRoute();

    const saveRequest = currentFormMode === 'create'
      ? this.routeService.create({ ...event.payload, isPublished: false })
      : this.routeService.update(currentRoute!.id, event.payload);

    let savedRoute!: IRoute;

    saveRequest.pipe(
      concatMap(response => {
        savedRoute = response.data;
        return this.runUploadTasks(this.buildUploadTasks(savedRoute.id, event));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: outcomes => this.handleSaveOutcome(currentFormMode, savedRoute, outcomes),
      error: () => {
        this.actionError.set('No se pudo guardar la ruta. Inténtalo de nuevo.');
        this.isSubmitting.set(false);
      },
    });
  }

  private buildUploadTasks(routeId: string, event: IRouteFormSubmitEvent): IUploadTask[] {
    const tasks: IUploadTask[] = [];

    if (event.coverImageFile) {
      tasks.push({
        label:   'la portada',
        request: this.routeService.uploadCoverImage(routeId, event.coverImageFile),
      });
    }

    event.pointImageFiles.forEach((file, index) => {
      if (!file) return;
      const pointName = event.payload.points[index]?.name;
      tasks.push({
        label:   pointName ? `el punto ${index + 1}: ${pointName}` : `el punto ${index + 1}`,
        request: this.routeService.uploadPointImage(routeId, index, file),
      });
    });

    event.galleryImageFiles.forEach((file, index) => {
      tasks.push({
        label:   `la imagen de galería ${index + 1} (${file.name})`,
        request: this.routeService.uploadGalleryImage(routeId, file),
      });
    });

    return tasks;
  }

  private runUploadTasks(tasks: IUploadTask[]): Observable<IUploadOutcome[]> {
    if (tasks.length === 0) return of([]);

    return from(tasks).pipe(
      concatMap(task =>
        task.request.pipe(
          map(response => ({ label: task.label, success: true as const, route: response.data })),
          catchError((error: unknown) => {
            console.error(`[AdminRoutes] Fallo al subir ${task.label}:`, error);
            return of({ label: task.label, success: false as const, reason: this.describeUploadError(error) });
          }),
        ),
      ),
      toArray(),
    );
  }

  private describeUploadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'no se pudo subir. Inténtalo de nuevo.';
  }

  private handleSaveOutcome(formModeAtSubmit: FormMode, savedRoute: IRoute, outcomes: IUploadOutcome[]): void {
    this.isSubmitting.set(false);
    this.refresh$.next();

    const failures = outcomes.filter(outcome => !outcome.success);

    let latestRoute = savedRoute;
    for (const outcome of outcomes) {
      if (outcome.success && outcome.route) latestRoute = outcome.route;
    }

    if (failures.length === 0) {
      this.closeForm();
      return;
    }

    this.uploadFailures.set(failures.map(failure => `No se pudo subir ${failure.label}: ${failure.reason}`));
    this.actionError.set('La ruta se guardó correctamente, pero alguna imagen no se pudo subir. Revisa el detalle abajo y vuelve a intentarlo.');
    this.editingRoute.set(latestRoute);
    if (formModeAtSubmit === 'create') this.formMode.set('edit');
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
