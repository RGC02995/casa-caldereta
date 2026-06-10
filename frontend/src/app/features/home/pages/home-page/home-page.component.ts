import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SeoService } from '../../../../core/services/seo.service';

interface Highlight {
  readonly label:       string;
  readonly title:       string;
  readonly description: string;
}

interface AmenityGroup {
  readonly category: string;
  readonly items:    readonly string[];
}

@Component({
  selector: 'home-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Alojamiento Rural de Lujo en Valencia',
      description:   'Casa Caldereta en Aielo de Rugat, Valencia. 180m² de uso exclusivo con jacuzzi, terraza privada, barbacoa y vistas a la montaña. Hasta 6 personas. Mascotas bienvenidas.',
      canonicalPath: '/',
      keywords:      'casa rural Valencia, alojamiento exclusivo Aielo de Rugat, jacuzzi rural Valencia, casa vacaciones montaña Valencia',
    });
  }

  readonly highlights: Highlight[] = [
    {
      label: '01',
      title: '180m² de uso exclusivo',
      description:
        '2 dormitorios con camas de 180cm (separables en 4 individuales de 90cm) y sofá cama de 160cm. La casa es solo para ti y los tuyos — hasta 6 personas.',
    },
    {
      label: '02',
      title: 'Jacuzzi y vistas a la montaña',
      description:
        'Relájate en el jacuzzi mientras disfrutas de las vistas a la montaña desde la terraza privada. Por la noche, enciende la hoguera exterior.',
    },
    {
      label: '03',
      title: 'Totalmente equipada',
      description:
        'Cocina completa, WiFi, Smart TV, aire acondicionado y zona de trabajo. Todo lo que necesitas para una estancia perfecta.',
    },
    {
      label: '04',
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
      items: [
        'Fogones',
        'Horno',
        'Nevera',
        'Lavavajillas',
        'Cafetera',
        'Copas de vino',
      ],
    },
    {
      category: 'Confort y tecnología',
      items: [
        'WiFi',
        'Smart TV',
        'Aire acondicionado',
        'Zona de trabajo',
        'Jacuzzi',
      ],
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
      items: [
        'Terraza privada',
        'Barbacoa',
        'Hoguera',
        'Vistas a la montaña',
      ],
    },
    {
      category: 'Política del alojamiento',
      items: [
        'Uso exclusivo',
        '180m²',
        'Mascotas bienvenidas',
      ],
    },
  ];

  readonly routePreviews = [
    {
      tag: 'Naturaleza',
      title: 'Ruta por la naturaleza',
      description: 'Descubre los paisajes únicos de los alrededores de Aielo de Rugat.',
    },
    {
      tag: 'Historia',
      title: 'Ruta histórica',
      description: 'Castillos, pueblos y patrimonio cultural de La Costera.',
    },
    {
      tag: 'Gastronomía',
      title: 'Ruta gastronómica',
      description: 'Vinos, naranjas y cocina valenciana de kilómetro cero.',
    },
  ];
}
