import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminPricingBaseComponent } from './admin-pricing-base.component';
import { environment } from '../../../../../environments/environment';

const BASE = `${environment.apiUrl}/pricing-settings`;

const MOCK_SETTINGS = {
  monThuPrice: 100, friPrice: 150, satPrice: 180, extraPerPerson: 20,
};

describe('AdminPricingBaseComponent', () => {
  let fixture: ComponentFixture<AdminPricingBaseComponent>;
  let component: AdminPricingBaseComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:   [AdminPricingBaseComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture   = TestBed.createComponent(AdminPricingBaseComponent);
    component = fixture.componentInstance;
    http      = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('se crea el componente sin errores', () => {
    fixture.detectChanges();
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
    expect(component).toBeTruthy();
  });

  it('mientras isLoading=true → muestra mensaje de carga', () => {
    fixture.detectChanges(); // dispara ngOnInit + petición HTTP
    // Antes de flush, la carga está en curso
    expect(fixture.nativeElement.textContent).toContain('Cargando precios');
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
  });

  it('tras carga exitosa → muestra el formulario', () => {
    fixture.detectChanges();
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('tras carga con error → muestra el mensaje de error', () => {
    fixture.detectChanges();
    http.expectOne(BASE).flush('Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent)
      .toContain('No se pudo cargar la configuración de precios.');
  });

  it('el formulario tiene los 4 campos numéricos', () => {
    fixture.detectChanges();
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input[type="number"]');
    expect(inputs).toHaveLength(4);
  });

  it('al enviar el formulario → llama a update() con los valores correctos', () => {
    fixture.detectChanges();
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    const req = http.expectOne(r => r.url === BASE && r.method === 'PATCH');
    expect(req.request.body).toEqual(MOCK_SETTINGS);
    req.flush({ success: true, data: MOCK_SETTINGS });
  });

  it('tras guardar con éxito → saveSuccess=true, false tras 3 s (fake timers)', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    http.expectOne(BASE).flush({ success: true, data: MOCK_SETTINGS });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    http.expectOne(r => r.url === BASE && r.method === 'PATCH')
        .flush({ success: true, data: MOCK_SETTINGS });
    fixture.detectChanges();

    expect(component.saveSuccess()).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(component.saveSuccess()).toBe(false);

    vi.useRealTimers();
  });
});
