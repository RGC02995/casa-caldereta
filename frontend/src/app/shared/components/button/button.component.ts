import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize    = 'sm' | 'md' | 'lg';
export type ButtonType    = 'button' | 'submit' | 'reset';

@Component({
  selector: 'btn',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant   = input<ButtonVariant>('primary');
  readonly size      = input<ButtonSize>('md');
  readonly type      = input<ButtonType>('button');
  readonly disabled  = input(false);
  readonly loading   = input(false);
  readonly fullWidth = input(false);
  readonly ariaLabel = input('');

  readonly clicked = output<void>();

  readonly cssClasses = computed(() =>
    [
      'btn',
      `btn--${this.variant()}`,
      `btn--${this.size()}`,
      this.loading()   ? 'btn--loading'    : null,
      this.fullWidth() ? 'btn--full-width' : null,
      this.disabled()  ? 'btn--disabled'   : null,
    ]
    .filter(Boolean)
    .join(' ')
  );

  readonly isDisabled = computed(() => this.disabled() || this.loading());

  onClick(): void {
    if (!this.isDisabled()) {
      this.clicked.emit();
    }
  }
}
