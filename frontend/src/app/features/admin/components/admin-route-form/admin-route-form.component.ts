import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { IRoute, IRoutePoint, RouteDifficulty, RouteType } from '../../../../core/models/route.model';

export interface IRouteFormPayload {
  title:       string;
  description: string;
  distance:    number;
  duration:    number;
  difficulty:  RouteDifficulty;
  type:        RouteType;
  order:       number;
  points:      IRoutePoint[];
}

export interface IRouteFormSubmitEvent {
  payload:        IRouteFormPayload;
  coverImageFile: File | null;
}

interface IRouteForm {
  title:       string;
  description: string;
  distance:    number;
  duration:    number;
  difficulty:  RouteDifficulty;
  type:        RouteType;
  order:       number;
  points:      IRoutePointFormRow[];
}

interface IRoutePointFormRow {
  name:        string;
  description: string;
}

const EMPTY_FORM: IRouteForm = {
  title:       '',
  description: '',
  distance:    0,
  duration:    0,
  difficulty:  'easy',
  type:        'hiking',
  order:       0,
  points:      [],
};

@Component({
  selector:    'admin-route-form',
  standalone:  true,
  imports:     [],
  templateUrl: './admin-route-form.component.html',
  styleUrl:    './admin-route-form.component.scss',
})
export class AdminRouteFormComponent {
  readonly mode         = input<'create' | 'edit'>('create');
  readonly initialRoute = input<IRoute | null>(null);
  readonly isSubmitting = input(false);

  readonly formSubmit = output<IRouteFormSubmitEvent>();
  readonly formCancel = output<void>();

  readonly formData             = signal<IRouteForm>({ ...EMPTY_FORM, points: [] });
  readonly coverImageFile       = signal<File | null>(null);
  readonly coverImagePreview    = signal<string>('');
  readonly currentCoverImageUrl = signal<string>('');
  readonly validationError      = signal('');

  readonly difficulties: { label: string; value: RouteDifficulty }[] = [
    { label: 'Fácil',    value: 'easy'     },
    { label: 'Moderada', value: 'moderate' },
    { label: 'Difícil',  value: 'hard'     },
  ];

  readonly types: { label: string; value: RouteType }[] = [
    { label: 'Senderismo', value: 'hiking'  },
    { label: 'Ciclismo',   value: 'cycling' },
    { label: 'En coche',   value: 'driving' },
    { label: 'A pie',      value: 'walking' },
  ];

  constructor() {
    effect(() => {
      const route = this.initialRoute();
      untracked(() => {
        if (route) {
          this.formData.set({
            title:       route.title,
            description: route.description,
            distance:    route.distance,
            duration:    route.duration,
            difficulty:  route.difficulty,
            type:        route.type,
            order:       route.order,
            points:      route.points.map(point => ({ name: point.name, description: point.description })),
          });
          this.currentCoverImageUrl.set(route.coverImageUrl ?? '');
          this.coverImagePreview.set(route.coverImageUrl ?? '');
        } else {
          this.formData.set({ ...EMPTY_FORM, points: [] });
          this.currentCoverImageUrl.set('');
          this.coverImagePreview.set('');
        }
        this.coverImageFile.set(null);
        this.validationError.set('');
      });
    });
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

  updatePointField(pointIndex: number, field: keyof IRoutePointFormRow, value: string): void {
    this.formData.update(currentForm => {
      const updatedPoints = currentForm.points.map((point, index) =>
        index === pointIndex ? { ...point, [field]: value } : point,
      );
      return { ...currentForm, points: updatedPoints };
    });
  }

  onCoverImageSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;
    this.coverImageFile.set(file);
    this.coverImagePreview.set(URL.createObjectURL(file));
  }

  clearCoverImage(): void {
    this.coverImageFile.set(null);
    this.coverImagePreview.set(this.currentCoverImageUrl());
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    const currentForm = this.formData();

    if (!currentForm.title.trim()) {
      this.validationError.set('El título es obligatorio.');
      return;
    }
    if (!currentForm.description.trim()) {
      this.validationError.set('La descripción es obligatoria.');
      return;
    }
    const invalidPoint = currentForm.points.find(
      point => !point.name.trim() || !point.description.trim(),
    );
    if (invalidPoint) {
      this.validationError.set('Todos los puntos de ruta deben tener nombre y descripción.');
      return;
    }

    this.validationError.set('');
    this.formSubmit.emit({
      payload: {
        title:       currentForm.title.trim(),
        description: currentForm.description.trim(),
        distance:    currentForm.distance,
        duration:    currentForm.duration,
        difficulty:  currentForm.difficulty,
        type:        currentForm.type,
        order:       currentForm.order,
        points:      currentForm.points.map(point => ({
          name:        point.name.trim(),
          description: point.description.trim(),
        })) as IRoutePoint[],
      },
      coverImageFile: this.coverImageFile(),
    });
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}
