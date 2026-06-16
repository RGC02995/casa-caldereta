import { Component, input, output } from '@angular/core';
import { IRoute, RouteDifficulty, RouteType } from '../../../../core/models/route.model';

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
  selector:    'admin-route-list',
  standalone:  true,
  imports:     [],
  templateUrl: './admin-route-list.component.html',
  styleUrl:    './admin-route-list.component.scss',
})
export class AdminRouteListComponent {
  readonly routes        = input<IRoute[]>([]);
  readonly processingId  = input<string | null>(null);
  readonly loadError     = input('');
  readonly isFormVisible = input(false);

  readonly editRoute       = output<IRoute>();
  readonly togglePublished = output<IRoute>();
  readonly deleteRoute     = output<IRoute>();

  getDifficultyLabel(difficulty: RouteDifficulty): string {
    return DIFFICULTY_LABELS[difficulty];
  }

  getTypeLabel(type: RouteType): string {
    return TYPE_LABELS[type];
  }
}
