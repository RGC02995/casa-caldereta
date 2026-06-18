import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavLink {
  readonly labelKey: string;
  readonly path:     string;
  readonly exact:    boolean;
}

@Component({
  selector: 'site-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef       = inject(DestroyRef);
  private readonly document         = inject(DOCUMENT);

  readonly isScrolled       = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly currentLang      = signal<'es' | 'en'>('es');

  readonly navLinks: NavLink[] = [
    { labelKey: 'nav.home',    path: '/',        exact: true  },
    { labelKey: 'nav.gallery', path: '/galeria',  exact: false },
    { labelKey: 'nav.routes',  path: '/rutas',    exact: false },
  ];

  readonly headerClasses = computed(() => [
    'site-header',
    this.isScrolled()       ? 'site-header--scrolled'  : '',
    this.isMobileMenuOpen() ? 'site-header--menu-open' : '',
  ].filter(Boolean).join(' '));

  constructor() {
    fromEvent(this.document.defaultView!, 'scroll')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.isScrolled.set(this.document.defaultView!.scrollY > 50));

    fromEvent<KeyboardEvent>(this.document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => { if (event.key === 'Escape') this.closeMobileMenu(); });

    this.destroyRef.onDestroy(() => { this.document.body.style.overflow = ''; });
  }

  toggleMobileMenu(): void {
    const opening = !this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(opening);
    document.body.style.overflow = opening ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.currentLang.set(lang);
    this.translateService.use(lang);
  }
}
