import { Component, computed, input, output, signal } from '@angular/core';
import {
  addDays, addMonths, differenceInCalendarDays,
  endOfMonth, format, getDate, getDay,
  isAfter, isBefore, isSameDay, isToday,
  startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { IBookingAvailability } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';

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
  selector: 'booking-calendar',
  standalone: true,
  imports: [],
  templateUrl: './booking-calendar.component.html',
  styleUrl: './booking-calendar.component.scss',
})
export class BookingCalendarComponent {
  readonly bookedRanges   = input<IBookingAvailability[]>([]);
  readonly blockedPeriods = input<IBlockedPeriod[]>([]);
  readonly checkIn        = input<Date | null>(null);
  readonly checkOut       = input<Date | null>(null);
  readonly loadError      = input('');

  readonly checkInChange  = output<Date | null>();
  readonly checkOutChange = output<Date | null>();

  readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

  readonly currentMonth = signal(new Date());

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

  goToPreviousMonth(): void {
    if (this.isPrevMonthDisabled()) return;
    this.currentMonth.update(month => subMonths(month, 1));
  }

  goToNextMonth(): void {
    this.currentMonth.update(month => addMonths(month, 1));
  }

  onDayClick(day: CalendarDay): void {
    if (!day.date || day.isDisabled) return;

    const currentCheckIn = this.checkIn();

    if (!currentCheckIn || this.checkOut() !== null) {
      this.checkInChange.emit(day.date);
      this.checkOutChange.emit(null);
    } else if (isAfter(day.date, currentCheckIn)) {
      if (this.hasUnavailableBetween(currentCheckIn, day.date)) {
        this.checkInChange.emit(day.date);
        this.checkOutChange.emit(null);
      } else {
        this.checkOutChange.emit(day.date);
      }
    } else {
      this.checkInChange.emit(day.date);
      this.checkOutChange.emit(null);
    }
  }

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
