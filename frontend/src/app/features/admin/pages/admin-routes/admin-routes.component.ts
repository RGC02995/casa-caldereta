import { Component, inject, signal, computed } from '@angular/core';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RouteService } from '../../../../core/services/route.service';
import { IRoute, IRoutePoint, RouteDifficulty, RouteType } from '../../../../core/models/route.model';

type FormMode = 'hidden' | 'create' | 'edit';

interface IRouteForm {
  title:         string;
  description:   string;
  distance:      number;
  duration:      number;
  difficulty:    RouteDifficulty;
  type:          RouteType;
  coverImageUrl: string;
  order:         number;
  points:        IRoutPointFormRow[];
}

interface IRoutPointFormRow {
  name:        string;
  description: string;
}

const EMPTY_FORM: IRouteForm = {
  title:         '',
  description:   '',
  distance:      0,
  duration:      0,
  difficulty:    'easy',
  type:          'hiking',
  coverImageUrl: '',
  order:         0,
  points:        [],
};

const DIFFICULTY_LABELS: Record<RouteDifficulty, string> = {
  easy:     'Fácil',
  moderate: 'Moderada',
  hard:     'Difícil',
};

const TYPE_LABELS: Record<RouteType, string> = {
  hiking:  'Senderismo',
  cycling: 'Ciclismo',
  driving: 'En coche',
  walking: 'A pie',
};

@Component({
  selector:    'admin-routes',
  imports:     [],
  templateUrl: './admin-routes.component.html',
  styleUrl:    './admin-routes.component.scss',
})
export class AdminRoutesComponent {
  private readonly routeService = inject(RouteService);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly isSubmitting = signal(false);
  readonly processingId = signal<string | null>(null);
  readonly allRoutes    = signal<IRoute[]>([]);
  readonly formMode     = signal<FormMode>('hidden');
  readonly editingId    = signal<string | null>(null);
  readonly formData     = signal<IRouteForm>({ ...EMPTY_FORM });

  readonly sortedRoutes = computed(() =>
    [...this.allRoutes()].sort((routeA, routeB) => routeA.order - routeB.order),
  );

  readonly difficulties: { label: string; value: RouteDifficulty }[] = [
    { label: 'Fácil',     value: 'easy'     },
    { label: 'Moderada',  value: 'moderate' },
    { label: 'Difícil',   value: 'hard'     },
  ];

  readonly types: { label: string; value: RouteType }[] = [
    { label: 'Senderismo', value: 'hiking'  },
    { label: 'Ciclismo',   value: 'cycling' },
    { label: 'En coche',   value: 'driving' },
    { label: 'A pie',      value: 'walking' },
  ];

  getDifficultyLabel(difficulty: RouteDifficulty): string {
    return DIFFICULTY_LABELS[difficulty];
  }

  getTypeLabel(type: RouteType): string {
    return TYPE_LABELS[type];
  }

  constructor() {
    this.loadRoutes();
  }

  openCreateForm(): void {
    this.formData.set({ ...EMPTY_FORM, points: [] });
    this.editingId.set(null);
    this.actionError.set('');
    this.formMode.set('create');
  }

  openEditForm(route: IRoute): void {
    this.formData.set({
      title:         route.title,
      description:   route.description,
      distance:      route.distance,
      duration:      route.duration,
      difficulty:    route.difficulty,
      type:          route.type,
      coverImageUrl: route.coverImageUrl,
      order:         route.order,
      points:        route.points.map(point => ({ name: point.name, description: point.description })),
    });
    this.editingId.set(route.id);
    this.actionError.set('');
    this.formMode.set('edit');
  }

  closeForm(): void {
    this.formMode.set('hidden');
    this.editingId.set(null);
    this.formData.set({ ...EMPTY_FORM });
    this.actionError.set('');
  }

  updateFormField<K extends keyof IRouteForm>(field: K, value: IRouteForm[K]): void {
    this.formData.update(currentForm => ({ ...currentForm, [field]: value }));
  }

