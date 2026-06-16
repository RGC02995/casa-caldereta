import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { IRoute, RouteType } from '../../../../core/models/route.model';

interface RoutePreviewFallback {
  readonly tag:         string;
  readonly title:       string;
  readonly description: string;
}

const TYPE_LABELS: Record<RouteType, string> = {
  hiking: 'Senderismo', cycling: 'Ciclismo', driving: 'En coche', walking: 'A pie',
};

@Component({
  selector: 'home-routes-preview',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './home-routes-preview.component.html',
  styleUrl: './home-routes-preview.component.scss',
})
export class HomeRoutesPreviewComponent {
  readonly routes = input<IRoute[]>([]);

  typeLabel(type: RouteType): string {
    return TYPE_LABELS[type] ?? type;
  }

  readonly routePreviewFallbacks: RoutePreviewFallback[] = [
    {
      tag:         'Naturaleza',
      title:       'Ruta por la naturaleza',
      description: 'Descubre los paisajes únicos de los alrededores de Aielo de Rugat.',
    },
    {
      tag:         'Historia',
      title:       'Ruta histórica',
      description: 'Castillos, pueblos y patrimonio cultural de La Costera.',
    },
    {
      tag:         'Gastronomía',
      title:       'Ruta gastronómica',
      description: 'Vinos, naranjas y cocina valenciana de kilómetro cero.',
    },
  ];
}
