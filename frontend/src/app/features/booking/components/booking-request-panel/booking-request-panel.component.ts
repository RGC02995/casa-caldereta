import { Component, computed, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { format } from 'date-fns';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { BookingService } from '../../../../core/services/booking.service';
import { BookingDraftService } from '../../../../core/services/booking-draft.service';
import { IPriceEstimate } from '../../../../core/models/booking.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PrivacyContentComponent } from '../../../legal/components/privacy-content/privacy-content.component';
import { TermsContentComponent } from '../../../legal/components/terms-content/terms-content.component';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s\-]{6,20}$/;

const EMPTY_ESTIMATE: IPriceEstimate = {
  totalPrice: 0, depositAmount: 0, remainingAmount: 0, nights: 0, pricePerNight: [],
};

@Component({
  selector: 'booking-request-panel',
  imports: [TranslatePipe, DateFormatPipe, ModalComponent, PrivacyContentComponent, TermsContentComponent],
  templateUrl: './booking-request-panel.component.html',
  styleUrl: './booking-request-panel.component.scss',
})
export class BookingRequestPanelComponent {
  private readonly bookingService = inject(BookingService);
  private readonly draft          = inject(BookingDraftService);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly translate      = inject(TranslateService);

  readonly checkIn       = input<Date | null>(null);
  readonly checkOut      = input<Date | null>(null);
  readonly guests        = input<number>(2);
  readonly priceEstimate = input<IPriceEstimate>(EMPTY_ESTIMATE);

  readonly conflictDetected = output<void>();
  readonly guestsChanged    = output<number>();

  readonly isSubmitting = signal(false);
  readonly submitError  = signal('');

  readonly isPrivacyModalOpen = signal(false);
  readonly isTermsModalOpen   = signal(false);

  // Datos del huésped viven en el borrador (sobreviven al ida-y-vuelta de Stripe y al "atrás").
  readonly nameValue           = this.draft.guestName;
  readonly emailValue          = this.draft.guestEmail;
  readonly phoneValue          = this.draft.guestPhone;
  readonly messageValue        = this.draft.message;
  // Consentimientos legales NO se persisten: se re-confirman en cada intento.
  readonly privacyChecked      = signal(false);
  readonly cancelPolicyChecked = signal(false);

  // Pago en curso reanudable (el usuario volvió atrás con una sesión de Stripe aún viva).
  readonly canResumePayment = computed(() => {
    const url    = this.draft.pendingSessionUrl();
    const expiry = this.draft.pendingHoldExpiresAt();
    return url !== null && expiry !== null && expiry.getTime() > Date.now();
  });

  constructor() {
    // Si al reentrar hay una sesión guardada pero ya caducó el bloqueo, se descarta.
    if (this.draft.pendingSessionUrl() && !this.draft.hasResumablePayment()) {
      this.draft.clearPendingPayment();
    }
  }

  resumePayment(): void {
    const url = this.draft.pendingSessionUrl();
    if (url) window.location.assign(url);
  }

  readonly nameTouched          = signal(false);
  readonly emailTouched         = signal(false);
  readonly phoneTouched         = signal(false);
  readonly privacyTouched       = signal(false);
  readonly cancelPolicyTouched  = signal(false);

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

  readonly cancelPolicyError = computed(() => {
    if (!this.cancelPolicyTouched()) return '';
    if (!this.cancelPolicyChecked()) return 'booking.form.errors.cancelPolicyRequired';
    return '';
  });

  readonly isFormValid = computed(() => {
    const nameValid         = this.nameValue().trim().length >= 2;
    const emailValid        = EMAIL_REGEX.test(this.emailValue().trim());
    const phoneValid        = PHONE_REGEX.test(this.phoneValue().trim());
    const guestsValid       = this.guests() >= 1 && this.guests() <= 6;
    const privacyValid      = this.privacyChecked();
    const cancelPolicyValid = this.cancelPolicyChecked();
    return nameValid && emailValid && phoneValid && guestsValid && privacyValid && cancelPolicyValid;
  });

  onGuestsChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(value) && value >= 1 && value <= 6) {
      this.guestsChanged.emit(value);
    }
  }

  submitBooking(event: Event): void {
    event.preventDefault();
    this.nameTouched.set(true);
    this.emailTouched.set(true);
    this.phoneTouched.set(true);
    this.privacyTouched.set(true);
    this.cancelPolicyTouched.set(true);

    const checkIn  = this.checkIn();
    const checkOut = this.checkOut();

    if (!this.isFormValid() || !checkIn || !checkOut) return;
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    const notes = this.messageValue().trim();

    const requestData = {
      checkIn:    format(checkIn, 'yyyy-MM-dd'),
      checkOut:   format(checkOut, 'yyyy-MM-dd'),
      guestName:  this.nameValue().trim(),
      guestEmail: this.emailValue().trim(),
      guestPhone: this.phoneValue().trim(),
      guests:     this.guests(),
      ...(notes ? { notes } : {}),
    };

    this.bookingService.createCheckoutSession(requestData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const result = response.data;
          // Recordar la sesión para poder reanudarla si el usuario vuelve atrás desde Stripe.
          this.draft.rememberPendingPayment(
            result.bookingId,
            result.sessionUrl,
            new Date(result.holdExpiresAt),
          );
          window.location.assign(result.sessionUrl);
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
