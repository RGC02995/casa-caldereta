import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { IRoute, IRoutePoint, IRouteImage, RouteDifficulty, RouteType } from '../../../../core/models/route.model';

const URL_PATTERN = /^https?:\/\/.+/i;

export interface IRouteFormPayload {
  title:              string;
  description:        string;
  distance:            number;
  duration:            number;
  difficulty:          RouteDifficulty;
  type:                RouteType;
  order:               number;
  points:              IRoutePoint[];
  externalLinkLabel:   string;
  externalLinkUrl:     string;
}

export interface IRouteFormSubmitEvent {
  payload:           IRouteFormPayload;
  coverImageFile:    File | null;
  pointImageFiles:   (File | null)[];
  galleryImageFiles: File[];
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
  imageUrl:    string;
  lat:         number | null;
  lng:         number | null;
  linkUrl:     string;
}

const EMPTY_POINT: IRoutePointFormRow = { name: '', description: '', imageUrl: '', lat: null, lng: null, linkUrl: '' };

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

function swapAt<T>(items: T[], indexA: number, indexB: number): T[] {
  const copy = [...items];
  const valueA = copy[indexA];
  const valueB = copy[indexB];
  copy[indexA] = valueB as T;
  copy[indexB] = valueA as T;
  return copy;
}

@Component({
  selector:    'admin-route-form',
  imports:     [],
  templateUrl: './admin-route-form.component.html',
  styleUrl:    './admin-route-form.component.scss',
})
export class AdminRouteFormComponent {
  readonly mode         = input<'create' | 'edit'>('create');
  readonly initialRoute = input<IRoute | null>(null);
  readonly isSubmitting = input(false);

  readonly formSubmit         = output<IRouteFormSubmitEvent>();
  readonly formCancel         = output<void>();
  readonly galleryImageDelete = output<string>();

  readonly formData             = signal<IRouteForm>({ ...EMPTY_FORM, points: [] });
  readonly coverImageFile       = signal<File | null>(null);
  readonly coverImagePreview    = signal<string>('');
  readonly currentCoverImageUrl = signal<string>('');
  readonly externalLinkLabel    = signal('');
  readonly externalLinkUrl      = signal('');
  readonly validationError      = signal('');

  readonly pointImageFiles    = signal<(File | null)[]>([]);
  readonly pointImagePreviews = signal<string[]>([]);

