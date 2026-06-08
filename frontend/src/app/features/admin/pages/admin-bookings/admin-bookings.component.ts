import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';

type StatusFilter = 'all' | BookingStatus;

interface IStatusTransition {
  readonly label:  string;
  readonly status: BookingStatus;
}

const STATUS_TRANSITIONS: Record<BookingStatus, IStatusTransition[]> = {
  pending:   [{ label: 'Confirmar',  status: 'confirmed' }, { label: 'Cancelar',  status: 'cancelled' }],
  confirmed: [{ label: 'Completar', status: 'completed' }, { label: 'Cancelar',  status: 'cancelled' }],
  cancelled: [],
  completed: [],
};

@Component({
  selector: 'admin-bookings',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './admin-bookings.component.html',
  styleUrl:    './admin-bookings.component.scss',
})
export class AdminBookingsComponent {
  private readonly bookingService = inject(BookingService);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly activeFilter = signal<StatusFilter>('all');
  readonly processingId = signal<string | null>(null);
  readonly allBookings  = signal<IBooking[]>([]);

  readonly filteredBookings = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allBookings();
    return this.allBookings().filter(booking => booking.status === filter);
  });

  readonly filters: { label: string; value: StatusFilter }[] = [
    { label: 'Todas',       value: 'all'       },
    { label: 'Pendientes',  value: 'pending'   },
    { label: 'Confirmadas', value: 'confirmed' },
    { label: 'Canceladas',  value: 'cancelled' },
    { label: 'Completadas', value: 'completed' },
  ];

  constructor() {
    this.loadBookings();
  }

  getTransitions(status: BookingStatus): IStatusTransition[] {
    return STATUS_TRANSITIONS[status];
  }

  changeStatus(bookingId: string, newStatus: BookingStatus): void {
    if (this.processingId()) return;
    this.processingId.set(bookingId);
    this.actionError.set('');

    this.bookingService.updateStatus(bookingId, newStatus).subscribe({
      next: response => {
        this.allBookings.update(bookings =>
          bookings.map(booking => booking.id === bookingId ? response.data : booking),
        );
        this.processingId.set(null);
      },
      error: () => {
        this.actionError.set('No se pudo actualizar el estado. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  deleteBooking(bookingId: string, guestName: string): void {
    if (this.processingId()) return;
    if (!confirm(`¿Eliminar la reserva de ${guestName}? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(bookingId);
    this.actionError.set('');

    this.bookingService.delete(bookingId).subscribe({
      next: () => {
        this.allBookings.update(bookings => bookings.filter(booking => booking.id !== bookingId));
        this.processingId.set(null);
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la reserva. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  private loadBookings(): void {
    this.bookingService.getAll().pipe(
      map(response => response.data),
      catchError(() => {
        this.loadError.set('No se pudieron cargar las reservas.');
        return of([] as IBooking[]);
      }),
    ).subscribe(bookings => this.allBookings.set(bookings));
  }
}
