import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'cookies-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.scss',
})
export class CookiesPageComponent {
  constructor() {
    inject(SeoService).setPage({
      title:         'Política de Cookies',
      description:   'Qué cookies propias y de terceros utiliza Casa Caldereta, para qué sirve cada categoría y cómo gestionar o retirar tu consentimiento en cualquier momento.',
      canonicalPath: '/legal/cookies',
      keywords:      'política de cookies, consentimiento cookies, Casa Caldereta',
    });
  }
}
