import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PricingSettingsService } from './pricing-settings.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/pricing-settings`;

const MOCK_SETTINGS = {
  monThuPrice: 100, friPrice: 150, satPrice: 180, extraPerPerson: 20,
};

describe('PricingSettingsService', () => {
  let service: PricingSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PricingSettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PricingSettingsService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get() → hace GET a pricing-settings y devuelve los datos', () => {
    let result: unknown;
    service.get().subscribe(r => (result = r));

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: MOCK_SETTINGS });

    expect((result as { data: unknown }).data).toEqual(MOCK_SETTINGS);
  });

  it('update(data) → hace PATCH a pricing-settings con el body correcto', () => {
    const patch = { friPrice: 175 };
    let result: unknown;
    service.update(patch).subscribe(r => (result = r));

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);
    req.flush({ success: true, data: { ...MOCK_SETTINGS, friPrice: 175 } });

    expect((result as { data: { friPrice: number } }).data.friPrice).toBe(175);
  });

  it('si el backend devuelve error → el observable emite el error', () => {
    let errorCaught = false;
    service.get().subscribe({ error: () => (errorCaught = true) });

    http.expectOne(BASE).flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(errorCaught).toBe(true);
  });
});
