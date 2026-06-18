import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'booking-hero',
  imports: [TranslatePipe],
  templateUrl: './booking-hero.component.html',
  styleUrl: './booking-hero.component.scss',
})
export class BookingHeroComponent {}
