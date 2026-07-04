import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

interface TextSegment {
  readonly text: string;
  readonly em?: boolean;
}

interface Highlight {
  readonly image: string;
  readonly alt: string;
  readonly segments: readonly TextSegment[];
  readonly size: 'landscape' | 'panoramic' | 'portrait' | 'cinematic' | 'classic';
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
      alt: 'Exterior de Casa Caldereta en Aielo de Rugat',
      size: 'landscape',
      segments: [
        { text: 'Un alojamiento elegante pensado para desconectar y relajarse en un pequeño pueblo tranquilo rodeado de naturaleza, donde solo oirás el canto de los pájaros y el sonar del toque de las horas de las ' },
        { text: 'campanas', em: true },
        { text: '.' },
      ],
    },
    {
      image: 'assets/images/2.jpeg',
      alt: 'Terraza con vistas al Castell de Rugat y el Benicadell',
      size: 'panoramic',
      segments: [
        { text: 'Preparar una barbacoa en la terraza contemplando las ruinas del ' },
        { text: 'Castell de Rugat', em: true },
        { text: ' entre las montañas que rodean el pueblo, o el reflejo del sol sobre el ' },
        { text: 'Benicadell', em: true },
        { text: ' al atardecer.' },
      ],
    },
    {
      image: 'assets/images/3.jpeg',
      alt: 'Cocina moderna equipada con comedor y estufa de leña',
      size: 'portrait',
      segments: [
        { text: 'La moderna cocina, totalmente equipada, la cual está abierta al comedor, donde podrás cocinar viendo la ' },
        { text: 'televisión de 65 pulgadas', em: true },
        { text: ' y, en invierno, calentarse con la acogedora ' },
        { text: 'estufa de leña', em: true },
        { text: '.' },
      ],
    },
    {
      image: 'assets/images/4.jpeg',
      alt: 'Jacuzzi interior de 180×180 junto a la terraza interior',
      size: 'cinematic',
      segments: [
        { text: 'Unido al comedor y junto a una terraza interior, podréis relajaros en el gran ' },
        { text: 'jacuzzi', em: true },
        { text: ' de 180×180 cm, con capacidad para cinco personas.' },
      ],
    },
    {
      image: 'assets/images/5.jpeg',
      alt: 'Salón-biblioteca del primer piso con habitaciones de matrimonio',
      size: 'classic',
      segments: [
        { text: 'La casa dispone en el primer piso de un salón-biblioteca muy luminoso y ' },
        { text: 'dos habitaciones de matrimonio', em: true },
        { text: ' con camas de 180 cm, que se pueden separar en cuatro camas de 90 cm avisando con antelación, y en el comedor un ' },
        { text: 'sofá cama de 160 cm', em: true },
        { text: ' muy cómodo.' },
      ],
    },
  ];
}
