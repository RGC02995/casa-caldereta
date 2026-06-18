import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, concatMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RouteService } from '../../../../core/services/route.service';
import { IRoute } from '../../../../core/models/route.model';
import { AdminRouteFormComponent, IRouteFormSubmitEvent } from '../../components/admin-route-form/admin-route-form.component';
import { AdminRouteListComponent } from '../../components/admin-route-list/admin-route-list.component';

type FormMode = 'hidden' | 'create' | 'edit';

@Component({
  selector:    'admin-routes',
  imports:     [AdminRouteFormComponent, AdminRouteListComponent],
  templateUrl: './admin-routes.component.html',
  styleUrl:    './admin-routes.component.scss',
})
export class AdminRoutesComponent {
  private readonly routeService = inject(RouteService);
  private readonly destroyRef   = inject(DestroyRef);

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
        return event.coverImageFile
          ? this.routeService.uploadCoverImage(routeId, event.coverImageFile).pipe(
              catchError(() => {
                this.actionError.set('Ruta guardada, pero la imagen de portada no se pudo subir.');
                return of(null);
              }),
            )
          : of(null);
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
    if (!confirm(`¿Eliminar la ruta "${route.title}"? Esta acción no se puede deshacer.`)) return;

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
}
