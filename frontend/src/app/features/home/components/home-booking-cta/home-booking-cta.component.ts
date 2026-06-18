import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'home-booking-cta',
  imports: [RouterLink, TranslatePipe, ScrollRevealDirective],
  templateUrl: './home-booking-cta.component.html',
  styleUrl: './home-booking-cta.component.scss',
})
export class HomeBookingCtaComponent {}
