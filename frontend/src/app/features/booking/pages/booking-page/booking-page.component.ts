import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  addDays, addMonths, differenceInCalendarDays,
  endOfMonth, format, getDate, getDay,
  isAfter, isBefore, isSameDay, isToday,
  startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

interface CalendarDay {
  readonly date:       Date | null;
  readonly dayNumber:  number;
  readonly isToday:    boolean;
  readonly isPast:     boolean;
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
  readonly PRICE_PER_NIGHT = 150;
  readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

  // ── Estado del calendario ─────────────────────────────────────────────────
  readonly currentMonth = signal(new Date());
  readonly checkIn      = signal<Date | null>(null);
  readonly checkOut     = signal<Date | null>(null);
  readonly isSubmitted  = signal(false);

  readonly calendarDays = computed(() =>
    this.buildCalendarDays(this.currentMonth(), this.checkIn(), this.checkOut())
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

  readonly totalPrice = computed(() => this.nights() * this.PRICE_PER_NIGHT);

  // ── Estado del formulario ─────────────────────────────────────────────────
  readonly nameValue      = signal('');
  readonly emailValue     = signal('');
  readonly phoneValue     = signal('');
  readonly messageValue   = signal('');
  readonly privacyChecked = signal(false);

  readonly nameTouched    = signal(false);
  readonly emailTouched   = signal(false);
  readonly privacyTouched = signal(false);

  readonly nameError = computed(() => {
    if (!this.nameTouched()) return '';
    if (this.nameValue().trim().length < 2) return 'El nombre es obligatorio';
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
    const privacyValid = this.privacyChecked();
    return nameValid && emailValid && privacyValid;
  });

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
      this.checkOut.set(day.date);
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
    this.privacyTouched.set(true);

    if (!this.isFormValid() || !this.checkIn() || !this.checkOut()) return;
    this.isSubmitted.set(true);
  }

  resetBooking(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.nameValue.set('');
    this.emailValue.set('');
    this.phoneValue.set('');
    this.messageValue.set('');
    this.privacyChecked.set(false);
    this.nameTouched.set(false);
    this.emailTouched.set(false);
    this.privacyTouched.set(false);
    this.isSubmitted.set(false);
  }

  // ── Generación del grid del calendario ───────────────────────────────────
  private buildCalendarDays(
    month: Date,
    checkInDate: Date | null,
    checkOutDate: Date | null
  ): CalendarDay[] {
    const monthStart   = startOfMonth(month);
    const monthEnd     = endOfMonth(month);
    const today        = startOfDay(new Date());
    const startWeekDay = getDay(monthStart);
    const leadingDays  = startWeekDay === 0 ? 6 : startWeekDay - 1;

    const days: CalendarDay[] = [];

    for (let i = 0; i < leadingDays; i++) {
      days.push({ date: null, dayNumber: 0, isToday: false, isPast: false,
                  isCheckIn: false, isCheckOut: false, isInRange: false, isDisabled: true });
    }

    let current = monthStart;
    while (!isAfter(current, monthEnd)) {
      const isPast = isBefore(startOfDay(current), today);
      days.push({
        date:       current,
        dayNumber:  getDate(current),
        isToday:    isToday(current),
        isPast,
        isCheckIn:  checkInDate  !== null && isSameDay(current, checkInDate),
        isCheckOut: checkOutDate !== null && isSameDay(current, checkOutDate),
        isInRange:  checkInDate !== null && checkOutDate !== null &&
                    isAfter(current, checkInDate) && isBefore(current, checkOutDate),
        isDisabled: isPast,
      });
      current = addDays(current, 1);
    }

    return days;
  }
}
