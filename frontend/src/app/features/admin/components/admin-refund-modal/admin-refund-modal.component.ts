import { Component, effect, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

export interface IRefundConfirmedEvent {
  readonly amount: number;
}

@Component({
  selector:    'admin-refund-modal',
  imports:     [ModalComponent],
  templateUrl: './admin-refund-modal.component.html',
  styleUrl:    './admin-refund-modal.component.scss',
})
export class AdminRefundModalComponent {
  readonly isOpen        = input.required<boolean>();
  readonly guestName     = input('');
  readonly maxRefundable = input(0);

  readonly confirmed = output<IRefundConfirmedEvent>();
  readonly cancelled = output<void>();

  readonly step             = signal<'amount' | 'confirm'>('amount');
  readonly amountInputValue = signal('');
  readonly validationError  = signal('');

  readonly confirmedAmount = signal(0);

  private amount = 0;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.step.set('amount');
        this.amountInputValue.set(this.maxRefundable().toFixed(2));
        this.validationError.set('');
      }
    });
  }

  onAmountInput(event: Event): void {
    this.amountInputValue.set((event.target as HTMLInputElement).value);
  }

  onContinue(): void {
    const parsed = Number(this.amountInputValue().trim().replace(',', '.'));
    const max    = this.maxRefundable();

    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
      this.validationError.set(`Importe no válido. Debe estar entre 0,01 € y ${max.toFixed(2)} €.`);
      return;
    }

    this.validationError.set('');
    this.amount = parsed;
    this.confirmedAmount.set(parsed);
    this.step.set('confirm');
  }

  onBack(): void {
    this.step.set('amount');
  }

  onConfirm(): void {
    this.confirmed.emit({ amount: this.amount });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
