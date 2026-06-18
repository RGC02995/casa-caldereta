import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

interface Highlight {
  readonly icon:        string;
  readonly title:       string;
  readonly description: string;
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
}
