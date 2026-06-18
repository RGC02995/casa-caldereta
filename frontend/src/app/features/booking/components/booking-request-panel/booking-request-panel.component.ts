import { Component, computed, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { format } from 'date-fns';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { BookingService } from '../../../../core/services/booking.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s\-]{6,20}$/;

@Component({
  selector: 'booking-request-panel',
  imports: [RouterLink, TranslatePipe, DateFormatPipe],
  templateUrl: './booking-request-panel.component.html',
  styleUrl: './booking-request-panel.component.scss',
})
export class BookingRequestPanelComponent {
  private readonly bookingService = inject(BookingService);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly translate      = inject(TranslateService);

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
    if (this.nameValue().trim().length < 2) return 'booking.form.errors.nameRequired';
    return '';
  });

  readonly emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const trimmedEmail = this.emailValue().trim();
    if (!trimmedEmail) return 'booking.form.errors.emailRequired';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'booking.form.errors.emailInvalid';
    return '';
  });

  readonly phoneError = computed(() => {
    if (!this.phoneTouched()) return '';
    const trimmed = this.phoneValue().trim();
    if (trimmed.length === 0) return 'booking.form.errors.phoneRequired';
    if (!PHONE_REGEX.test(trimmed)) return 'booking.form.errors.phoneInvalid';
    return '';
  });

  readonly privacyError = computed(() => {
    if (!this.privacyTouched()) return '';
    if (!this.privacyChecked()) return 'booking.form.errors.privacyRequired';
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
          this.submitError.set(this.translate.instant('booking.form.errors.conflict'));
          this.conflictDetected.emit();
        } else {
          const serverMessage = err.error?.message as string | undefined;
          this.submitError.set(serverMessage ?? this.translate.instant('booking.form.errors.default'));
        }
      },
    });
  }

}
