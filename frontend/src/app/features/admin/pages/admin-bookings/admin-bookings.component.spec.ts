import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminBookingsComponent } from './admin-bookings.component';
import { IBooking } from '../../../../core/models/booking.model';
import { environment } from '../../../../../environments/environment';

const BOOKINGS_URL = `${environment.apiUrl}/bookings`;

function makeBooking(overrides: Partial<IBooking> = {}): IBooking {
  return {
    id:              'b1',
    checkIn:         '2026-08-10',
    checkOut:        '2026-08-13',
    guestName:       'Ana García',
    guestEmail:      'ana@example.com',
    guestPhone:      '+34600000000',
    guests:          2,
    totalPrice:      300,
    depositAmount:   150,
    remainingAmount: 150,
    status:          'confirmed',
    createdAt:       '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminBookingsComponent — segundo pago (reenvío manual)', () => {
  let fixture:   ComponentFixture<AdminBookingsComponent>;
  let component: AdminBookingsComponent;
  let http:      HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports:   [AdminBookingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture   = TestBed.createComponent(AdminBookingsComponent);
    component = fixture.componentInstance;
    http      = TestBed.inject(HttpTestingController);

    // Carga inicial de reservas y de países (ambos toSignal se suscriben al construir el componente)
    http.expectOne(BOOKINGS_URL).flush({ success: true, data: [makeBooking()] });
    http.expectOne('assets/data/paises-iso3166.json').flush([{ code: 'ESP', name: 'España' }]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('onRemainingPaymentRequested abre pendingConfirm con el importe correcto', () => {
    component.onRemainingPaymentRequested({ bookingId: 'b1', guestName: 'Ana García' });

    expect(component.pendingConfirm()?.message).toContain('150 €');
    expect(component.pendingConfirm()?.message).toContain('Ana García');
    expect(component.pendingConfirm()?.danger).toBe(false);
  });

  it('al confirmar → llama al endpoint y refresca la lista de reservas', () => {
    component.onRemainingPaymentRequested({ bookingId: 'b1', guestName: 'Ana García' });
    component.onConfirmModalConfirmed();

    const req = http.expectOne(`${BOOKINGS_URL}/b1/remaining-payment`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { sessionUrl: 'https://checkout.stripe.com/x', remainingAmount: 150 } });

    expect(component.processingId()).toBeNull();
    expect(component.actionError()).toBe('');

    // executeRemainingPayment llama a refresh$.next() en éxito → nueva carga de reservas
    http.expectOne(BOOKINGS_URL).flush({ success: true, data: [] });
  });

  it('si el endpoint falla → marca actionError y libera processingId', () => {
    component.onRemainingPaymentRequested({ bookingId: 'b1', guestName: 'Ana García' });
    component.onConfirmModalConfirmed();

    http.expectOne(`${BOOKINGS_URL}/b1/remaining-payment`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.actionError()).toBe('No se pudo enviar el pago restante. Inténtalo de nuevo.');
    expect(component.processingId()).toBeNull();
  });

  it('no hace nada si ya hay una acción en curso (processingId ocupado)', () => {
    component.processingId.set('otra-reserva');
    component.onRemainingPaymentRequested({ bookingId: 'b1', guestName: 'Ana García' });

    expect(component.pendingConfirm()).toBeNull();
  });
});
