import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
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
  selector: 'routes-page',
  standalone: true,
  imports: [],
  templateUrl: './routes-page.component.html',
  styleUrl: './routes-page.component.scss',
})
export class RoutesPageComponent {
  private readonly routeService = inject(RouteService);

  constructor() {
    inject(SeoService).setPage({
      title:         'Rutas y Actividades',
      description:   "Descubre las mejores rutas de senderismo, cicloturismo y turismo cultural alrededor de Aielo de Rugat. Naturaleza, historia y gastronomía de la Vall d'Albaida.",
      canonicalPath: '/rutas',
      keywords:      "rutas senderismo Valencia, Benicadell, Vall d'Albaida, actividades rurales Valencia, turismo Aielo de Rugat",
    });
  }

  readonly isLoading = signal(true);
  readonly loadError = signal('');

  readonly routes = toSignal(
    this.routeService.getPublished().pipe(
      map(response => {
        this.isLoading.set(false);
        return response.data;
      }),
      catchError(() => {
        this.loadError.set('No se pudieron cargar las rutas.');
        this.isLoading.set(false);
        return of([] as IRoute[]);
      }),
    ),
    { initialValue: [] as IRoute[] },
  );

  difficultyLabel(difficulty: RouteDifficulty): string {
    return DIFFICULTY_LABELS[difficulty] ?? difficulty;
  }

  typeLabel(type: RouteType): string {
    return TYPE_LABELS[type] ?? type;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
  }

  padNumber(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
