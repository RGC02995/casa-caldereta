import { Component, computed, input, output } from '@angular/core';

export type ImageCardRatio = 'square' | 'landscape' | 'portrait';

@Component({
  selector: 'image-card',
  imports: [],
  templateUrl: './image-card.component.html',
  styleUrl: './image-card.component.scss',
})
export class ImageCardComponent {
  readonly src         = input.required<string>();
  readonly alt         = input.required<string>();
  readonly title       = input('');
  readonly description = input('');
  readonly aspectRatio = input<ImageCardRatio>('landscape');

  readonly cardClicked = output<void>();

  readonly cssClasses = computed(() =>
    ['image-card', `image-card--${this.aspectRatio()}`].join(' ')
  );

  readonly hasOverlay = computed(() =>
    this.title().length > 0 || this.description().length > 0
  );
}
