import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { differenceInCalendarDays, format } from 'date-fns';
import { map, catchError } from 'rxjs/operators';
import { BehaviorSubject, of, switchMap } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { IBookingAvailability } from '../../../../core/models/booking.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { SeoService } from '../../../../core/services/seo.service';
import { BookingHeroComponent } from '../../components/booking-hero/booking-hero.component';
import { BookingCalendarComponent } from '../../components/booking-calendar/booking-calendar.component';
import { BookingRequestPanelComponent } from '../../components/booking-request-panel/booking-request-panel.component';

@Component({
  selector:    'booking-page',
  imports:     [BookingHeroComponent, BookingCalendarComponent, BookingRequestPanelComponent],
  templateUrl: './booking-page.component.html',
  styleUrl:    './booking-page.component.scss',
})
export class BookingPageComponent {
  private readonly bookingService = inject(BookingService);
  private readonly blockedService = inject(BlockedPeriodService);

  readonly loadError = signal('');
  readonly checkIn   = signal<Date | null>(null);
  readonly checkOut  = signal<Date | null>(null);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

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

  readonly nights = computed(() => {
    const checkInDate  = this.checkIn();
    const checkOutDate = this.checkOut();
    if (!checkInDate || !checkOutDate) return 0;
    return differenceInCalendarDays(checkOutDate, checkInDate);
  });

  private readonly selectedDateRange = computed(() => {
    const checkInDate  = this.checkIn();
    const checkOutDate = this.checkOut();
    if (!checkInDate || !checkOutDate) return null;
    return {
      checkIn:  format(checkInDate,  'yyyy-MM-dd'),
      checkOut: format(checkOutDate, 'yyyy-MM-dd'),
    };
  });

  readonly totalPrice = toSignal(
    toObservable(this.selectedDateRange).pipe(
      switchMap(dateRange => {
        if (!dateRange) return of(0);
        return this.bookingService.getPriceEstimate(dateRange.checkIn, dateRange.checkOut).pipe(
          map(response => response.data.totalPrice),
          catchError(() => of(0)),
        );
      }),
    ),
    { initialValue: 0 },
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