  readonly galleryImageFiles     = signal<File[]>([]);
  readonly galleryPendingPreviews = signal<string[]>([]);
  readonly galleryPreviews       = signal<IRouteImage[]>([]);

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
            points:      route.points.map(point => ({
              name:        point.name,
              description: point.description,
              imageUrl:    point.imageUrl ?? '',
              lat:         point.lat ?? null,
              lng:         point.lng ?? null,
              linkUrl:     point.linkUrl ?? '',
            })),
          });
          this.currentCoverImageUrl.set(route.coverImageUrl ?? '');
          this.coverImagePreview.set(route.coverImageUrl ?? '');
          this.externalLinkLabel.set(route.externalLinkLabel ?? '');
          this.externalLinkUrl.set(route.externalLinkUrl ?? '');
          this.pointImageFiles.set(route.points.map(() => null));
          this.pointImagePreviews.set(route.points.map(point => point.imageUrl ?? ''));
          this.galleryPreviews.set(route.images ?? []);
        } else {
          this.formData.set({ ...EMPTY_FORM, points: [] });
          this.currentCoverImageUrl.set('');
          this.coverImagePreview.set('');
          this.externalLinkLabel.set('');
          this.externalLinkUrl.set('');
          this.pointImageFiles.set([]);
          this.pointImagePreviews.set([]);
          this.galleryPreviews.set([]);
        }
        this.coverImageFile.set(null);
        this.galleryImageFiles.set([]);
        this.galleryPendingPreviews.set([]);
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
      points: [...currentForm.points, { ...EMPTY_POINT }],
    }));
    this.pointImageFiles.update(files => [...files, null]);
    this.pointImagePreviews.update(previews => [...previews, '']);
  }

  removePoint(pointIndex: number): void {
    this.formData.update(currentForm => ({
      ...currentForm,
      points: currentForm.points.filter((_, index) => index !== pointIndex),
    }));
    this.pointImageFiles.update(files => files.filter((_, index) => index !== pointIndex));
    this.pointImagePreviews.update(previews => previews.filter((_, index) => index !== pointIndex));
  }

  movePointUp(pointIndex: number): void {
    if (pointIndex <= 0) return;
    this.swapPoints(pointIndex, pointIndex - 1);
  }

  movePointDown(pointIndex: number): void {
    if (pointIndex >= this.formData().points.length - 1) return;
    this.swapPoints(pointIndex, pointIndex + 1);
  }

  private swapPoints(indexA: number, indexB: number): void {
    this.formData.update(currentForm => ({ ...currentForm, points: swapAt(currentForm.points, indexA, indexB) }));
    this.pointImageFiles.update(files => swapAt(files, indexA, indexB));
    this.pointImagePreviews.update(previews => swapAt(previews, indexA, indexB));
  }

  updatePointField(pointIndex: number, field: keyof IRoutePointFormRow, value: string | number | null): void {
    this.formData.update(currentForm => {
      const updatedPoints = currentForm.points.map((point, index) =>
        index === pointIndex ? { ...point, [field]: value } : point,
      );
      return { ...currentForm, points: updatedPoints };
    });
  }

  onPointImageSelected(pointIndex: number, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;
    this.pointImageFiles.update(files => files.map((currentFile, index) => (index === pointIndex ? file : currentFile)));
    this.pointImagePreviews.update(previews =>
      previews.map((preview, index) => (index === pointIndex ? URL.createObjectURL(file) : preview)),
    );
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

  onGalleryFilesSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const files = Array.from(inputElement.files ?? []);
    if (files.length === 0) return;
    this.galleryImageFiles.update(currentFiles => [...currentFiles, ...files]);
    this.galleryPendingPreviews.update(previews => [...previews, ...files.map(file => URL.createObjectURL(file))]);
    inputElement.value = '';
  }

  removePendingGalleryFile(fileIndex: number): void {
    this.galleryImageFiles.update(files => files.filter((_, index) => index !== fileIndex));
    this.galleryPendingPreviews.update(previews => previews.filter((_, index) => index !== fileIndex));
  }

  onGalleryImageDeleteClick(publicId: string): void {
    this.galleryImageDelete.emit(publicId);
  }

  removeGalleryPreviewLocally(publicId: string): void {
    this.galleryPreviews.update(previews => previews.filter(image => image.publicId !== publicId));
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
    const externalLinkUrl = this.externalLinkUrl().trim();
    if (externalLinkUrl && !URL_PATTERN.test(externalLinkUrl)) {
      this.validationError.set('El enlace externo de la ruta no es una URL válida (debe empezar por http:// o https://).');
      return;
    }
    for (const point of currentForm.points) {
      const linkUrl = point.linkUrl.trim();
      if (linkUrl && !URL_PATTERN.test(linkUrl)) {
        this.validationError.set(`El enlace del punto "${point.name}" no es una URL válida.`);
        return;
      }
      if (point.lat !== null && (point.lat < -90 || point.lat > 90)) {
        this.validationError.set(`La latitud del punto "${point.name}" debe estar entre -90 y 90.`);
        return;
      }
      if (point.lng !== null && (point.lng < -180 || point.lng > 180)) {
        this.validationError.set(`La longitud del punto "${point.name}" debe estar entre -180 y 180.`);
        return;
      }
    }

    this.validationError.set('');
    this.formSubmit.emit({
      payload: {
        title:             currentForm.title.trim(),
        description:       currentForm.description.trim(),
        distance:          currentForm.distance,
        duration:          currentForm.duration,
        difficulty:        currentForm.difficulty,
        type:              currentForm.type,
        order:             currentForm.order,
        points:            currentForm.points.map(point => ({
          name:        point.name.trim(),
          description: point.description.trim(),
          imageUrl:    point.imageUrl || undefined,
          lat:         point.lat ?? undefined,
          lng:         point.lng ?? undefined,
          linkUrl:     point.linkUrl.trim() || undefined,
        })) as IRoutePoint[],
        externalLinkLabel: this.externalLinkLabel().trim(),
        externalLinkUrl,
      },
      coverImageFile:    this.coverImageFile(),
      pointImageFiles:   this.pointImageFiles(),
      galleryImageFiles: this.galleryImageFiles(),
    });
  }

  onCancel(): void {
    this.formCancel.emit();
  }
}
