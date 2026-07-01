import { Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import {
  addDays, addMonths, differenceInCalendarDays,
  endOfMonth, format, getDate, getDay,
  isAfter, isBefore, isSameDay, isToday,
  startOfDay, startOfMonth, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { IBookingAvailability } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IPricingSettings } from '../../../../core/models/pricing-settings.model';

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
  readonly price:      number;
}

@Component({
  selector: 'booking-calendar',
  imports: [TranslatePipe],
  templateUrl: './booking-calendar.component.html',
  styleUrl: './booking-calendar.component.scss',
})
export class BookingCalendarComponent {
  readonly bookedRanges    = input<IBookingAvailability[]>([]);
  readonly blockedPeriods  = input<IBlockedPeriod[]>([]);
  readonly checkIn         = input<Date | null>(null);
  readonly checkOut        = input<Date | null>(null);
  readonly loadError       = input('');
  readonly pricingSettings = input<IPricingSettings | null>(null);

  readonly checkInChange  = output<Date | null>();
  readonly checkOutChange = output<Date | null>();

  readonly weekDays = [
    'booking.cal.days.mon', 'booking.cal.days.tue', 'booking.cal.days.wed',
    'booking.cal.days.thu', 'booking.cal.days.fri', 'booking.cal.days.sat',
    'booking.cal.days.sun',
  ] as const;

  readonly currentMonth = signal(new Date());

  readonly calendarDays = computed(() =>
    this.buildCalendarDays(
      this.currentMonth(),
      this.checkIn(),
      this.checkOut(),
      this.bookedRanges(),
      this.blockedPeriods(),
      this.pricingSettings(),
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
    const parsedBooked  = this.bookedRanges().map(b => ({
      start: startOfDay(new Date(b.checkIn)),
      end:   startOfDay(new Date(b.checkOut)),
    }));
    const parsedBlocked = this.blockedPeriods().map(b => ({
      start: startOfDay(new Date(b.startDate)),
      end:   startOfDay(addDays(new Date(b.endDate), 1)),
    }));
    const days = differenceInCalendarDays(end, start);

    for (let i = 1; i < days; i++) {
      const day = addDays(startOfDay(start), i);
      if (parsedBooked.some(r  => !isBefore(day, r.start) && isBefore(day, r.end))) return true;
      if (parsedBlocked.some(r => !isBefore(day, r.start) && isBefore(day, r.end))) return true;
    }
    return false;
  }

  private buildCalendarDays(
    month: Date,
    checkInDate: Date | null,
    checkOutDate: Date | null,
    bookedRanges: IBookingAvailability[],
    blockedPeriods: IBlockedPeriod[],
    pricingSettings: IPricingSettings | null,
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
        price: 0,
      });
    }

    const parsedBooked  = bookedRanges.map(b => ({
      start: startOfDay(new Date(b.checkIn)),
      end:   startOfDay(new Date(b.checkOut)),
    }));
    const parsedBlocked = blockedPeriods.map(b => ({
      start: startOfDay(new Date(b.startDate)),
      end:   startOfDay(addDays(new Date(b.endDate), 1)),
    }));

    let current = monthStart;
    while (!isAfter(current, monthEnd)) {
      const isPast    = isBefore(startOfDay(current), today);
      const isBooked  = parsedBooked.some(r  => !isBefore(current, r.start) && isBefore(current, r.end));
      const isBlocked = parsedBlocked.some(r => !isBefore(current, r.start) && isBefore(current, r.end));

      let price = 0;
      if (!isPast && !isBooked && !isBlocked && pricingSettings) {
        const dow = getDay(current); // 0=Dom, 1=Lun, ..., 5=Vie, 6=Sáb
        if (dow === 5)      price = pricingSettings.friPrice;
        else if (dow === 6) price = pricingSettings.satPrice;
        else if (dow !== 0) price = pricingSettings.monThuPrice;
      }

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
        price,
      });
      current = addDays(current, 1);
    }

    return days;
  }
}
