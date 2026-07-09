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
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { AdminRefundModalComponent, IRefundConfirmedEvent } from '../../components/admin-refund-modal/admin-refund-modal.component';

type StatusFilter = 'all' | BookingStatus;

interface IPendingConfirm {
  readonly message: string;
  readonly danger:  boolean;
  readonly action:  () => void;
}

const STATUS_CONFIRMATIONS: Partial<Record<BookingStatus, string>> = {
  confirmed: '¿Confirmar esta reserva?',
  cancelled: 'Esta acción no se puede deshacer. ¿Cancelar la reserva de forma definitiva? No se procesará ningún reembolso.',
  completed: 'Esta acción no se puede deshacer. ¿Marcar la reserva como completada?',
};

@Component({
  selector:    'admin-bookings',
  imports:     [AdminBookingListComponent, DatePipe, ConfirmModalComponent, AdminRefundModalComponent],
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

  // Modal de confirmación genérico
  readonly pendingConfirm = signal<IPendingConfirm | null>(null);

  // Modal de reembolso
  readonly refundModalOpen = signal(false);
  readonly refundBookingId = signal<string | null>(null);
  readonly refundGuestName = signal('');
  readonly refundMaxAmount = signal(0);

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
    if (confirmMessage) {
      this.pendingConfirm.set({
        message: `${event.guestName}\n\n${confirmMessage}`,
        danger:  event.newStatus === 'cancelled',
        action:  () => this.executeStatusChange(event),
      });
      return;
    }

    this.executeStatusChange(event);
  }

  private executeStatusChange(event: IBookingStatusChangeEvent): void {
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

    const booking = this.allBookings().find(b => b.id === event.bookingId);
    if (!booking) return;

    const maxRefundable = booking.depositAmount + (booking.remainingPaidAt ? booking.remainingAmount : 0);

    this.refundBookingId.set(event.bookingId);
    this.refundGuestName.set(event.guestName);
    this.refundMaxAmount.set(maxRefundable);
    this.refundModalOpen.set(true);
  }

  onRefundConfirmed(event: IRefundConfirmedEvent): void {
    const bookingId = this.refundBookingId();
    this.refundModalOpen.set(false);
    if (!bookingId) return;

    this.processingId.set(bookingId);
    this.actionError.set('');

    this.bookingService.refundBooking(bookingId, event.amount)
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

  closeRefundModal(): void {
    this.refundModalOpen.set(false);
  }

  onDeleteRequested(event: IBookingDeleteEvent): void {
    if (this.processingId()) return;

    this.pendingConfirm.set({
      message: `${event.guestName}\n\n¿Eliminar esta reserva? Esta acción no se puede deshacer.`,
      danger:  true,
      action:  () => this.executeDelete(event),
    });
  }

  private executeDelete(event: IBookingDeleteEvent): void {
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

    this.pendingConfirm.set({
      message: `${event.guestName}\n\n¿Enviar el email de pre-llegada con el enlace al formulario de registro de viajeros?`,
      danger:  false,
      action:  () => this.executeSendForm(event),
    });
  }

  private executeSendForm(event: IBookingCheckInEvent): void {
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

    this.pendingConfirm.set({
      message: `${event.guestName}\n\n¿Registrar la entrada? Se registrará con la hora actual.`,
      danger:  false,
      action:  () => this.executeCheckIn(event),
    });
  }

  private executeCheckIn(event: IBookingCheckInEvent): void {
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

    this.pendingConfirm.set({
      message: `${event.guestName}\n\n¿Registrar la salida? La reserva quedará marcada como completada.`,
      danger:  false,
      action:  () => this.executeCheckOut(event),
    });
  }

  private executeCheckOut(event: IBookingCheckInEvent): void {
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

  onConfirmModalConfirmed(): void {
    const action = this.pendingConfirm()?.action;
    this.pendingConfirm.set(null);
    action?.();
  }

  onConfirmModalCancelled(): void {
    this.pendingConfirm.set(null);
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
      lines.push(`Sexo: ${traveler.sexo ?? 'No indicado'}`);
      lines.push(`Parentesco: ${traveler.parentesco ?? 'No indicado'}`);
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
