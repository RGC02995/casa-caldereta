import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { IBooking } from '../../../../core/models/booking.model';

interface IQuickLink {
  readonly label: string;
  readonly icon:  string;
  readonly route: string;
}

@Component({
  selector: 'admin-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl:    './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private readonly bookingService = inject(BookingService);

  readonly bookingsError = signal('');

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

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
    const today = new Date();
    const isOccupied = this.upcomingBookings().some(booking =>
      new Date(booking.checkIn) <= today &&
      new Date(booking.checkOut) >= today &&
      booking.status === 'confirmed',
    );
    return isOccupied ? 'occupied' : 'free';
  });

  readonly quickLinks: IQuickLink[] = [
    { label: 'Gestionar fotos',  icon: '🖼', route: '/admin/fotos'    },
    { label: 'Gestionar rutas',  icon: '🗺', route: '/admin/rutas'    },
    { label: 'Ver reservas',     icon: '📅', route: '/admin/reservas' },
  ];
}
