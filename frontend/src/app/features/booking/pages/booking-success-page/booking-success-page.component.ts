import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingDraftService } from '../../../../core/services/booking-draft.service';

@Component({
  selector:    'booking-success-page',
  imports:     [RouterLink],
  templateUrl: './booking-success-page.component.html',
  styleUrl:    './booking-success-page.component.scss',
})
export class BookingSuccessPageComponent {
  constructor() {
    // Pago confirmado: el borrador ya no sirve (datos + sesión de Stripe) → se limpia.
    inject(BookingDraftService).clear();
  }
}
