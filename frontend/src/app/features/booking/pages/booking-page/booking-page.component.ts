import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { format } from 'date-fns';
import { map, catchError } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { PricingSettingsService } from '../../../../core/services/pricing-settings.service';
import { IBookingAvailability, IPriceEstimate } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IPricingSettings } from '../../../../core/models/pricing-settings.model';
import { SeoService } from '../../../../core/services/seo.service';
import { BookingHeroComponent } from '../../components/booking-hero/booking-hero.component';
import { BookingCalendarComponent } from '../../components/booking-calendar/booking-calendar.component';
import { BookingRequestPanelComponent } from '../../components/booking-request-panel/booking-request-panel.component';

const EMPTY_ESTIMATE: IPriceEstimate = {
  totalPrice: 0, depositAmount: 0, remainingAmount: 0, nights: 0, pricePerNight: [],
};

@Component({
  selector:    'booking-page',
  imports:     [BookingHeroComponent, BookingCalendarComponent, BookingRequestPanelComponent],
  templateUrl: './booking-page.component.html',
  styleUrl:    './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly bookingService      = inject(BookingService);
  private readonly blockedService      = inject(BlockedPeriodService);
  private readonly pricingSettingsService = inject(PricingSettingsService);

  readonly loadError = signal('');
  readonly checkIn   = signal<Date | null>(null);
  readonly checkOut  = signal<Date | null>(null);
  readonly guests    = signal(2);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly pricingSettings = toSignal(
    this.pricingSettingsService.get().pipe(
      map(response => response.data),
      catchError(() => of(null as IPricingSettings | null)),
    ),
    { initialValue: null as IPricingSettings | null },
  );

  readonly bookedRanges = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.bookingService.getAvailability().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudo comprobar la disponibilidad. Algunas fechas pueden no estar actualizadas.');
          return of([] as IBookingAvailability[]);
        }),
      )),
    ),
    { initialValue: [] as IBookingAvailability[] },
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

  private readonly dateRange = computed(() => {
    const checkIn  = this.checkIn();
    const checkOut = this.checkOut();
    if (!checkIn || !checkOut) return null;
    return { checkIn: format(checkIn, 'yyyy-MM-dd'), checkOut: format(checkOut, 'yyyy-MM-dd') };
  });

  readonly priceEstimate = toSignal(
    combineLatest([
      toObservable(this.dateRange),
      toObservable(this.guests),
    ]).pipe(
      switchMap(([dateRange, guests]) => {
        if (!dateRange) return of(EMPTY_ESTIMATE);
        return this.bookingService.getPriceEstimate(dateRange.checkIn, dateRange.checkOut, guests).pipe(
          map(response => response.data),
          catchError(() => of(EMPTY_ESTIMATE)),
        );
      }),
    ),
    { initialValue: EMPTY_ESTIMATE },
  );

  constructor() {
    inject(SeoService).setPage({
      title:         'Reservar',
      description:   'Consulta disponibilidad y reserva Casa Caldereta en Aielo de Rugat, Valencia. Alojamiento rural de lujo para hasta 6 personas con jacuzzi y terraza privada.',
      canonicalPath: '/reservar',
      keywords:      'reservar casa rural Valencia, disponibilidad alojamiento Aielo de Rugat, reserva casa vacaciones Valencia',
    });
  }

  onConflict(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.refresh$.next();
  }
}
