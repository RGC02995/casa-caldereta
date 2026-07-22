import { describe, it, expect, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RouteDetailPageComponent } from './route-detail-page.component';
import { IRoute } from '../../../../core/models/route.model';
import { environment } from '../../../../../environments/environment';

const ROUTES_URL = `${environment.apiUrl}/routes`;

// jsdom no implementa <dialog>.showModal()/close() — polyfill mínimo solo para tests.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void { this.setAttribute('open', ''); };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void { this.removeAttribute('open'); };
}

function makeRoute(overrides: Partial<IRoute> = {}): IRoute {
  return {
    id:                'r1',
    title:              'Via Verde del Serpis',
    slug:               'via-verde-del-serpis',
    description:        'Descripción',
    distance:           25,
    duration:           240,
    difficulty:         'easy',
    type:               'cycling',
    coverImageUrl:      'https://res.cloudinary.com/x/cover.jpg',
    images:             [],
    points:             [],
    externalLinkLabel:  '',
    externalLinkUrl:    '',
    isPublished:        true,
    order:              0,
    createdAt:          '2026-07-01T00:00:00.000Z',
    updatedAt:          '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function setup(slug = 'via-verde-del-serpis'): { fixture: ComponentFixture<RouteDetailPageComponent>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [RouteDetailPageComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide:  ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ slug }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(RouteDetailPageComponent);
  const http    = TestBed.inject(HttpTestingController);
  return { fixture, http };
}

describe('RouteDetailPageComponent — galería de imágenes', () => {
  let fixture: ComponentFixture<RouteDetailPageComponent>;
  let http:    HttpTestingController;

  afterEach(() => http.verify());

  it('mapea route.images a GalleryPhoto conservando url/publicId', () => {
    ({ fixture, http } = setup());
    const component = fixture.componentInstance;

    http.expectOne(`${ROUTES_URL}/slug/via-verde-del-serpis`).flush({
      success: true,
      data: makeRoute({
        images: [
          { url: 'https://res.cloudinary.com/x/a.jpg', publicId: 'casa-caldereta/rutas/galeria/a' },
          { url: 'https://res.cloudinary.com/x/b.jpg', publicId: 'casa-caldereta/rutas/galeria/b' },
        ],
      }),
    });
    fixture.detectChanges();

    const photos = component.galleryPhotos();
    expect(photos).toHaveLength(2);
    expect(photos[0]).toEqual({ id: 0, photoId: 'casa-caldereta/rutas/galeria/a', src: 'https://res.cloudinary.com/x/a.jpg', alt: 'Via Verde del Serpis — imagen 1' });
    expect(photos[1]?.photoId).toBe('casa-caldereta/rutas/galeria/b');
  });

  it('renderiza la sección de galería y abre el lightbox al pulsar una miniatura', () => {
    ({ fixture, http } = setup());
    const component = fixture.componentInstance;

    http.expectOne(`${ROUTES_URL}/slug/via-verde-del-serpis`).flush({
      success: true,
      data: makeRoute({
        images: [{ url: 'https://res.cloudinary.com/x/a.jpg', publicId: 'a' }],
      }),
    });
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('.route-detail__gallery-grid');
    expect(grid).not.toBeNull();

    expect(component.isGalleryLightboxOpen()).toBe(false);
    const button = fixture.nativeElement.querySelector('.route-detail__gallery-btn') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(component.isGalleryLightboxOpen()).toBe(true);
    expect(component.selectedGalleryIndex()).toBe(0);
  });

  it('sin imágenes, no renderiza la sección de galería', () => {
    ({ fixture, http } = setup());
    const component = fixture.componentInstance;

    http.expectOne(`${ROUTES_URL}/slug/via-verde-del-serpis`).flush({
      success: true,
      data: makeRoute({ images: [] }),
    });
    fixture.detectChanges();

    expect(component.galleryPhotos()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.route-detail__gallery-grid')).toBeNull();
  });
});
