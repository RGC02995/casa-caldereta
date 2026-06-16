import { Component, computed, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { format } from 'date-fns';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { BookingService } from '../../../../core/services/booking.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s\-]{6,20}$/;

@Component({
  selector: 'booking-request-panel',
  standalone: true,
  imports: [RouterLink, DateFormatPipe],
  templateUrl: './booking-request-panel.component.html',
  styleUrl: './booking-request-panel.component.scss',
})
export class BookingRequestPanelComponent {
  private readonly bookingService = inject(BookingService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly checkIn    = input<Date | null>(null);
  readonly checkOut   = input<Date | null>(null);
  readonly nights     = input(0);
  readonly totalPrice = input(0);

  readonly conflictDetected = output<void>();

  readonly isSubmitting = signal(false);
  readonly submitError  = signal('');

  readonly nameValue      = signal('');
  readonly emailValue     = signal('');
  readonly phoneValue     = signal('');
  readonly guestsValue    = signal(2);
  readonly messageValue   = signal('');
  readonly privacyChecked = signal(false);

  readonly nameTouched    = signal(false);
  readonly emailTouched   = signal(false);
  readonly phoneTouched   = signal(false);
  readonly privacyTouched = signal(false);

  readonly nameError = computed(() => {
    if (!this.nameTouched()) return '';
    if (this.nameValue().trim().length < 2) return 'El nombre es obligatorio (mínimo 2 caracteres)';
    return '';
  });

  readonly emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const trimmedEmail = this.emailValue().trim();
    if (!trimmedEmail) return 'El email es obligatorio';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Introduce un email válido';
    return '';
  });

  readonly phoneError = computed(() => {
    if (!this.phoneTouched()) return '';
    const trimmed = this.phoneValue().trim();
    if (trimmed.length === 0) return 'El teléfono es obligatorio';
    if (!PHONE_REGEX.test(trimmed)) return 'Introduce un teléfono válido (+34 600 000 000)';
    return '';
  });

  readonly privacyError = computed(() => {
    if (!this.privacyTouched()) return '';
    if (!this.privacyChecked()) return 'Debes aceptar la política de privacidad';
    return '';
  });

  readonly isFormValid = computed(() => {
    const nameValid    = this.nameValue().trim().length >= 2;
    const emailValid   = EMAIL_REGEX.test(this.emailValue().trim());
    const phoneValid   = PHONE_REGEX.test(this.phoneValue().trim());
    const privacyValid = this.privacyChecked();
    const guestsValid  = this.guestsValue() >= 1 && this.guestsValue() <= 20;
    return nameValid && emailValid && phoneValid && privacyValid && guestsValid;
  });

  submitBooking(event: Event): void {
    event.preventDefault();
    this.nameTouched.set(true);
    this.emailTouched.set(true);
    this.phoneTouched.set(true);
    this.privacyTouched.set(true);

    const checkIn  = this.checkIn();
    const checkOut = this.checkOut();

    if (!this.isFormValid() || !checkIn || !checkOut) return;
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    const phone = this.phoneValue().trim();
    const notes = this.messageValue().trim();

    const requestData = {
      checkIn:    format(checkIn, 'yyyy-MM-dd'),
      checkOut:   format(checkOut, 'yyyy-MM-dd'),
      guestName:  this.nameValue().trim(),
      guestEmail: this.emailValue().trim(),
      guestPhone: phone,
      guests:     this.guestsValue(),
      ...(notes ? { notes } : {}),
    };

    this.bookingService.createCheckoutSession(requestData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response) => {
        // Redirige a Stripe Checkout — salida de la SPA
        window.location.assign(response.data.sessionUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.submitError.set('Esas fechas acaban de ser reservadas por otro usuario. El calendario se ha actualizado — selecciona nuevas fechas.');
          this.conflictDetected.emit();
        } else {
          const message = err.error?.message as string | undefined;
          this.submitError.set(message ?? 'No se pudo preparar el pago. Inténtalo de nuevo.');
        }
      },
    });
  }

}
