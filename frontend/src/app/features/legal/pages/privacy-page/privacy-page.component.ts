import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'privacy-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './privacy-page.component.html',
  styleUrl: './privacy-page.component.scss',
})
export class PrivacyPageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Política de Privacidad',
      description:   'Cómo tratamos tus datos personales en Casa Caldereta conforme al RGPD y la LOPDGDD, incluyendo los encargados del tratamiento que usamos para reservas y pagos.',
      canonicalPath: '/legal/privacidad',
      keywords:      'política de privacidad, protección de datos RGPD, Casa Caldereta',
    });
  }
}
