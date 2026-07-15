import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BookingRequestPanelComponent } from './booking-request-panel.component';
import { BookingDraftService } from '../../../../core/services/booking-draft.service';
import { environment } from '../../../../../environments/environment';

const CHECKOUT_URL = `${environment.apiUrl}/bookings/checkout`;
const CANCEL_URL   = (id: string) => `${environment.apiUrl}/bookings/${id}/cancel-pending`;
const CHECK_IN  = new Date(2025, 6, 14); // lunes 14 jul
const CHECK_OUT = new Date(2025, 6, 16); // miércoles 16 jul

function fillValidForm(component: BookingRequestPanelComponent): void {
  component.nameValue.set('Juan García');
  component.emailValue.set('juan@example.com');
  component.phoneValue.set('+34 600 000 000');
  component.privacyChecked.set(true);
  component.cancelPolicyChecked.set(true);
}

describe('BookingRequestPanelComponent', () => {
  let fixture: ComponentFixture<BookingRequestPanelComponent>;
  let component: BookingRequestPanelComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear(); // BookingDraftService es singleton respaldado por sessionStorage real en jsdom
    TestBed.configureTestingModule({
      imports:   [BookingRequestPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService({ defaultLanguage: 'es' }),
      ],
    });
    fixture   = TestBed.createComponent(BookingRequestPanelComponent);
    component = fixture.componentInstance;
    http      = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('se crea sin errores con checkIn y checkOut como inputs', () => {
    fixture.componentRef.setInput('checkIn', CHECK_IN);
    fixture.componentRef.setInput('checkOut', CHECK_OUT);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('sin datos → isFormValid() = false', () => {
    expect(component.isFormValid()).toBe(false);
  });

  it('con todos los campos válidos → isFormValid() = true', () => {
    fillValidForm(component);
    expect(component.isFormValid()).toBe(true);
  });

  it('submitBooking sin checkIn/checkOut → no llama al servicio', () => {
    fillValidForm(component);
    fixture.detectChanges();

    component.submitBooking(new Event('submit'));

    http.expectNone(CHECKOUT_URL);
  });

  it('submitBooking con datos válidos + fechas → llama a createCheckoutSession()', () => {
    fixture.componentRef.setInput('checkIn', CHECK_IN);
    fixture.componentRef.setInput('checkOut', CHECK_OUT);
    fillValidForm(component);
    fixture.detectChanges();

    component.submitBooking(new Event('submit'));

    const req = http.expectOne(CHECKOUT_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.guestName).toBe('Juan García');
    expect(req.request.body.guestEmail).toBe('juan@example.com');
    req.flush({
      success: true,
      data: {
        sessionUrl:    'https://checkout.stripe.com/test',
        bookingId:     'bk_1',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });
  });

  it('confirmCancelAndRestart(): llama a cancel-pending y vacía el borrador', () => {
    const draft = TestBed.inject(BookingDraftService);
    draft.rememberPendingPayment('bk_1', 'https://checkout.stripe.com/test', new Date(Date.now() + 5 * 60 * 1000));
    draft.guestName.set('Juan García');

    component.confirmCancelAndRestart();

    const req = http.expectOne(CANCEL_URL('bk_1'));
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });

    expect(draft.guestName()).toBe('');
    expect(draft.pendingSessionUrl()).toBeNull();
  });

  it('confirmCancelAndRestart(): si el backend falla, igualmente vacía el borrador', () => {
    const draft = TestBed.inject(BookingDraftService);
    draft.rememberPendingPayment('bk_1', 'https://checkout.stripe.com/test', new Date(Date.now() + 5 * 60 * 1000));

    component.confirmCancelAndRestart();

    const req = http.expectOne(CANCEL_URL('bk_1'));
    req.flush({ success: false, message: 'ya no está pendiente' }, { status: 404, statusText: 'Not Found' });

    expect(draft.pendingSessionUrl()).toBeNull();
  });

  it('sin bookingId en el borrador → vacía el borrador sin llamar al backend', () => {
    const draft = TestBed.inject(BookingDraftService);

    component.confirmCancelAndRestart();

    http.expectNone((r) => r.url.includes('cancel-pending'));
    expect(draft.guestName()).toBe('');
  });

  it('con un pago pendiente reanudable, hace scroll automático al aviso tras el primer render', async () => {
    // Se destruye el fixture creado en beforeEach: su afterNextRender aún no se ha
    // disparado (nunca se llamó a detectChanges) y podría interferir con el conteo de llamadas.
    fixture.destroy();

    // jsdom no implementa scrollIntoView de forma nativa; se define antes de espiarla.
    Element.prototype.scrollIntoView = vi.fn();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    const draft = TestBed.inject(BookingDraftService);
    draft.rememberPendingPayment('bk_1', 'https://checkout.stripe.com/test', new Date(Date.now() + 5 * 60 * 1000));

    const localFixture = TestBed.createComponent(BookingRequestPanelComponent);
    localFixture.detectChanges();
    await localFixture.whenStable();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    scrollSpy.mockRestore();
  });

  it('sin pago pendiente, no hace scroll automático', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});

    fixture.detectChanges();
    await fixture.whenStable();

    expect(scrollSpy).not.toHaveBeenCalled();
    scrollSpy.mockRestore();
  });
});
