import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBookingListComponent } from './admin-booking-list.component';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';

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

describe('AdminBookingListComponent', () => {
  let fixture:   ComponentFixture<AdminBookingListComponent>;
  let component: AdminBookingListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminBookingListComponent] });
    fixture   = TestBed.createComponent(AdminBookingListComponent);
    component = fixture.componentInstance;
  });

  function setBookings(bookings: IBooking[]): void {
    fixture.componentRef.setInput('bookings', bookings);
    fixture.detectChanges();
  }

  function remainingPaymentButton(): HTMLButtonElement | null {
    const table = fixture.nativeElement.querySelector('.admin-bookings__table-wrapper');
    return table.querySelector('button.admin-bookings__action-btn--remaining-payment');
  }

  describe('depositPaid()', () => {
    it('es false cuando el status es pending_payment', () => {
      expect(component.depositPaid(makeBooking({ status: 'pending_payment' }))).toBe(false);
    });

    (['pending', 'confirmed', 'cancelled', 'completed'] as BookingStatus[]).forEach(status => {
      it(`es true cuando el status es ${status}`, () => {
        expect(component.depositPaid(makeBooking({ status }))).toBe(true);
      });
    });
  });

  describe('remainingPaymentState()', () => {
    it('devuelve "paid" cuando remainingPaidAt tiene valor', () => {
      const booking = makeBooking({ remainingPaidAt: '2026-08-01T00:00:00.000Z', remainingPaymentEmailSentAt: '2026-07-20T00:00:00.000Z' });
      expect(component.remainingPaymentState(booking)).toBe('paid');
    });

    it('devuelve "sent" cuando solo remainingPaymentEmailSentAt tiene valor', () => {
      const booking = makeBooking({ remainingPaymentEmailSentAt: '2026-07-20T00:00:00.000Z' });
      expect(component.remainingPaymentState(booking)).toBe('sent');
    });

    it('devuelve "pending" cuando ninguno tiene valor', () => {
      expect(component.remainingPaymentState(makeBooking())).toBe('pending');
    });
  });

  describe('botón "Enviar/Reenviar segundo pago" (tabla)', () => {
    it('no aparece si el status no es confirmed', () => {
      setBookings([makeBooking({ status: 'completed' })]);
      expect(remainingPaymentButton()).toBeNull();
    });

    it('no aparece si remainingPaidAt ya tiene valor', () => {
      setBookings([makeBooking({ status: 'confirmed', remainingPaidAt: '2026-08-01T00:00:00.000Z' })]);
      expect(remainingPaymentButton()).toBeNull();
    });

    it('muestra "Enviar segundo pago" si nunca se envió el recordatorio', () => {
      setBookings([makeBooking({ status: 'confirmed' })]);
      expect(remainingPaymentButton()?.textContent?.trim()).toBe('Enviar segundo pago');
    });

    it('muestra "Reenviar segundo pago" si ya se envió antes', () => {
      setBookings([makeBooking({ status: 'confirmed', remainingPaymentEmailSentAt: '2026-07-20T00:00:00.000Z' })]);
      expect(remainingPaymentButton()?.textContent?.trim()).toBe('Reenviar segundo pago');
    });

    it('al pulsarlo emite remainingPaymentRequested con bookingId y guestName', () => {
      setBookings([makeBooking({ id: 'b42', guestName: 'Carlos Ruiz', status: 'confirmed' })]);

      let emitted: { bookingId: string; guestName: string } | undefined;
      component.remainingPaymentRequested.subscribe(event => (emitted = event));

      remainingPaymentButton()?.click();

      expect(emitted).toEqual({ bookingId: 'b42', guestName: 'Carlos Ruiz' });
    });
  });

  describe('chips de pago (tabla)', () => {
    function chipsText(): string {
      const table = fixture.nativeElement.querySelector('.admin-bookings__table-wrapper');
      return Array.from(table.querySelectorAll('.admin-bookings__payment-chip') as NodeListOf<HTMLElement>)
        .map(el => el.textContent?.trim())
        .join(' | ');
    }

    it('no se muestran para pending_payment', () => {
      setBookings([makeBooking({ status: 'pending_payment' })]);
      expect(chipsText()).toBe('');
    });

    it('no se muestran para cancelled', () => {
      setBookings([makeBooking({ status: 'cancelled' })]);
      expect(chipsText()).toBe('');
    });

    it('confirmed sin pagar el resto → "Depósito ✓" + "Resto: pendiente"', () => {
      setBookings([makeBooking({ status: 'confirmed' })]);
      expect(chipsText()).toBe('Depósito ✓ | Resto: pendiente');
    });

    it('confirmed con recordatorio enviado → "Resto: enviado"', () => {
      setBookings([makeBooking({ status: 'confirmed', remainingPaymentEmailSentAt: '2026-07-20T00:00:00.000Z' })]);
      expect(chipsText()).toBe('Depósito ✓ | Resto: enviado');
    });

    it('completed con el resto pagado → "Resto ✓"', () => {
      setBookings([makeBooking({ status: 'completed', remainingPaidAt: '2026-08-01T00:00:00.000Z' })]);
      expect(chipsText()).toBe('Depósito ✓ | Resto ✓');
    });
  });
});
