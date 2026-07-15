import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { format } from 'date-fns';
import { map, catchError } from 'rxjs/operators';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { BookingDraftService } from '../../../../core/services/booking-draft.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { PricingSettingsService } from '../../../../core/services/pricing-settings.service';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { IBookingAvailability, IPriceEstimate } from '../../../../core/models/booking.model';
import { IBlockedPeriodAvailability } from '../../../../core/models/blocked-period.model';
import { IPricingSettings } from '../../../../core/models/pricing-settings.model';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { SeoService } from '../../../../core/services/seo.service';
import { BookingHeroComponent } from '../../components/booking-hero/booking-hero.component';
import { BookingAdvantagesComponent } from '../../components/booking-advantages/booking-advantages.component';
import { BookingCalendarComponent } from '../../components/booking-calendar/booking-calendar.component';
import { BookingRequestPanelComponent } from '../../components/booking-request-panel/booking-request-panel.component';

const EMPTY_ESTIMATE: IPriceEstimate = {
  totalPrice: 0, depositAmount: 0, remainingAmount: 0, nights: 0, pricePerNight: [],
};

@Component({
  selector:    'booking-page',
  imports:     [BookingHeroComponent, BookingAdvantagesComponent, BookingCalendarComponent, BookingRequestPanelComponent],
  templateUrl: './booking-page.component.html',
  styleUrl:    './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly bookingService      = inject(BookingService);
  private readonly blockedService      = inject(BlockedPeriodService);
  private readonly pricingSettingsService = inject(PricingSettingsService);
  private readonly pricingRuleService  = inject(PricingRuleService);
  private readonly draft               = inject(BookingDraftService);

  readonly loadError = signal('');
  // Fechas y personas viven en el borrador (sobreviven al ida-y-vuelta de Stripe y al "atrás").
  readonly checkIn   = this.draft.checkIn;
  readonly checkOut  = this.draft.checkOut;
  readonly guests    = this.draft.guests;

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly pricingSettings = toSignal(
    this.pricingSettingsService.get().pipe(
      map(response => response.data),
      catchError(() => of(null as IPricingSettings | null)),
    ),
    { initialValue: null as IPricingSettings | null },
  );

  readonly pricingRules = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.pricingRuleService.getAll().pipe(
        map(response => response.data),
        catchError(() => of([] as IPricingRule[])),
      )),
    ),
    { initialValue: [] as IPricingRule[] },
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
      switchMap(() => this.blockedService.getAvailability().pipe(
        map(response => response.data),
        catchError(() => of([] as IBlockedPeriodAvailability[])),
      )),
    ),
    { initialValue: [] as IBlockedPeriodAvailability[] },
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

    // Si el navegador restaura esta página desde bfcache (botón "atrás" tras ir a Stripe),
    // se fuerza una recarga completa para traer datos frescos y recalcular el pago pendiente.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', onPageShow);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('pageshow', onPageShow));
  }

  onConflict(): void {
    this.checkIn.set(null);
    this.checkOut.set(null);
    this.draft.clearPendingPayment();
    this.refresh$.next();
  }
}
