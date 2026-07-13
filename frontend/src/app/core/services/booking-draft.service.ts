import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'cc_booking_draft';

interface StoredDraft {
  checkIn:       string | null;   // ISO
  checkOut:      string | null;   // ISO
  guests:        number;
  guestName:     string;
  guestEmail:    string;
  guestPhone:    string;
  message:       string;
  bookingId:     string | null;
  sessionUrl:    string | null;
  holdExpiresAt: string | null;   // ISO — cuándo caduca el bloqueo de la reserva en curso
}

/**
 * Borrador de la reserva en curso, espejado en `sessionStorage`.
 *
 * Sobrevive al ida-y-vuelta a Stripe (`window.location.assign`) y al botón "atrás" del navegador,
 * que reinician la SPA y destruyen los signals de los componentes. Se usa `sessionStorage` (no
 * `localStorage`) a propósito: es efímero, vive solo en la pestaña y se borra al cerrarla — coherente
 * con el tratamiento RGPD de datos personales del huésped.
 *
 * NO persiste los checkboxes legales (privacidad / política de cancelación): se re-confirman siempre
 * como consentimiento explícito en cada intento.
 */
@Injectable({ providedIn: 'root' })
export class BookingDraftService {
  readonly checkIn    = signal<Date | null>(null);
  readonly checkOut   = signal<Date | null>(null);
  readonly guests     = signal(2);
  readonly guestName  = signal('');
  readonly guestEmail = signal('');
  readonly guestPhone = signal('');
  readonly message    = signal('');

  // Pago en curso — para ofrecer "Continuar con el pago" al volver.
  readonly pendingBookingId     = signal<string | null>(null);
  readonly pendingSessionUrl    = signal<string | null>(null);
  readonly pendingHoldExpiresAt = signal<Date | null>(null);

  constructor() {
    this.restore();
    // Persistencia reactiva: cualquier cambio en el borrador se refleja en sessionStorage.
    effect(() => this.persist());
  }

  /** Recuerda la sesión de pago abierta para poder reanudarla si el usuario vuelve atrás. */
  rememberPendingPayment(bookingId: string, sessionUrl: string, holdExpiresAt: Date): void {
    this.pendingBookingId.set(bookingId);
    this.pendingSessionUrl.set(sessionUrl);
    this.pendingHoldExpiresAt.set(holdExpiresAt);
  }

  /** ¿Hay un pago abierto que todavía se puede reanudar (bloqueo no expirado)? */
  hasResumablePayment(): boolean {
    const url    = this.pendingSessionUrl();
    const expiry = this.pendingHoldExpiresAt();
    return !!url && expiry !== null && expiry.getTime() > Date.now();
  }

  clearPendingPayment(): void {
    this.pendingBookingId.set(null);
    this.pendingSessionUrl.set(null);
    this.pendingHoldExpiresAt.set(null);
  }

  /** Vacía todo el borrador (se llama tras un pago confirmado). */
  clear(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.guests.set(2);
    this.guestName.set('');
    this.guestEmail.set('');
    this.guestPhone.set('');
    this.message.set('');
    this.clearPendingPayment();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // sessionStorage no disponible — nada que limpiar.
    }
  }

  private persist(): void {
    const data: StoredDraft = {
      checkIn:       this.checkIn()?.toISOString()  ?? null,
      checkOut:      this.checkOut()?.toISOString() ?? null,
      guests:        this.guests(),
      guestName:     this.guestName(),
      guestEmail:    this.guestEmail(),
      guestPhone:    this.guestPhone(),
      message:       this.message(),
      bookingId:     this.pendingBookingId(),
      sessionUrl:    this.pendingSessionUrl(),
      holdExpiresAt: this.pendingHoldExpiresAt()?.toISOString() ?? null,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage lleno o deshabilitado — degradación limpia, el flujo sigue funcionando.
    }
  }

  private restore(): void {
    let raw: string | null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return; // sessionStorage no disponible → borrador vacío.
    }
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as Partial<StoredDraft>;

      const checkIn  = this.parseDate(data.checkIn);
      const checkOut = this.parseDate(data.checkOut);
      if (checkIn)  this.checkIn.set(checkIn);
      if (checkOut) this.checkOut.set(checkOut);
      if (typeof data.guests === 'number' && data.guests >= 1 && data.guests <= 6) this.guests.set(data.guests);
      if (typeof data.guestName  === 'string') this.guestName.set(data.guestName);
      if (typeof data.guestEmail === 'string') this.guestEmail.set(data.guestEmail);
      if (typeof data.guestPhone === 'string') this.guestPhone.set(data.guestPhone);
      if (typeof data.message    === 'string') this.message.set(data.message);
      if (typeof data.bookingId  === 'string') this.pendingBookingId.set(data.bookingId);
      if (typeof data.sessionUrl === 'string') this.pendingSessionUrl.set(data.sessionUrl);
      const holdExpiry = this.parseDate(data.holdExpiresAt);
      if (holdExpiry) this.pendingHoldExpiresAt.set(holdExpiry);
    } catch {
      // JSON corrupto → se ignora y se arranca con el borrador vacío.
    }
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
