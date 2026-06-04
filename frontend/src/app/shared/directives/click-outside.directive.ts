import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly hostElemRef = inject(ElementRef<HTMLElement>);

  readonly clickOutside = output<void>();

  // Escucha todos los clics del documento para detectar clics fuera del host
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const hostNativeElem = this.hostElemRef.nativeElement;
    if (!hostNativeElem.contains(event.target as Node)) {
      this.clickOutside.emit();
    }
  }
}
