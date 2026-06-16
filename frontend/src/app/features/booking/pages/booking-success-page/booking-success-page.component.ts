import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector:    'booking-success-page',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './booking-success-page.component.html',
  styleUrl:    './booking-success-page.component.scss',
})
export class BookingSuccessPageComponent {}
