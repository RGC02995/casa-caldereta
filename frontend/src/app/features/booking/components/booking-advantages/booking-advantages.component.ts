import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'booking-advantages',
  imports: [TranslatePipe, ScrollRevealDirective],
  templateUrl: './booking-advantages.component.html',
  styleUrl: './booking-advantages.component.scss',
})
export class BookingAdvantagesComponent {}
