import { Component, input, output } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { IBooking, BookingStatus } from '../../../../core/models/booking.model';

type StatusFilter = 'all' | BookingStatus;

export interface IBookingStatusChangeEvent {
  readonly bookingId: string;
  readonly newStatus: BookingStatus;
  readonly guestName: string;
}

export interface IBookingDeleteEvent {
  readonly bookingId: string;
  readonly guestName: string;
}

export interface IBookingRefundEvent {
  readonly bookingId: string;
  readonly guestName: string;
}

export interface IBookingCheckInEvent {
  readonly bookingId: string;
  readonly guestName: string;
}

export interface IBookingRemainingPaymentEvent {
  readonly bookingId: string;
  readonly guestName: string;
}

interface IStatusTransition {
  readonly label:  string;
  readonly status: BookingStatus;
}

const STATUS_TRANSITIONS: Record<BookingStatus, IStatusTransition[]> = {
  pending_payment: [],
  pending:         [],
  confirmed:       [{ label: 'Completar', status: 'completed' }, { label: 'Cancelar', status: 'cancelled' }],
  cancelled:       [],
  completed:       [],
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pago pendiente',
  pending:         'Pendiente',
  confirmed:       'Confirmada',
  cancelled:       'Cancelada',
  completed:       'Completada',
};

@Component({
  selector:    'admin-booking-list',
  imports:     [DatePipe, CurrencyPipe],
  templateUrl: './admin-booking-list.component.html',
  styleUrl:    './admin-booking-list.component.scss',
})
export class AdminBookingListComponent {
  readonly bookings     = input<IBooking[]>([]);
  readonly processingId = input<string | null>(null);
  readonly actionError  = input('');
  readonly activeFilter = input<StatusFilter>('all');

  readonly filterChanged        = output<StatusFilter>();
  readonly statusChanged        = output<IBookingStatusChangeEvent>();
  readonly deleteRequested      = output<IBookingDeleteEvent>();
  readonly refundRequested      = output<IBookingRefundEvent>();
  readonly sendFormRequested    = output<IBookingCheckInEvent>();
  readonly checkInRequested     = output<IBookingCheckInEvent>();
  readonly checkOutRequested    = output<IBookingCheckInEvent>();
  readonly viewTravelersRequested = output<string>();
  readonly remainingPaymentRequested = output<IBookingRemainingPaymentEvent>();

  readonly filters: { label: string; value: StatusFilter }[] = [
    { label: 'Todas',          value: 'all'             },
    { label: 'Pago pendiente', value: 'pending_payment' },
    { label: 'Confirmadas',    value: 'confirmed'       },
    { label: 'Canceladas',     value: 'cancelled'       },
    { label: 'Completadas',    value: 'completed'       },
  ];

  statusLabel(status: string): string {
    return STATUS_LABELS[status as BookingStatus] ?? status;
  }

  getTransitions(status: BookingStatus): IStatusTransition[] {
    return STATUS_TRANSITIONS[status];
  }

  onStatusChange(bookingId: string, newStatus: BookingStatus, guestName: string): void {
    this.statusChanged.emit({ bookingId, newStatus, guestName });
  }

  onDeleteRequested(bookingId: string, guestName: string): void {
    this.deleteRequested.emit({ bookingId, guestName });
  }

  onRefundRequested(bookingId: string, guestName: string): void {
    this.refundRequested.emit({ bookingId, guestName });
  }

  onSendFormRequested(bookingId: string, guestName: string): void {
    this.sendFormRequested.emit({ bookingId, guestName });
  }

  onCheckInRequested(bookingId: string, guestName: string): void {
    this.checkInRequested.emit({ bookingId, guestName });
  }

  onCheckOutRequested(bookingId: string, guestName: string): void {
    this.checkOutRequested.emit({ bookingId, guestName });
  }

  onRemainingPaymentRequested(bookingId: string, guestName: string): void {
    this.remainingPaymentRequested.emit({ bookingId, guestName });
  }

  depositPaid(booking: IBooking): boolean {
    return booking.status !== 'pending_payment';
  }

  remainingPaymentState(booking: IBooking): 'paid' | 'sent' | 'pending' {
    if (booking.remainingPaidAt) return 'paid';
    if (booking.remainingPaymentEmailSentAt) return 'sent';
    return 'pending';
  }
}
