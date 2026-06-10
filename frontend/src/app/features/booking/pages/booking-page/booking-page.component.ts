import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  addDays, addMonths, differenceInCalendarDays,
  endOfMonth, format, getDate, getDay,
  isAfter, isBefore, isSameDay, isToday,
  startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { BookingService } from '../../../../core/services/booking.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { IBookingAvailability } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { SeoService } from '../../../../core/services/seo.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s\-]{6,20}$/;
const DEFAULT_PRICE_PER_NIGHT = 150;

interface CalendarDay {
  readonly date:       Date | null;
  readonly dayNumber:  number;
  readonly isToday:    boolean;
  readonly isPast:     boolean;
  readonly isBooked:   boolean;
  readonly isBlocked:  boolean;
  readonly isCheckIn:  boolean;
  readonly isCheckOut: boolean;
  readonly isInRange:  boolean;
  readonly isDisabled: boolean;
}

@Component({
  selector: 'booking-page',
  standalone: true,
  imports: [RouterLink, DateFormatPipe],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly bookingService = inject(BookingService);
  private readonly blockedService = inject(BlockedPeriodService);
  private readonly pricingService = inject(PricingRuleService);

  readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

  // ── Datos de disponibilidad ──────────────────────────────────────────────
  readonly bookedRanges   = signal<IBookingAvailability[]>([]);
  readonly blockedPeriods = signal<IBlockedPeriod[]>([]);
  readonly pricingRules   = signal<IPricingRule[]>([]);
  readonly loadError      = signal('');

  // ── Estado del calendario ─────────────────────────────────────────────────
  readonly currentMonth = signal(new Date());
  readonly checkIn      = signal<Date | null>(null);
  readonly checkOut     = signal<Date | null>(null);
  readonly isSubmitted  = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError  = signal('');

  readonly calendarDays = computed(() =>
    this.buildCalendarDays(
      this.currentMonth(),
      this.checkIn(),
      this.checkOut(),
      this.bookedRanges(),
      this.blockedPeriods(),
    )
  );

  readonly monthLabel = computed(() =>
    format(this.currentMonth(), 'MMMM yyyy', { locale: es })
  );

  readonly isPrevMonthDisabled = computed(() =>
    isBefore(endOfMonth(subMonths(this.currentMonth(), 1)), startOfDay(new Date()))
  );

  readonly nights = computed(() => {
    const checkInDate  = this.checkIn();
    const checkOutDate = this.checkOut();
    if (!checkInDate || !checkOutDate) return 0;
    return differenceInCalendarDays(checkOutDate, checkInDate);
  });

  readonly totalPrice = computed(() => {
    const checkInDate  = this.checkIn();
    const checkOutDate = this.checkOut();
    if (!checkInDate || !checkOutDate || this.nights() <= 0) return 0;

    const rules  = this.pricingRules();
    let total    = 0;
    const cursor = new Date(checkInDate);
    cursor.setHours(12, 0, 0, 0);

    while (cursor < checkOutDate) {
      const rule = rules.find(r => {
        const start = new Date(r.startDate);
        const end   = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return cursor >= start && cursor <= end;
      });
      total += rule ? rule.pricePerNight : DEFAULT_PRICE_PER_NIGHT;
      cursor.setDate(cursor.getDate() + 1);
    }
    return total;
  });

  // ── Estado del formulario ─────────────────────────────────────────────────
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

  readonly phoneError = computed(() => {
    if (!this.phoneTouched()) return '';
    const trimmed = this.phoneValue().trim();
    if (trimmed.length === 0) return 'El teléfono es obligatorio';
    if (!PHONE_REGEX.test(trimmed)) return 'Introduce un teléfono válido (+34 600 000 000)';
    return '';
  });

  readonly emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const trimmedEmail = this.emailValue().trim();
    if (!trimmedEmail) return 'El email es obligatorio';
    if (!EMAIL_REGEX.test(trimmedEmail)) return 'Introduce un email válido';
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

  constructor() {
    inject(SeoService).setPage({
      title:         'Reservar',
      description:   'Consulta disponibilidad y reserva Casa Caldereta en Aielo de Rugat, Valencia. Alojamiento rural de lujo para hasta 6 personas con jacuzzi y terraza privada.',
      canonicalPath: '/reservar',
      keywords:      'reservar casa rural Valencia, disponibilidad alojamiento Aielo de Rugat, reserva casa vacaciones Valencia',
    });
    this.loadData();
  }

  // ── Navegación del calendario ─────────────────────────────────────────────
  goToPreviousMonth(): void {
    if (this.isPrevMonthDisabled()) return;
    this.currentMonth.update(month => subMonths(month, 1));
  }

  goToNextMonth(): void {
    this.currentMonth.update(month => addMonths(month, 1));
  }

  // ── Selección de fechas ───────────────────────────────────────────────────
  onDayClick(day: CalendarDay): void {
    if (!day.date || day.isDisabled) return;

    const currentCheckIn = this.checkIn();

    if (!currentCheckIn || this.checkOut() !== null) {
      this.checkIn.set(day.date);
      this.checkOut.set(null);
    } else if (isAfter(day.date, currentCheckIn)) {
      if (this.hasUnavailableBetween(currentCheckIn, day.date)) {
        // Si hay fechas no disponibles en el rango, reinicia la selección
        this.checkIn.set(day.date);
        this.checkOut.set(null);
      } else {
        this.checkOut.set(day.date);
      }
    } else {
      this.checkIn.set(day.date);
      this.checkOut.set(null);
    }
  }

  // ── Envío del formulario ──────────────────────────────────────────────────
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

    this.bookingService.create(requestData).subscribe({
      next: () => {
        this.isSubmitted.set(true);
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.checkIn.set(null);
          this.checkOut.set(null);
          this.loadData();
          this.submitError.set('Esas fechas acaban de ser reservadas por otro usuario. El calendario se ha actualizado — selecciona nuevas fechas.');
        } else {
          const message = err.error?.message as string | undefined;
          this.submitError.set(message ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
        }
      },
    });
  }

  resetBooking(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.nameValue.set('');
    this.emailValue.set('');
    this.phoneValue.set('');
    this.guestsValue.set(2);
    this.messageValue.set('');
    this.privacyChecked.set(false);
    this.nameTouched.set(false);
    this.emailTouched.set(false);
    this.phoneTouched.set(false);
    this.privacyTouched.set(false);
    this.isSubmitted.set(false);
    this.submitError.set('');
    this.loadData();
  }

  // ── Carga de datos de disponibilidad ─────────────────────────────────────
  private loadData(): void {
    this.bookingService.getAvailability().pipe(
      map(response => response.data),
      catchError(() => {
        this.loadError.set('No se pudo comprobar la disponibilidad. Algunas fechas pueden no estar actualizadas.');
        return of([] as IBookingAvailability[]);
      }),
    ).subscribe(ranges => this.bookedRanges.set(ranges));

    this.blockedService.getAll().pipe(
      map(response => response.data),
      catchError(() => of([] as IBlockedPeriod[])),
    ).subscribe(periods => this.blockedPeriods.set(periods));

    this.pricingService.getAll().pipe(
      map(response => response.data),
      catchError(() => of([] as IPricingRule[])),
    ).subscribe(rules => this.pricingRules.set(rules));
  }

  // ── Comprueba si hay fechas no disponibles entre dos fechas (excluye extremos) ──
  private hasUnavailableBetween(start: Date, end: Date): boolean {
    const booked  = this.bookedRanges();
    const blocked = this.blockedPeriods();
    const days    = differenceInCalendarDays(end, start);

    for (let i = 1; i < days; i++) {
      const day = addDays(startOfDay(start), i);

      const isBooked = booked.some(b => {
        const checkIn  = startOfDay(new Date(b.checkIn));
        const checkOut = startOfDay(new Date(b.checkOut));
        return !isBefore(day, checkIn) && isBefore(day, checkOut);
      });

      const isBlocked = blocked.some(b => {
        const blockStart = startOfDay(new Date(b.startDate));
        const blockEnd   = startOfDay(addDays(new Date(b.endDate), 1));
        return !isBefore(day, blockStart) && isBefore(day, blockEnd);
      });

      if (isBooked || isBlocked) return true;
    }
    return false;
  }

  // ── Generación del grid del calendario ───────────────────────────────────
  private buildCalendarDays(
    month: Date,
    checkInDate: Date | null,
    checkOutDate: Date | null,
    bookedRanges: IBookingAvailability[],
    blockedPeriods: IBlockedPeriod[],
  ): CalendarDay[] {
    const monthStart   = startOfMonth(month);
    const monthEnd     = endOfMonth(month);
    const today        = startOfDay(new Date());
    const startWeekDay = getDay(monthStart);
    const leadingDays  = startWeekDay === 0 ? 6 : startWeekDay - 1;

    const days: CalendarDay[] = [];

    for (let i = 0; i < leadingDays; i++) {
      days.push({
        date: null, dayNumber: 0, isToday: false, isPast: false,
        isBooked: false, isBlocked: false,
        isCheckIn: false, isCheckOut: false, isInRange: false, isDisabled: true,
      });
    }

    let current = monthStart;
    while (!isAfter(current, monthEnd)) {
      const isPast = isBefore(startOfDay(current), today);

      const isBooked = bookedRanges.some(b => {
        const checkIn  = startOfDay(new Date(b.checkIn));
        const checkOut = startOfDay(new Date(b.checkOut));
        return !isBefore(current, checkIn) && isBefore(current, checkOut);
      });

      const isBlocked = blockedPeriods.some(b => {
        const blockStart = startOfDay(new Date(b.startDate));
        const blockEnd   = startOfDay(addDays(new Date(b.endDate), 1));
        return !isBefore(current, blockStart) && isBefore(current, blockEnd);
      });

      days.push({
        date:       current,
        dayNumber:  getDate(current),
        isToday:    isToday(current),
        isPast,
        isBooked,
        isBlocked,
        isCheckIn:  checkInDate  !== null && isSameDay(current, checkInDate),
        isCheckOut: checkOutDate !== null && isSameDay(current, checkOutDate),
        isInRange:  checkInDate !== null && checkOutDate !== null &&
                    isAfter(current, checkInDate) && isBefore(current, checkOutDate),
        isDisabled: isPast || isBooked || isBlocked,
      });
      current = addDays(current, 1);
    }

    return days;
  }
}
