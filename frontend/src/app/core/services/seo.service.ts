import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

export interface ISeoConfig {
  readonly title:         string;
  readonly description:   string;
  readonly canonicalPath: string;
  readonly image?:        string;
  readonly keywords?:     string;
}

// ⚠️ PENDIENTE: cambiar cuando el dominio esté activo en Namecheap
const BASE_URL      = 'https://casa-caldereta.com';
const SITE_NAME     = 'Casa Caldereta';
const DEFAULT_IMAGE = `${BASE_URL}/assets/images/og-default.jpg`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService  = inject(Meta);
  private readonly document     = inject(DOCUMENT);

  setPage(config: ISeoConfig): void {
    const fullTitle    = `${config.title} | ${SITE_NAME}`;
    const canonicalUrl = `${BASE_URL}${config.canonicalPath}`;
    const image        = config.image ?? DEFAULT_IMAGE;

    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: config.description });

    if (config.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords });
    }

    this.metaService.updateTag({ property: 'og:title',       content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:image',       content: image });
    this.metaService.updateTag({ property: 'og:url',         content: canonicalUrl });
    this.metaService.updateTag({ property: 'og:type',        content: 'website' });
    this.metaService.updateTag({ property: 'og:site_name',   content: SITE_NAME });
    this.metaService.updateTag({ property: 'og:locale',      content: 'es_ES' });

    this.metaService.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title',       content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
    this.metaService.updateTag({ name: 'twitter:image',       content: image });

    this.setCanonical(canonicalUrl);
  }

  setBreadcrumbs(items: { name: string; url: string }[]): void {
    const head     = this.document.head;
    const existing = head.querySelector<HTMLScriptElement>('script[data-seo="breadcrumbs"]');
    if (existing) existing.remove();

    const script = this.document.createElement('script');
    script.type            = 'application/ld+json';
    script.dataset['seo'] = 'breadcrumbs';
    script.textContent = JSON.stringify({
      '@context':        'https://schema.org',
      '@type':           'BreadcrumbList',
      'itemListElement': items.map((item, index) => ({
        '@type':    'ListItem',
        'position': index + 1,
        'name':     item.name,
        'item':     item.url,
      })),
    });
    head.appendChild(script);
  }

  setAggregateRating(ratingValue: number, reviewCount: number): void {
    if (reviewCount === 0) return;

    const head     = this.document.head;
    const existing = head.querySelector<HTMLScriptElement>('script[data-seo="aggregate-rating"]');
    if (existing) existing.remove();

    const script = this.document.createElement('script');
    script.type              = 'application/ld+json';
    script.dataset['seo']   = 'aggregate-rating';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      'name': SITE_NAME,
      'aggregateRating': {
        '@type':       'AggregateRating',
        'ratingValue': ratingValue.toFixed(1),
        'reviewCount': reviewCount,
        'bestRating':  '5',
        'worstRating': '1',
      },
    });
    head.appendChild(script);
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let linkEl = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!linkEl) {
      linkEl     = this.document.createElement('link');
      linkEl.rel = 'canonical';
      head.appendChild(linkEl);
    }

    linkEl.href = url;
  }
}
