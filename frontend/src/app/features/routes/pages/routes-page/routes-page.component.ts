import { Component, inject } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

type Difficulty = 'Fácil' | 'Moderada' | 'Difícil';

interface TouristRoute {
  readonly id:          number;
  readonly tag:         string;
  readonly title:       string;
  readonly description: string;
  readonly duration:    string;
  readonly distance:    string;
  readonly difficulty:  Difficulty;
}

@Component({
  selector: 'routes-page',
  standalone: true,
  imports: [],
  templateUrl: './routes-page.component.html',
  styleUrl: './routes-page.component.scss',
})
export class RoutesPageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Rutas y Actividades',
      description:   'Descubre las mejores rutas de senderismo, cicloturismo y turismo cultural alrededor de Aielo de Rugat. Naturaleza, historia y gastronomía de la Vall d\'Albaida.',
      canonicalPath: '/rutas',
      keywords:      'rutas senderismo Valencia, Benicadell, Vall d\'Albaida, actividades rurales Valencia, turismo Aielo de Rugat',
    });
  }

  // Sustituir con datos reales cuando estén disponibles
  readonly routes: TouristRoute[] = [
    {
      id: 1,
      tag: 'Naturaleza',
      title: 'Ruta del Benicadell',
      description:
        'Ascenso al emblemático Benicadell con vistas panorámicas a la Vall d\'Albaida y la Marina Alta. Un clásico de la comarca.',
      duration: '4–5 h',
      distance: '12 km',
      difficulty: 'Moderada',
    },
    {
      id: 2,
      tag: 'Historia',
      title: 'Pueblos medievales de la Vall d\'Albaida',
      description:
        'Recorrido en coche por los núcleos históricos de la comarca: castillos, iglesias y cascos antiguos que conservan su esencia medieval.',
      duration: '3 h',
      distance: '40 km',
      difficulty: 'Fácil',
    },
    {
      id: 3,
      tag: 'Gastronomía',
      title: 'Ruta del vino de la Vall d\'Albaida',
      description:
        'Visita a bodegas locales y degustación de los vinos D.O. Valencia. Maridaje con productos artesanos de la comarca.',
      duration: '2–3 h',
      distance: '20 km',
      difficulty: 'Fácil',
    },
    {
      id: 4,
      tag: 'Aventura',
      title: 'Barrancos y fuentes de l\'Albaida',
      description:
        'Senderismo por barrancos con agua, pozas naturales y fuentes históricas. Ideal para los meses de primavera y otoño.',
      duration: '3–4 h',
      distance: '10 km',
      difficulty: 'Moderada',
    },
    {
      id: 5,
      tag: 'Cultura',
      title: 'Ruta de los naranjos',
      description:
        'Paseo entre campos de naranjos en flor. La mejor época es la primavera, cuando el azahar perfuma toda la Vall d\'Albaida.',
      duration: '1–2 h',
      distance: '5 km',
      difficulty: 'Fácil',
    },
  ];

  readonly difficultyClass: Record<Difficulty, string> = {
    'Fácil':    'routes-card__badge--easy',
    'Moderada': 'routes-card__badge--moderate',
    'Difícil':  'routes-card__badge--hard',
  };
}
