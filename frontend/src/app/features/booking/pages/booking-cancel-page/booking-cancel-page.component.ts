import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector:    'booking-cancel-page',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './booking-cancel-page.component.html',
  styleUrl:    './booking-cancel-page.component.scss',
})
export class BookingCancelPageComponent {}
