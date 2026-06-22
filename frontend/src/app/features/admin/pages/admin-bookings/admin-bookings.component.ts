import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap, of, timer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BookingService } from '../../../../core/services/booking.service';
import { CheckinService } from '../../../../core/services/checkin.service';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';
import { ITravelerDocument } from '../../../../core/models/checkin.model';
import {
  AdminBookingListComponent,
  IBookingStatusChangeEvent,
  IBookingDeleteEvent,
  IBookingRefundEvent,
  IBookingCheckInEvent,
} from '../../components/admin-booking-list/admin-booking-list.component';

type StatusFilter = 'all' | BookingStatus;

const STATUS_CONFIRMATIONS: Partial<Record<BookingStatus, string>> = {
  confirmed: '¿Confirmar esta reserva?',
  cancelled: 'Esta acción no se puede deshacer. ¿Cancelar la reserva de forma definitiva?',
  completed: 'Esta acción no se puede deshacer. ¿Marcar la reserva como completada?',
};

@Component({
  selector:    'admin-bookings',
  imports:     [AdminBookingListComponent, DatePipe],
  templateUrl: './admin-bookings.component.html',
  styleUrl:    './admin-bookings.component.scss',
})
export class AdminBookingsComponent {
  private readonly bookingService  = inject(BookingService);
  private readonly checkinService  = inject(CheckinService);
  private readonly destroyRef      = inject(DestroyRef);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly activeFilter = signal<StatusFilter>('all');
  readonly processingId = signal<string | null>(null);
  readonly legendOpen   = signal(false);

  // Panel de viajeros
  readonly travelersBookingId = signal<string | null>(null);
  readonly travelersGuestName = signal('');
  readonly travelersData      = signal<ITravelerDocument[]>([]);
  readonly travelersLoading   = signal(false);
  readonly travelersError     = signal('');
  readonly copySuccess        = signal(false);

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

  onRefundRequested(event: IBookingRefundEvent): void {
    if (this.processingId()) return;
    if (!confirm(`${event.guestName}\n\n¿Reembolsar el pago y cancelar la reserva? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.bookingService.refundBooking(event.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processingId.set(null);
          this.refresh$.next();
        },
        error: () => {
          this.actionError.set('No se pudo procesar el reembolso. Inténtalo de nuevo.');
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

  // ── Check-in / Check-out ─────────────────────────────────────────────────────

  onSendFormRequested(event: IBookingCheckInEvent): void {
    if (this.processingId()) return;
    if (!confirm(`${event.guestName}\n\n¿Enviar el email de pre-llegada con el enlace al formulario de registro de viajeros?`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.checkinService.sendPreArrivalEmail(event.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processingId.set(null);
          this.refresh$.next();
        },
        error: () => {
          this.actionError.set('No se pudo enviar el email de pre-llegada. Inténtalo de nuevo.');
          this.processingId.set(null);
        },
      });
  }

  onCheckInRequested(event: IBookingCheckInEvent): void {
    if (this.processingId()) return;
    if (!confirm(`${event.guestName}\n\n¿Registrar la entrada? Se registrará con la hora actual.`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.checkinService.recordCheckIn(event.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processingId.set(null);
          this.refresh$.next();
        },
        error: () => {
          this.actionError.set('No se pudo registrar la entrada. Inténtalo de nuevo.');
          this.processingId.set(null);
        },
      });
  }

  onCheckOutRequested(event: IBookingCheckInEvent): void {
    if (this.processingId()) return;
    if (!confirm(`${event.guestName}\n\n¿Registrar la salida? La reserva quedará marcada como completada.`)) return;

    this.processingId.set(event.bookingId);
    this.actionError.set('');

    this.checkinService.recordCheckOut(event.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processingId.set(null);
          this.refresh$.next();
        },
        error: () => {
          this.actionError.set('No se pudo registrar la salida. Inténtalo de nuevo.');
          this.processingId.set(null);
        },
      });
  }

  // ── Panel de viajeros ─────────────────────────────────────────────────────────

  onViewTravelersRequested(bookingId: string): void {
    const booking = this.allBookings().find(b => b.id === bookingId);
    this.travelersBookingId.set(bookingId);
    this.travelersGuestName.set(booking?.guestName ?? '');
    this.travelersLoading.set(true);
    this.travelersError.set('');
    this.travelersData.set([]);

    this.checkinService.getTravelers(bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.travelersData.set(response.data);
          this.travelersLoading.set(false);
        },
        error: () => {
          this.travelersError.set('No se pudieron cargar los viajeros.');
          this.travelersLoading.set(false);
        },
      });
  }

  closeTravelers(): void {
    this.travelersBookingId.set(null);
    this.travelersData.set([]);
  }

  copyForSesHospederia(): void {
    const lines: string[] = [];
    this.travelersData().forEach((traveler, index) => {
      if (index > 0) lines.push('');
      lines.push(`--- VIAJERO ${index + 1} ---`);
      lines.push(`Apellido 1: ${traveler.apellido1}`);
      lines.push(`Apellido 2: ${traveler.apellido2}`);
      lines.push(`Nombre: ${traveler.nombre}`);
      lines.push(`Fecha nacimiento: ${new Date(traveler.fechaNacimiento).toLocaleDateString('es-ES')}`);
      lines.push(`Sexo: ${traveler.sexo}`);
      lines.push(`Parentesco: ${traveler.parentesco}`);
      lines.push(`Tipo documento: ${traveler.tipoDocumento}`);
      lines.push(`Nº documento: ${traveler.numDocumento}`);
      lines.push(`Nº soporte: ${traveler.numSoporte}`);
      lines.push(`Nacionalidad: ${traveler.pais}`);
      lines.push(`País residencia: ${traveler.paisResidencia}`);
      lines.push(`Ciudad residencia: ${traveler.ciudadResidencia}`);
      lines.push(`Dirección: ${traveler.direccionResidencia}`);
      lines.push(`Código postal: ${traveler.codigoPostal}`);
      lines.push(`Teléfono/Email: ${traveler.contacto}`);
    });

    navigator.clipboard.writeText(lines.join('\n')).catch(() => undefined);
    this.copySuccess.set(true);
    timer(2000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.copySuccess.set(false));
  }
}
