import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IPhoto } from '../../../../core/models/photo.model';
import { CloudinarySrcsetPipe } from '../../../../shared/pipes/cloudinary-srcset.pipe';

@Component({
  selector: 'home-hero',
  imports: [RouterLink, TranslatePipe, CloudinarySrcsetPipe],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  readonly heroPhoto = input<IPhoto | null>(null);
}
