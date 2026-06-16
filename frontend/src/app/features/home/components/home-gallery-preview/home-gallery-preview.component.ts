import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { IPhoto } from '../../../../core/models/photo.model';

@Component({
  selector: 'home-gallery-preview',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './home-gallery-preview.component.html',
  styleUrl: './home-gallery-preview.component.scss',
})
export class HomeGalleryPreviewComponent {
  readonly photos = input<IPhoto[]>([]);
}
