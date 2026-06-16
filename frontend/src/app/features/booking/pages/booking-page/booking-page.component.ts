import { Component, computed, inject, signal } from '@angular/core';
import { differenceInCalendarDays } from 'date-fns';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { IBookingAvailability } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { SeoService } from '../../../../core/services/seo.service';
import { BookingHeroComponent } from '../../components/booking-hero/booking-hero.component';
import { BookingCalendarComponent } from '../../components/booking-calendar/booking-calendar.component';
import { BookingRequestPanelComponent } from '../../components/booking-request-panel/booking-request-panel.component';

const DEFAULT_PRICE_PER_NIGHT = 150;

@Component({
  selector: 'booking-page',
  standalone: true,
  imports: [BookingHeroComponent, BookingCalendarComponent, BookingRequestPanelComponent],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly bookingService = inject(BookingService);
  private readonly blockedService = inject(BlockedPeriodService);
  private readonly pricingService = inject(PricingRuleService);

  readonly bookedRanges   = signal<IBookingAvailability[]>([]);
  readonly blockedPeriods = signal<IBlockedPeriod[]>([]);
  readonly pricingRules   = signal<IPricingRule[]>([]);
  readonly loadError      = signal('');

  readonly checkIn  = signal<Date | null>(null);
  readonly checkOut = signal<Date | null>(null);

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

  constructor() {
    inject(SeoService).setPage({
      title:         'Reservar',
      description:   'Consulta disponibilidad y reserva Casa Caldereta en Aielo de Rugat, Valencia. Alojamiento rural de lujo para hasta 6 personas con jacuzzi y terraza privada.',
      canonicalPath: '/reservar',
      keywords:      'reservar casa rural Valencia, disponibilidad alojamiento Aielo de Rugat, reserva casa vacaciones Valencia',
    });
    this.loadData();
  }

  onConflict(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.loadData();
  }

  onNewRequest(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.loadData();
  }

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
}
