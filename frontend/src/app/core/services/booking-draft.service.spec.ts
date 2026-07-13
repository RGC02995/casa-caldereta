import { TestBed } from '@angular/core/testing';
import { BookingDraftService } from './booking-draft.service';

const STORAGE_KEY = 'cc_booking_draft';

function makeService(): BookingDraftService {
  return TestBed.inject(BookingDraftService);
}

describe('BookingDraftService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => sessionStorage.clear());

  it('rehidrata el borrador desde sessionStorage al construirse', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      checkIn:  '2026-08-10T00:00:00.000Z',
      checkOut: '2026-08-13T00:00:00.000Z',
      guests:   4,
      guestName:  'Ana',
      guestEmail: 'ana@example.com',
      guestPhone: '+34600111222',
      message:    'Llegamos tarde',
      bookingId: null, sessionUrl: null, holdExpiresAt: null,
    }));

    const svc = makeService();

    expect(svc.guests()).toBe(4);
    expect(svc.guestName()).toBe('Ana');
    expect(svc.guestEmail()).toBe('ana@example.com');
    expect(svc.checkIn()).toEqual(new Date('2026-08-10T00:00:00.000Z'));
    expect(svc.checkOut()).toEqual(new Date('2026-08-13T00:00:00.000Z'));
  });

  it('persiste los cambios de los signals en sessionStorage', () => {
    const svc = makeService();
    svc.guestEmail.set('nuevo@example.com');
    svc.guests.set(3);
    TestBed.tick(); // fuerza el effect de persistencia

    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw as string);
    expect(stored.guestEmail).toBe('nuevo@example.com');
    expect(stored.guests).toBe(3);
  });

  it('clear() vacía los signals y borra sessionStorage', () => {
    const svc = makeService();
    svc.guestName.set('Ana');
    svc.guests.set(5);
    TestBed.tick();

    svc.clear();

    expect(svc.guestName()).toBe('');
    expect(svc.guests()).toBe(2);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('JSON corrupto en sessionStorage → arranca con borrador vacío sin lanzar', () => {
    sessionStorage.setItem(STORAGE_KEY, '{ esto no es json valido');

    let svc!: BookingDraftService;
    expect(() => { svc = makeService(); }).not.toThrow();
    expect(svc.guestName()).toBe('');
    expect(svc.guests()).toBe(2);
  });

  it('hasResumablePayment: true si el bloqueo sigue vivo, false si caducó', () => {
    const svc = makeService();

    svc.rememberPendingPayment('bk_1', 'https://stripe/pay', new Date(Date.now() + 5 * 60 * 1000));
    expect(svc.hasResumablePayment()).toBe(true);

    svc.rememberPendingPayment('bk_1', 'https://stripe/pay', new Date(Date.now() - 60 * 1000));
    expect(svc.hasResumablePayment()).toBe(false);
  });

  it('clearPendingPayment: elimina la sesión guardada sin tocar el resto del borrador', () => {
    const svc = makeService();
    svc.guestName.set('Ana');
    svc.rememberPendingPayment('bk_1', 'https://stripe/pay', new Date(Date.now() + 5 * 60 * 1000));

    svc.clearPendingPayment();

    expect(svc.pendingSessionUrl()).toBeNull();
    expect(svc.hasResumablePayment()).toBe(false);
    expect(svc.guestName()).toBe('Ana');
  });
});
