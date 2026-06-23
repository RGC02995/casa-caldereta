import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BookingRequestPanelComponent } from './booking-request-panel.component';
import { environment } from '../../../../../environments/environment';

const CHECKOUT_URL = `${environment.apiUrl}/bookings/checkout`;
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
    req.flush({ success: true, data: { sessionUrl: 'https://checkout.stripe.com/test' } });
  });
});
