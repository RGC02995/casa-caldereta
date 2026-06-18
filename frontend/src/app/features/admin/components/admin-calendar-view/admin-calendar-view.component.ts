import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { IBooking } from '../../../../core/models/booking.model';

export interface IAdminCalendarDay {
  readonly day:           number;
  readonly dateStr:       string;
  readonly isBlocked:     boolean;
  readonly blockedPeriod: IBlockedPeriod | null;
  readonly booking:       IBooking | null;
  readonly price:         number | null;
  readonly isToday:       boolean;
  readonly isPast:        boolean;
}

@Component({
  selector:    'admin-calendar-view',
  imports:     [CurrencyPipe],
  templateUrl: './admin-calendar-view.component.html',
  styleUrl:    './admin-calendar-view.component.scss',
})
export class AdminCalendarViewComponent {
  readonly calendarCells  = input<(IAdminCalendarDay | null)[]>([]);
  readonly viewMonthLabel = input('');

  readonly prevMonth = output<void>();
  readonly nextMonth = output<void>();

  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
}
