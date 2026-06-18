import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IPhoto } from '../../../../core/models/photo.model';

@Component({
  selector: 'home-hero',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  readonly heroPhoto = input<IPhoto | null>(null);
}
