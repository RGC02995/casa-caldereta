import { Component } from '@angular/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'home-map',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './home-map.component.html',
  styleUrl: './home-map.component.scss',
})
export class HomeMapComponent {}
