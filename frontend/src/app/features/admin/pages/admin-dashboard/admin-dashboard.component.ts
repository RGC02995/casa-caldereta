import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { CheckinService } from '../../../../core/services/checkin.service';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';
import { ITodayActivity } from '../../../../core/models/checkin.model';

interface IQuickLink {
  readonly label: string;
  readonly route: string;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pendiente de pago',
  pending:         'Pendiente',
  confirmed:       'Confirmada',
  cancelled:       'Cancelada',
  completed:       'Completada',
};

@Component({
  selector: 'admin-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl:    './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly bookingService  = inject(BookingService);
  private readonly checkinService  = inject(CheckinService);

  readonly today          = new Date();
  readonly todayFormatted = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase());

  readonly bookingsError = signal('');
  readonly todayError    = signal('');

  private readonly refresh$      = new BehaviorSubject<void>(undefined);
  private readonly todayRefresh$ = new BehaviorSubject<void>(undefined);

  readonly upcomingBookings = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.bookingService.getUpcoming().pipe(
        map(response => response.data),
        catchError(() => {
          this.bookingsError.set('No se pudieron cargar las reservas.');
          return of([] as IBooking[]);
        }),
      )),
    ),
    { initialValue: [] as IBooking[] },
  );

  readonly houseStatus = computed<'free' | 'occupied'>(() => {
    const now = new Date();
    const isOccupied = this.upcomingBookings().some(booking =>
      new Date(booking.checkIn) <= now &&
      new Date(booking.checkOut) >= now &&
      booking.status === 'confirmed',
    );
    return isOccupied ? 'occupied' : 'free';
  });

  readonly pendingCount = computed(() =>
    this.upcomingBookings().filter(booking =>
      booking.status === 'pending' || booking.status === 'pending_payment',
    ).length,
  );

  readonly nextCheckIn = computed(() => {
    const now = new Date();
    return this.upcomingBookings()
      .filter(upcomingBooking => upcomingBooking.status === 'confirmed' && new Date(upcomingBooking.checkIn) > now)
      .sort((bookingA, bookingB) =>
        new Date(bookingA.checkIn).getTime() - new Date(bookingB.checkIn).getTime(),
      )[0] ?? null;
  });

  readonly todayActivity = toSignal(
    this.todayRefresh$.pipe(
      switchMap(() => this.checkinService.getTodayActivity().pipe(
        map(response => response.data),
        catchError(() => {
          this.todayError.set('No se pudo cargar la actividad de hoy.');
          return of({ checkIns: [], checkOuts: [] } as ITodayActivity);
        }),
      )),
    ),
    { initialValue: { checkIns: [], checkOuts: [] } as ITodayActivity },
  );

  readonly hasTodayActivity = computed(() =>
    this.todayActivity().checkIns.length > 0 || this.todayActivity().checkOuts.length > 0,
  );

  readonly quickLinks: IQuickLink[] = [
    { label: 'Ver reservas',    route: '/admin/reservas'      },
    { label: 'Calendario',      route: '/admin/calendario'    },
    { label: 'Gestionar fotos', route: '/admin/fotos'         },
    { label: 'Gestionar rutas', route: '/admin/rutas'         },
    { label: 'Configuración',   route: '/admin/configuracion' },
  ];

  statusLabel(status: string): string {
    return STATUS_LABELS[status as BookingStatus] ?? status;
  }

  getNights(checkIn: Date | string, checkOut: Date | string): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay);
  }
}
