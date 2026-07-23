import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { BookingService } from '../../../../core/services/booking.service';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IBooking } from '../../../../core/models/booking.model';
import { AdminCalendarViewComponent, IAdminCalendarDay } from '../../components/admin-calendar-view/admin-calendar-view.component';
import { AdminCalendarPanelComponent } from '../../components/admin-calendar-panel/admin-calendar-panel.component';

@Component({
  selector:    'admin-calendar',
  imports:     [AdminCalendarViewComponent, AdminCalendarPanelComponent],
  templateUrl: './admin-calendar.component.html',
  styleUrl:    './admin-calendar.component.scss',
})
export class AdminCalendarComponent {
  private readonly pricingService = inject(PricingRuleService);
  private readonly blockedService = inject(BlockedPeriodService);
  private readonly bookingService = inject(BookingService);

  readonly loadError  = signal('');
  readonly viewYear   = signal(new Date().getFullYear());
  readonly viewMonth  = signal(new Date().getMonth());

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly pricingRules = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.pricingService.getAll().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudieron cargar los datos del calendario.');
          return of([] as IPricingRule[]);
        }),
      )),
    ),
    { initialValue: [] as IPricingRule[] },
  );

  readonly blockedPeriods = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.blockedService.getAll().pipe(
        map(response => response.data),
        catchError(() => of([] as IBlockedPeriod[])),
      )),
    ),
    { initialValue: [] as IBlockedPeriod[] },
  );

  readonly allBookings = toSignal(
    this.bookingService.getAll().pipe(
      map(response => response.data),
      catchError(() => of([] as IBooking[])),
    ),
    { initialValue: [] as IBooking[] },
  );

  readonly viewMonthLabel = computed(() =>
    new Date(this.viewYear(), this.viewMonth(), 1)
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  );

  readonly calendarCells = computed((): (IAdminCalendarDay | null)[] => {
    const year     = this.viewYear();
    const month    = this.viewMonth();
    const rules    = this.pricingRules();
    const blocked  = this.blockedPeriods();
    const bookings = this.allBookings();
    const todayStr = new Date().toISOString().slice(0, 10);

    const firstDay    = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startPad    = (firstDay.getDay() + 6) % 7;

    const cells: (IAdminCalendarDay | null)[] = Array.from({ length: startPad }, () => null);

    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const blockedPeriod = blocked.find(b => {
        const start = new Date(b.startDate);
        const end   = new Date(b.endDate);
        start.setHours(0, 0, 0, 0);
        // Manuales: endDate INCLUSIVO (el propietario bloquea el último día entero).
        // Importados de Airbnb/Booking: endDate EXCLUSIVO (día de salida — no se pinta,
        // el huésped se va por la mañana y ese día admite una nueva entrada).
        if (b.origin === 'manual') {
          end.setHours(23, 59, 59, 999);
          return date >= start && date <= end;
        }
        end.setHours(0, 0, 0, 0);
        return date >= start && date < end;
      }) ?? null;

      const booking = bookings.find(b => {
        if (b.status !== 'confirmed' && b.status !== 'pending') return false;
        const checkIn  = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        return date >= checkIn && date < checkOut;
      }) ?? null;

      const matchingRules  = rules.filter(r => {
        const start = new Date(r.startDate);
        const end   = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      });

      cells.push({
        day:           d,
        dateStr,
        isBlocked:     blockedPeriod !== null,
        blockedPeriod,
        booking,
        price:         matchingRules.at(-1)?.pricePerNight ?? null,
        isToday:       dateStr === todayStr,
        isPast:        dateStr < todayStr,
      });
    }

    return cells;
  });

  prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update(y => y - 1);
    } else {
      this.viewMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update(y => y + 1);
    } else {
      this.viewMonth.update(m => m + 1);
    }
  }

  onPricingChanged(): void { this.refresh$.next(); }
  onBlockedChanged(): void { this.refresh$.next(); }
}
