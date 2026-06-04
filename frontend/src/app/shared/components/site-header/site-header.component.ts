import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface NavLink {
  readonly labelKey: string;
  readonly path:     string;
  readonly exact:    boolean;
}

@Component({
  selector: 'site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent implements OnDestroy {
  private readonly translateService = inject(TranslateService);

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

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 50);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileMenu();
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

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
