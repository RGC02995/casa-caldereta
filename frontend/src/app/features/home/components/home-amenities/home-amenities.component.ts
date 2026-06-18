import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

interface AmenityGroup {
  readonly category: string;
  readonly items:    readonly string[];
}

@Component({
  selector: 'home-amenities',
  imports: [TranslatePipe, ScrollRevealDirective],
  templateUrl: './home-amenities.component.html',
  styleUrl: './home-amenities.component.scss',
})
export class HomeAmenitiesComponent {
  readonly openAmenityIndex = signal<number | null>(0);

  toggleAmenity(index: number): void {
    this.openAmenityIndex.update(current => current === index ? null : index);
  }

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
}
