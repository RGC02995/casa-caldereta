import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { SiteHeaderComponent } from './shared/components/site-header/site-header.component';
import { SiteFooterComponent } from './shared/components/site-footer/site-footer.component';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, CookieBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  // Reacciona a cada NavigationEnd para saber la URL actual
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((routerEvent): routerEvent is NavigationEnd =>
        routerEvent instanceof NavigationEnd
      ),
      map(routerEvent => routerEvent.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  // El panel admin tiene su propio layout — sin header/footer público
  readonly isAdminRoute = computed(() => this.currentUrl().startsWith('/admin'));
}
