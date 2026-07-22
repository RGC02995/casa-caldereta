import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminRoutesComponent } from './admin-routes.component';
import { IRoute } from '../../../../core/models/route.model';
import { IRouteFormSubmitEvent } from '../../components/admin-route-form/admin-route-form.component';
import { environment } from '../../../../../environments/environment';

const ROUTES_URL = `${environment.apiUrl}/routes`;

function makeRoute(overrides: Partial<IRoute> = {}): IRoute {
  return {
    id:                'r1',
    title:              'Ruta de prueba',
    slug:               'ruta-de-prueba',
    description:        'Descripción de prueba',
    distance:           10,
    duration:           120,
    difficulty:         'easy',
    type:               'hiking',
    coverImageUrl:      '',
    images:             [],
    points:             [],
    externalLinkLabel:  '',
    externalLinkUrl:    '',
    isPublished:        false,
    order:              0,
    createdAt:          '2026-07-01T00:00:00.000Z',
    updatedAt:          '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSubmitEvent(overrides: Partial<IRouteFormSubmitEvent> = {}): IRouteFormSubmitEvent {
  return {
    payload: {
      title:             'Ruta de prueba',
      description:       'Descripción de prueba',
      distance:           10,
      duration:           120,
      difficulty:         'easy',
      type:               'hiking',
      order:              0,
      points:             [],
      externalLinkLabel:  '',
      externalLinkUrl:    '',
    },
    coverImageFile:    null,
    pointImageFiles:   [],
    galleryImageFiles: [],
    ...overrides,
  };
}

describe('AdminRoutesComponent — subida de imágenes al guardar', () => {
  let fixture:   ComponentFixture<AdminRoutesComponent>;
  let component: AdminRoutesComponent;
  let http:      HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:   [AdminRoutesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture   = TestBed.createComponent(AdminRoutesComponent);
    component = fixture.componentInstance;
    http      = TestBed.inject(HttpTestingController);

    http.expectOne(ROUTES_URL).flush({ success: true, data: [] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('si una subida de imagen falla, no cierra el formulario y registra el fallo', () => {
    component.openEditForm(makeRoute());
    const file = new File(['a'], 'punto.jpg', { type: 'image/jpeg' });

    component.onFormSubmit(makeSubmitEvent({
      payload: { ...makeSubmitEvent().payload, points: [{ name: 'Fábrica de la Llum', description: 'desc' }] },
      pointImageFiles: [file],
    }));

    http.expectOne(`${ROUTES_URL}/r1`).flush({ success: true, data: makeRoute() });
    http.expectOne(`${ROUTES_URL}/r1/points/0/image`)
      .flush({ success: false, message: 'Ruta o punto de ruta no encontrado' }, { status: 404, statusText: 'Not Found' });

    // refresh$.next() tras handleSaveOutcome dispara una nueva carga de rutas
    http.expectOne(ROUTES_URL).flush({ success: true, data: [] });

    expect(component.formMode()).toBe('edit');
    expect(component.uploadFailures()).toHaveLength(1);
    expect(component.uploadFailures()[0]).toContain('el punto 1: Fábrica de la Llum');
    expect(component.uploadFailures()[0]).toContain('Ruta o punto de ruta no encontrado');
    expect(component.actionError()).toContain('alguna imagen no se pudo subir');
    expect(component.editingRoute()?.id).toBe('r1');
  });

  it('si todas las subidas van bien, cierra el formulario', () => {
    component.openEditForm(makeRoute());
    const file = new File(['a'], 'portada.jpg', { type: 'image/jpeg' });

    component.onFormSubmit(makeSubmitEvent({ coverImageFile: file }));

    http.expectOne(`${ROUTES_URL}/r1`).flush({ success: true, data: makeRoute() });
    http.expectOne(`${ROUTES_URL}/r1/cover-image`).flush({ success: true, data: makeRoute({ coverImageUrl: 'https://x/y.jpg' }) });
    http.expectOne(ROUTES_URL).flush({ success: true, data: [] });

    expect(component.formMode()).toBe('hidden');
    expect(component.uploadFailures()).toHaveLength(0);
  });

  it('en modo crear, si falla una subida, pasa a modo edición (evita duplicar la ruta al reintentar)', () => {
    component.openCreateForm();
    const file = new File(['a'], 'portada.jpg', { type: 'image/jpeg' });

    component.onFormSubmit(makeSubmitEvent({ coverImageFile: file }));

    http.expectOne(ROUTES_URL).flush({ success: true, data: makeRoute({ id: 'r2' }) });
    http.expectOne(`${ROUTES_URL}/r2/cover-image`)
      .flush({ success: false, message: 'Error al subir la imagen' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(ROUTES_URL).flush({ success: true, data: [] });

    expect(component.formMode()).toBe('edit');
    expect(component.editingRoute()?.id).toBe('r2');
  });
});
