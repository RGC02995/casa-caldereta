import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';
import {
  AdminBookingListComponent,
  IBookingStatusChangeEvent,
  IBookingDeleteEvent,
} from '../../components/admin-booking-list/admin-booking-list.component';

type StatusFilter = 'all' | BookingStatus;

const STATUS_CONFIRMATIONS: Partial<Record<BookingStatus, string>> = {
  confirmed: '¿Confirmar esta reserva?',
  cancelled: 'Esta acción no se puede deshacer. ¿Cancelar la reserva de forma definitiva?',
  completed: 'Esta acción no se puede deshacer. ¿Marcar la reserva como completada?',
};

@Component({
  selector:    'admin-bookings',
  standalone:  true,
  imports:     [AdminBookingListComponent],
  templateUrl: './admin-bookings.component.html',
  styleUrl:    './admin-bookings.component.scss',
})
export class AdminBookingsComponent {
  private readonly bookingService = inject(BookingService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly activeFilter = signal<StatusFilter>('all');
  readonly processingId = signal<string | null>(null);
  readonly legendOpen   = signal(false);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly allBookings = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.bookingService.getAll().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudieron cargar las reservas.');
          return of([] as IBooking[]);
        }),
      )),
    ),
    { initialValue: [] as IBooking[] },
  );

  readonly filteredBookings = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allBookings();
    return this.allBookings().filter(booking => booking.status === filter);
  });

  onStatusChange(event: IBookingStatusChangeEvent): void {
    if (this.processingId()) return;

    const confirmMessage = STATUS_CONFIRMATIONS[event.newStatus];
    if (confirmMessage && !confirm(`${event.guestName}\n\n${confirmMessage}`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.bookingService.updateStatus(event.bookingId, event.newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo actualizar el estado. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  onDeleteRequested(event: IBookingDeleteEvent): void {
    if (this.processingId()) return;
    if (!confirm(`${event.guestName}\n\n¿Eliminar esta reserva? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.bookingService.delete(event.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la reserva. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }
}
