import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector:    'confirm-modal',
  imports:     [ModalComponent],
  templateUrl: './confirm-modal.component.html',
  styleUrl:    './confirm-modal.component.scss',
})
export class ConfirmModalComponent {
  readonly isOpen       = input.required<boolean>();
  readonly title        = input('Confirmar acción');
  readonly message      = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel  = input('Cancelar');
  readonly danger       = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
