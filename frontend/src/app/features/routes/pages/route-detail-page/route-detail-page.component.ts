import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouteService } from '../../../../core/services/route.service';
import { IRoute, RouteDifficulty, RouteType } from '../../../../core/models/route.model';
import { SeoService } from '../../../../core/services/seo.service';

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
  selector:    'route-detail-page',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './route-detail-page.component.html',
  styleUrl:    './route-detail-page.component.scss',
})
export class RouteDetailPageComponent {
  private readonly routeService = inject(RouteService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly slug: string = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';

  readonly isLoading = signal(true);
  readonly loadError = signal('');
  readonly routeData = signal<IRoute | null>(null);

  constructor() {
    if (!this.slug) {
      this.isLoading.set(false);
      this.loadError.set('Ruta no encontrada.');
      return;
    }

    this.routeService.getBySlug(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.routeData.set(response.data);
          this.isLoading.set(false);
          inject(SeoService).setPage({
            title:         response.data.title,
            description:   response.data.description,
            canonicalPath: `/rutas/${response.data.slug}`,
            keywords:      `${response.data.title}, rutas Valencia, actividades Aielo de Rugat`,
          });
        },
        error: () => {
          this.loadError.set('No se pudo cargar esta ruta.');
          this.isLoading.set(false);
        },
      });
  }

  difficultyLabel(difficulty: RouteDifficulty): string {
    return DIFFICULTY_LABELS[difficulty] ?? difficulty;
  }

  typeLabel(type: RouteType): string {
    return TYPE_LABELS[type] ?? type;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours     = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  }
}
