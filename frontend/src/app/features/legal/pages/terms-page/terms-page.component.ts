import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../../../core/services/seo.service';
import { TermsContentComponent } from '../../components/terms-content/terms-content.component';

@Component({
  selector: 'terms-page',
  imports: [RouterLink, RouterLinkActive, TermsContentComponent],
  templateUrl: './terms-page.component.html',
  styleUrl: './terms-page.component.scss',
})
export class TermsPageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Términos y Condiciones',
      description:   'Condiciones de reserva y pago en Casa Caldereta: depósito del 50%, política de cancelación, arras penitenciales y normas de la estancia.',
      canonicalPath: '/legal/terminos',
      keywords:      'términos y condiciones, condiciones de reserva, Casa Caldereta',
    });
  }
}
