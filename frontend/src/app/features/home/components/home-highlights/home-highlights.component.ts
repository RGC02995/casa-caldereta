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
        { text: 'Un alojamiento pensado para desconectar en plena naturaleza, donde solo se oye el canto de los pájaros y el sonar de las ' },
        { text: 'campanas del pueblo', em: true },
        { text: '.' },
      ],
    },
    {
      image: 'assets/images/2.jpeg',
      alt: 'Terraza con vistas al Castell de Rugat y el Benicadell',
      size: 'panoramic',
      segments: [
        { text: 'Barbacoa en la terraza con vistas directas al ' },
        { text: 'Castell de Rugat', em: true },
        { text: ' y el reflejo del sol sobre el ' },
        { text: 'Benicadell', em: true },
        { text: ' al atardecer.' },
      ],
    },
    {
      image: 'assets/images/3.jpeg',
      alt: 'Cocina moderna equipada con comedor y estufa de leña',
      size: 'portrait',
      segments: [
        { text: 'Cocina moderna abierta al comedor, con ' },
        { text: 'televisión de 65"', em: true },
        { text: ' y ' },
        { text: 'estufa de leña', em: true },
        { text: ' para las noches de invierno.' },
      ],
    },
    {
      image: 'assets/images/4.jpeg',
      alt: 'Jacuzzi interior de 180×180 junto a la terraza interior',
      size: 'cinematic',
      segments: [
        { text: 'Jacuzzi', em: true },
        { text: ' de 180×180 cm junto a la terraza interior, con capacidad para cinco personas.' },
      ],
    },
    {
      image: 'assets/images/5.jpeg',
      alt: 'Salón-biblioteca del primer piso con habitaciones de matrimonio',
      size: 'classic',
      segments: [
        { text: 'Salón-biblioteca luminoso, ' },
        { text: 'dos habitaciones de matrimonio', em: true },
        { text: ' con camas de 180 cm y sofá cama de 160 cm en el comedor.' },
      ],
    },
  ];
}
