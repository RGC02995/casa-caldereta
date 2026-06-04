import { Component, computed, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
})
export class LoadingSpinnerComponent {
  readonly size    = input<SpinnerSize>('md');
  readonly message = input('Cargando...');

  readonly cssClasses = computed(() =>
    ['spinner', `spinner--${this.size()}`].join(' ')
  );
}
