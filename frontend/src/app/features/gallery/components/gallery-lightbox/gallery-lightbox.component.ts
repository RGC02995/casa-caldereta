import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GalleryPhoto } from '../../gallery.types';

@Component({
  selector: 'gallery-lightbox',
  imports: [],
  templateUrl: './gallery-lightbox.component.html',
  styleUrl: './gallery-lightbox.component.scss',
})
export class GalleryLightboxComponent implements OnDestroy {
  readonly isOpen     = input.required<boolean>();
  readonly photos     = input.required<GalleryPhoto[]>();
  readonly startIndex = input(0);

  readonly closed = output<void>();

  private readonly dialogElem = viewChild<ElementRef<HTMLDialogElement>>('dialogElem');

  readonly currentIndex = signal(0);

  readonly currentPhoto = computed((): GalleryPhoto | null => {
    const photosArr = this.photos();
    return photosArr[this.currentIndex()] ?? null;
  });

  readonly isFirst = computed(() => this.currentIndex() === 0);
  readonly isLast  = computed(() => this.currentIndex() === this.photos().length - 1);

  readonly counter = computed(() => `${this.currentIndex() + 1} / ${this.photos().length}`);

  constructor() {
    effect(() => {
      const dialogNativeElem = this.dialogElem()?.nativeElement;
      if (!dialogNativeElem) return;

      if (this.isOpen()) {
        if (!dialogNativeElem.open) dialogNativeElem.showModal();
      } else {
        if (dialogNativeElem.open) dialogNativeElem.close();
      }
    });

    // Sincroniza el índice inicial cada vez que se abre el lightbox
    effect(() => {
      if (this.isOpen()) {
        this.currentIndex.set(this.startIndex());
      }
    }, { allowSignalWrites: true });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    if (event.key === 'ArrowLeft')  this.goPrevious();
    if (event.key === 'ArrowRight') this.goNext();
  }

  goNext(): void {
    if (!this.isLast()) this.currentIndex.update(index => index + 1);
  }

  goPrevious(): void {
    if (!this.isFirst()) this.currentIndex.update(index => index - 1);
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    const dialogNativeElem = this.dialogElem()?.nativeElement;
    if ((event.target as HTMLElement) === dialogNativeElem) {
      this.close();
    }
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  ngOnDestroy(): void {
    const dialogNativeElem = this.dialogElem()?.nativeElement;
    if (dialogNativeElem?.open) dialogNativeElem.close();
  }
}
