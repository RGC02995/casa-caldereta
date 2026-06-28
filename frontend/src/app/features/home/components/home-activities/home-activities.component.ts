import { Component } from '@angular/core';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'home-activities',
  imports: [ScrollRevealDirective],
  templateUrl: './home-activities.component.html',
  styleUrl: './home-activities.component.scss',
})
export class HomeActivitiesComponent {}
