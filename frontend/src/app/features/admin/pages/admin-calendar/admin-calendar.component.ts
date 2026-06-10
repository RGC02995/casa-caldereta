import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { BookingService } from '../../../../core/services/booking.service';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IBooking } from '../../../../core/models/booking.model';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface IAdminCalendarDay {
  readonly day:           number;
  readonly dateStr:       string;
  readonly isBlocked:     boolean;
  readonly blockedPeriod: IBlockedPeriod | null;
  readonly booking:       IBooking | null;
  readonly price:         number | null;
  readonly isToday:       boolean;
  readonly isPast:        boolean;
}

@Component({
  selector: 'admin-calendar',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './admin-calendar.component.html',
  styleUrl:    './admin-calendar.component.scss',
})
export class AdminCalendarComponent {
  private readonly pricingService = inject(PricingRuleService);
  private readonly blockedService = inject(BlockedPeriodService);
  private readonly bookingService = inject(BookingService);

  readonly weekdays = WEEKDAY_LABELS;

  readonly loadError         = signal('');
  readonly pricingError      = signal('');
  readonly blockedError      = signal('');
  readonly processingId      = signal<string | null>(null);
  readonly activePanel       = signal<'pricing' | 'blocked'>('pricing');
  readonly isSubmittingPrice = signal(false);
  readonly isSubmittingBlock = signal(false);

  private readonly pricingRefresh$  = new BehaviorSubject<void>(undefined);
  private readonly blockedRefresh$  = new BehaviorSubject<void>(undefined);
  private readonly bookingsRefresh$ = new BehaviorSubject<void>(undefined);

  readonly pricingRules = toSignal(
    this.pricingRefresh$.pipe(
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
    this.blockedRefresh$.pipe(
      switchMap(() => this.blockedService.getAll().pipe(
        map(response => response.data),
        catchError(() => of([] as IBlockedPeriod[])),
      )),
    ),
    { initialValue: [] as IBlockedPeriod[] },
  );

  readonly allBookings = toSignal(
    this.bookingsRefresh$.pipe(
      switchMap(() => this.bookingService.getAll().pipe(
        map(response => response.data),
        catchError(() => of([] as IBooking[])),
      )),
    ),
    { initialValue: [] as IBooking[] },
  );

  readonly viewYear  = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());

  // Pricing form
  readonly priceLabel     = signal('');
  readonly priceStart     = signal('');
  readonly priceEnd       = signal('');
  readonly pricePerNight  = signal<number | null>(null);
  readonly priceMinNights = signal(1);
  readonly editingRuleId  = signal<string | null>(null);

  // Blocked form
  readonly blockStart  = signal('');
  readonly blockEnd    = signal('');
  readonly blockReason = signal('');

  readonly priceFormValid = computed(() =>
    this.priceLabel().trim().length > 0 &&
    this.priceStart().length > 0 &&
    this.priceEnd().length > 0 &&
    this.pricePerNight() !== null &&
    (this.pricePerNight() ?? 0) >= 1 &&
    this.priceMinNights() >= 1
  );

  readonly blockFormValid = computed(() =>
    this.blockStart().length > 0 &&
    this.blockEnd().length > 0
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
    const startPad    = (firstDay.getDay() + 6) % 7; // Monday-based

    const cells: (IAdminCalendarDay | null)[] = Array.from({ length: startPad }, () => null);

    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const blockedPeriod = blocked.find(b => {
        const start = new Date(b.startDate);
        const end   = new Date(b.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }) ?? null;

      const booking = bookings.find(b => {
        if (b.status !== 'confirmed' && b.status !== 'pending') return false;
        const checkIn  = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        return date >= checkIn && date < checkOut;
      }) ?? null;

      const matchingRules = rules.filter(r => {
        const start = new Date(r.startDate);
        const end   = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      });

      const lastMatchingRule = matchingRules.at(-1);

      cells.push({
        day:           d,
        dateStr,
        isBlocked:     blockedPeriod !== null,
        blockedPeriod,
        booking,
        price:         lastMatchingRule ? lastMatchingRule.pricePerNight : null,
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

  startEditRule(rule: IPricingRule): void {
    this.editingRuleId.set(rule.id);
    this.priceLabel.set(rule.label);
    this.priceStart.set(rule.startDate.slice(0, 10));
    this.priceEnd.set(rule.endDate.slice(0, 10));
    this.pricePerNight.set(rule.pricePerNight);
    this.priceMinNights.set(rule.minNights);
    this.pricingError.set('');
  }

  cancelEditRule(): void {
    this.editingRuleId.set(null);
    this.resetPriceForm();
  }

  onPricingSubmit(event: Event): void {
    event.preventDefault();
    if (!this.priceFormValid() || this.isSubmittingPrice()) return;

    const price = this.pricePerNight();
    if (price === null) return;

    const data = {
      label:         this.priceLabel().trim(),
      startDate:     this.priceStart(),
      endDate:       this.priceEnd(),
      pricePerNight: price,
      minNights:     this.priceMinNights(),
    };

    this.isSubmittingPrice.set(true);
    this.pricingError.set('');

    const editingId = this.editingRuleId();
    const request$  = editingId
      ? this.pricingService.update(editingId, data)
      : this.pricingService.create(data);

    request$.subscribe({
      next: () => {
        this.editingRuleId.set(null);
        this.resetPriceForm();
        this.isSubmittingPrice.set(false);
        this.pricingRefresh$.next();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message as string | undefined;
        this.pricingError.set(message ?? 'No se pudo guardar la regla. Inténtalo de nuevo.');
        this.isSubmittingPrice.set(false);
      },
    });
  }

  deleteRule(ruleId: string): void {
    if (this.processingId()) return;
    if (!confirm('¿Eliminar esta regla de precio? Esta acción no se puede deshacer.')) return;

    this.processingId.set(ruleId);
    this.pricingError.set('');

    this.pricingService.delete(ruleId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.pricingRefresh$.next();
      },
      error: () => {
        this.pricingError.set('No se pudo eliminar la regla. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  onBlockedSubmit(event: Event): void {
    event.preventDefault();
    if (!this.blockFormValid() || this.isSubmittingBlock()) return;

    this.isSubmittingBlock.set(true);
    this.blockedError.set('');

    const reason = this.blockReason().trim();
    this.blockedService.create({
      startDate: this.blockStart(),
      endDate:   this.blockEnd(),
      ...(reason ? { reason } : {}),
    }).subscribe({
      next: () => {
        this.resetBlockForm();
        this.isSubmittingBlock.set(false);
        this.blockedRefresh$.next();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message as string | undefined;
        this.blockedError.set(message ?? 'No se pudo crear el bloqueo. Inténtalo de nuevo.');
        this.isSubmittingBlock.set(false);
      },
    });
  }

  deleteBlockedPeriod(periodId: string): void {
    if (this.processingId()) return;
    if (!confirm('¿Eliminar este bloqueo? Las fechas volverán a estar disponibles.')) return;

    this.processingId.set(periodId);
    this.blockedError.set('');

    this.blockedService.delete(periodId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.blockedRefresh$.next();
      },
      error: () => {
        this.blockedError.set('No se pudo eliminar el bloqueo. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  private resetPriceForm(): void {
    this.priceLabel.set('');
    this.priceStart.set('');
    this.priceEnd.set('');
    this.pricePerNight.set(null);
    this.priceMinNights.set(1);
  }

  private resetBlockForm(): void {
    this.blockStart.set('');
    this.blockEnd.set('');
    this.blockReason.set('');
  }
}