  addPoint(): void {
    this.formData.update(currentForm => ({
      ...currentForm,
      points: [...currentForm.points, { name: '', description: '' }],
    }));
  }

  removePoint(pointIndex: number): void {
    this.formData.update(currentForm => ({
      ...currentForm,
      points: currentForm.points.filter((_, index) => index !== pointIndex),
    }));
  }

  updatePointField(pointIndex: number, field: keyof IRoutPointFormRow, value: string): void {
    this.formData.update(currentForm => {
      const updatedPoints = currentForm.points.map((point, index) =>
        index === pointIndex ? { ...point, [field]: value } : point,
      );
      return { ...currentForm, points: updatedPoints };
    });
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    const currentForm = this.formData();

    if (!currentForm.title.trim()) {
      this.actionError.set('El título es obligatorio.');
      return;
    }
    if (!currentForm.description.trim()) {
      this.actionError.set('La descripción es obligatoria.');
      return;
    }
    if (!currentForm.coverImageUrl.trim()) {
      this.actionError.set('La URL de la imagen de portada es obligatoria.');
      return;
    }

    const invalidPoint = currentForm.points.find(
      point => !point.name.trim() || !point.description.trim(),
    );
    if (invalidPoint) {
      this.actionError.set('Todos los puntos de ruta deben tener nombre y descripción.');
      return;
    }

    this.isSubmitting.set(true);
    this.actionError.set('');

    const routePayload = {
      title:         currentForm.title.trim(),
      description:   currentForm.description.trim(),
      distance:      currentForm.distance,
      duration:      currentForm.duration,
      difficulty:    currentForm.difficulty,
      type:          currentForm.type,
      coverImageUrl: currentForm.coverImageUrl.trim(),
      order:         currentForm.order,
      points:        currentForm.points.map(point => ({
        name:        point.name.trim(),
        description: point.description.trim(),
      })),
    };

    const currentEditingId = this.editingId();

    if (this.formMode() === 'create') {
      this.routeService.create({ ...routePayload, isPublished: false }).subscribe({
        next: response => {
          this.allRoutes.update(routes => [response.data, ...routes]);
          this.closeForm();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.actionError.set('No se pudo guardar la ruta. Inténtalo de nuevo.');
          this.isSubmitting.set(false);
        },
      });
    } else if (this.formMode() === 'edit' && currentEditingId) {
      this.routeService.update(currentEditingId, routePayload).subscribe({
        next: response => {
          this.allRoutes.update(routes =>
            routes.map(route => route.id === currentEditingId ? response.data : route),
          );
          this.closeForm();
          this.isSubmitting.set(false);
        },
        error: () => {
          this.actionError.set('No se pudo actualizar la ruta. Inténtalo de nuevo.');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  togglePublished(route: IRoute): void {
    if (this.processingId()) return;

    this.processingId.set(route.id);
    this.actionError.set('');

    this.routeService.togglePublished(route.id).subscribe({
      next: response => {
        this.allRoutes.update(routes =>
          routes.map(existingRoute => existingRoute.id === route.id ? response.data : existingRoute),
        );
        this.processingId.set(null);
      },
      error: () => {
        this.actionError.set('No se pudo cambiar el estado de publicación.');
        this.processingId.set(null);
      },
    });
  }

  deleteRoute(route: IRoute): void {
    if (this.processingId()) return;
    if (!confirm(`¿Eliminar la ruta "${route.title}"? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(route.id);
    this.actionError.set('');

    this.routeService.delete(route.id).subscribe({
      next: () => {
        this.allRoutes.update(routes => routes.filter(existingRoute => existingRoute.id !== route.id));
        this.processingId.set(null);
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la ruta. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  private loadRoutes(): void {
    this.routeService.getAll().pipe(
      map(response => response.data),
      catchError(() => {
        this.loadError.set('No se pudieron cargar las rutas.');
        return of([] as IRoute[]);
      }),
    ).subscribe(routes => this.allRoutes.set(routes));
  }
}
