import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  addDays, addMonths, differenceInCalendarDays,
  endOfMonth, format, getDate, getDay,
  isAfter, isBefore, isSameDay, isToday,
  startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { emailValidator } from '../../../../shared/validators/email.validator';

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
  imports: [ReactiveFormsModule, RouterLink, DateFormatPipe],
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

  // ── Formulario ────────────────────────────────────────────────────────────
  readonly bookingForm = new FormGroup({
    name:    new FormControl('', [Validators.required, Validators.minLength(2)]),
    email:   new FormControl('', [Validators.required, emailValidator]),
    phone:   new FormControl(''),
    message: new FormControl(''),
    privacy: new FormControl(false, [Validators.requiredTrue]),
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
      // Iniciar nueva selección
      this.checkIn.set(day.date);
      this.checkOut.set(null);
    } else if (isAfter(day.date, currentCheckIn)) {
      // Confirmar checkout
      this.checkOut.set(day.date);
    } else {
      // Reemplazar checkin
      this.checkIn.set(day.date);
      this.checkOut.set(null);
    }
  }

  // ── Envío del formulario ──────────────────────────────────────────────────
  submitBooking(): void {
    if (this.bookingForm.invalid || !this.checkIn() || !this.checkOut()) {
      this.bookingForm.markAllAsTouched();
      return;
    }
    this.isSubmitted.set(true);
  }

  resetBooking(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.bookingForm.reset();
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
    const startWeekDay = getDay(monthStart);              // 0=Dom, 1=Lun...
    const leadingDays  = startWeekDay === 0 ? 6 : startWeekDay - 1;

    const days: CalendarDay[] = [];

    // Celdas vacías al inicio
    for (let i = 0; i < leadingDays; i++) {
      days.push({ date: null, dayNumber: 0, isToday: false, isPast: false,
                  isCheckIn: false, isCheckOut: false, isInRange: false, isDisabled: true });
    }

    // Días del mes
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
