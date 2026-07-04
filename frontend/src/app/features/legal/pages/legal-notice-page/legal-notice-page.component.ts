import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'legal-notice-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './legal-notice-page.component.html',
  styleUrl: './legal-notice-page.component.scss',
})
export class LegalNoticePageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Aviso Legal',
      description:   'Datos identificativos del titular de Casa Caldereta, licencia turística CV-VUT0058371-V y condiciones de uso del sitio conforme a la LSSI.',
      canonicalPath: '/legal/aviso-legal',
      keywords:      'aviso legal Casa Caldereta, licencia turística CV-VUT0058371-V, Aielo de Rugat',
    });
  }
}
