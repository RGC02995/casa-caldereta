import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

interface Highlight {
  readonly image: string;
  readonly alt:   string;
  readonly text:  string;
  readonly size:  'landscape' | 'panoramic' | 'portrait' | 'cinematic' | 'classic';
}

@Component({
  selector: 'home-highlights',
  imports: [TranslatePipe, ScrollRevealDirective],
  templateUrl: './home-highlights.component.html',
  styleUrl: './home-highlights.component.scss',
})
export class HomeHighlightsComponent {
  readonly highlights: Highlight[] = [
    {
      image: 'assets/images/1.jpeg',
      alt:   'Exterior de Casa Caldereta en Aielo de Rugat',
      text:  'Un alojamiento elegante pensado para desconectar y relajarse en un pequeño pueblo tranquilo rodeado de naturaleza donde solo oirás el canto de los pájaros y el sonar del toque de las horas de las campanas.',
      size:  'landscape',
    },
    {
      image: 'assets/images/2.jpeg',
      alt:   'Terraza con vistas al Castell de Rugat y el Benicadell',
      text:  'Preparar una barbacoa en la terraza contemplando las ruinas del Castell de Rugat entre las montañas que rodean el pueblo o el reflejo del sol sobre el Benicadell al atardecer.',
      size:  'panoramic',
    },
    {
      image: 'assets/images/3.jpeg',
      alt:   'Cocina moderna equipada con comedor y estufa de leña',
      text:  'La moderna cocina totalmente equipada la cual está abierta al comedor donde podrás cocinar viendo la televisión de 65 pulgadas y en invierno calentarse con la acogedora estufa de leña.',
      size:  'portrait',
    },
    {
      image: 'assets/images/4.jpeg',
      alt:   'Jacuzzi interior de 180×180 junto a la terraza interior',
      text:  'Unido al comedor y junto a una terraza interior podréis relajaros en el gran jacuzzi de 180×180 cm con capacidad para cinco personas.',
      size:  'cinematic',
    },
    {
      image: 'assets/images/5.jpeg',
      alt:   'Salón-biblioteca del primer piso con habitaciones de matrimonio',
      text:  'La casa dispone en el primer piso de un salón/biblioteca muy luminoso y dos habitaciones de matrimonio con camas de 180 cm que se pueden separar en cuatro camas de 90 cm avisando con antelación y en el comedor un sofá cama de 160 cm muy cómodo.',
      size:  'classic',
    },
  ];
}
