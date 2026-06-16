import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SiteHeaderComponent } from './core/layout/site-header/site-header.component';
import { SiteFooterComponent } from './core/layout/site-footer/site-footer.component';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, CookieBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router           = inject(Router);
  private readonly translateService = inject(TranslateService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((routerEvent): routerEvent is NavigationEnd =>
        routerEvent instanceof NavigationEnd
      ),
      map(routerEvent => routerEvent.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly isAdminRoute = computed(() => this.currentUrl().startsWith('/admin'));

  constructor() {
    // Español como idioma predeterminado garantizado en el arranque
    this.translateService.use('es');
  }
}
