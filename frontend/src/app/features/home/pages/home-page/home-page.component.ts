import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { RouteService } from '../../../../core/services/route.service';
import { IPhoto } from '../../../../core/models/photo.model';
import { IRoute, RouteDifficulty, RouteType } from '../../../../core/models/route.model';
import { SeoService } from '../../../../core/services/seo.service';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

interface Highlight {
  readonly icon:        string;
  readonly title:       string;
  readonly description: string;
}

interface AmenityGroup {
  readonly category: string;
  readonly items:    readonly string[];
}

interface Review {
  readonly author:  string;
  readonly date:    string;
  readonly rating:  number;
  readonly text:    string;
  readonly location: string;
}

interface RoutePreviewFallback {
  readonly tag:         string;
  readonly title:       string;
  readonly description: string;
}

const DIFFICULTY_LABELS: Record<RouteDifficulty, string> = {
  easy: 'Fácil', moderate: 'Moderada', hard: 'Difícil',
};

const TYPE_LABELS: Record<RouteType, string> = {
  hiking: 'Senderismo', cycling: 'Ciclismo', driving: 'En coche', walking: 'A pie',
};

@Component({
  selector: 'home-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, ScrollRevealDirective],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly photoService = inject(PhotoService);
  private readonly routeService = inject(RouteService);

  constructor() {
    inject(SeoService).setPage({
      title:         'Alojamiento Rural de Lujo en Valencia',
      description:   'Casa Caldereta en Aielo de Rugat, Valencia. 180m² de uso exclusivo con jacuzzi, terraza privada, barbacoa y vistas a la montaña. Hasta 6 personas. Mascotas bienvenidas.',
      canonicalPath: '/',
      keywords:      'casa rural Valencia, alojamiento exclusivo Aielo de Rugat, jacuzzi rural Valencia, casa vacaciones montaña Valencia',
    });
  }

  private readonly _photos = toSignal(
    this.photoService.getAll().pipe(
      map(response => response.data),
      catchError(() => of([] as IPhoto[])),
    ),
    { initialValue: [] as IPhoto[] },
  );

  private readonly _routes = toSignal(
    this.routeService.getPublished().pipe(
      map(response => response.data),
      catchError(() => of([] as IRoute[])),
    ),
    { initialValue: [] as IRoute[] },
  );

  readonly heroPhoto     = computed(() => this._photos()[0] ?? null);
  readonly previewPhotos = computed(() => this._photos().slice(1, 5));
  readonly previewRoutes = computed(() => this._routes().slice(0, 3));

  readonly openAmenityIndex = signal<number | null>(0);

  toggleAmenity(index: number): void {
    this.openAmenityIndex.update(current => current === index ? null : index);
  }

  difficultyLabel(difficulty: RouteDifficulty): string {
    return DIFFICULTY_LABELS[difficulty] ?? difficulty;
  }

  typeLabel(type: RouteType): string {
    return TYPE_LABELS[type] ?? type;
  }

  readonly highlights: Highlight[] = [
    {
      icon: 'M2.25 12l8.955-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5',
      title: '180m² de uso exclusivo',
      description:
        '2 dormitorios con camas de 180cm (separables en 4 individuales de 90cm) y sofá cama de 160cm. La casa es solo para ti y los tuyos — hasta 6 personas.',
    },
    {
      icon: 'M12 2.25c-1.5 2.5-4.5 6-4.5 9.25a4.5 4.5 0 009 0c0-3.25-3-6.75-4.5-9.25z',
      title: 'Jacuzzi y vistas a la montaña',
      description:
        'Relájate en el jacuzzi mientras disfrutas de las vistas a la montaña desde la terraza privada. Por la noche, enciende la hoguera exterior.',
    },
    {
      icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z',
      title: 'Totalmente equipada',
      description:
        'Cocina completa, WiFi, Smart TV, aire acondicionado y zona de trabajo. Todo lo que necesitas para una estancia perfecta.',
    },
    {
      icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
      title: 'Mascotas bienvenidas',
      description:
        'Tu mascota también es bienvenida. Barbacoa exterior, hoguera y todo el espacio para disfrutar de la naturaleza en familia.',
    },
  ];

  readonly amenityGroups: AmenityGroup[] = [
    {
      category: 'Dormitorios y descanso',
      items: [
        '2 dormitorios',
        'Camas de 180cm',
        'Convertibles en 4 × 90cm',
        'Sofá cama 160cm',
        'Hasta 6 personas',
        'Almohadas y mantas extra',
        'Armario con perchas',
      ],
    },
    {
      category: 'Cocina',
      items: ['Fogones', 'Horno', 'Nevera', 'Lavavajillas', 'Cafetera', 'Copas de vino'],
    },
    {
      category: 'Confort y tecnología',
      items: ['WiFi', 'Smart TV', 'Aire acondicionado', 'Zona de trabajo', 'Jacuzzi'],
    },
    {
      category: 'Baños',
      items: [
        'Baños completos',
        'Agua caliente',
        'Champú y gel de ducha',
        'Secador de pelo',
        'Productos de limpieza',
      ],
    },
    {
      category: 'Exterior',
      items: ['Terraza privada', 'Barbacoa', 'Hoguera', 'Vistas a la montaña'],
    },
    {
      category: 'Política del alojamiento',
      items: ['Uso exclusivo', '180m²', 'Mascotas bienvenidas'],
    },
  ];

  readonly reviews: Review[] = [
    {
      author:   'Laura M.',
      date:     'Mayo 2025',
      rating:   5,
      text:     'Una casa increíble. El jacuzzi con vistas a la montaña es simplemente mágico. Todo estaba impecable y la ubicación es perfecta para desconectar. Volvemos seguro.',
      location: 'Valencia',
    },
    {
      author:   'Carlos y Ana',
      date:     'Abril 2025',
      rating:   5,
      text:     'Escapada perfecta para desconectar. La casa está equipada con todo lo que necesitas. El pueblo es precioso y la naturaleza alrededor es espectacular.',
      location: 'Madrid',
    },
    {
      author:   'Familia Rodríguez',
      date:     'Agosto 2024',
      rating:   5,
      text:     'Fuimos con niños y mascotas y todo fue perfecto. El espacio es amplio, la casa acogedora y el propietario muy atento. Totalmente recomendable.',
      location: 'Barcelona',
    },
  ];

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
