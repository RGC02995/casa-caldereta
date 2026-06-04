import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent implements OnDestroy {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  readonly isOpen = input.required<boolean>();
  readonly title  = input('');
  readonly size   = input<ModalSize>('md');

  // ── Output ─────────────────────────────────────────────────────────────────
  readonly closed = output<void>();

  // ── Referencia al elemento <dialog> nativo ─────────────────────────────────
  private readonly dialogElem =
    viewChild<ElementRef<HTMLDialogElement>>('dialogElem');

  // ── CSS classes ─────────────────────────────────────────────────────────────
  readonly cssClasses = computed(() =>
    ['modal', `modal--${this.size()}`].join(' ')
  );

  constructor() {
    // Sincroniza el estado Angular (isOpen signal) con la API nativa del <dialog>
    effect(() => {
      const dialogNativeElem = this.dialogElem()?.nativeElement;
      if (!dialogNativeElem) return;

      if (this.isOpen()) {
        // showModal() abre como modal: activa top layer, focus trap y backdrop nativo
        if (!dialogNativeElem.open) dialogNativeElem.showModal();
      } else {
        if (dialogNativeElem.open) dialogNativeElem.close();
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  // Con <dialog> nativo: clic en el backdrop === event.target es el propio <dialog>
  onBackdropClick(event: MouseEvent): void {
    const dialogNativeElem = this.dialogElem()?.nativeElement;
    if ((event.target as HTMLElement) === dialogNativeElem) {
      this.close();
    }
  }

  // El evento 'cancel' se dispara al pulsar Escape — prevenimos el cierre nativo
  // para que sea el padre quien decida si actualiza isOpen
  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  ngOnDestroy(): void {
    const dialogNativeElem = this.dialogElem()?.nativeElement;
    if (dialogNativeElem?.open) dialogNativeElem.close();
  }
}
