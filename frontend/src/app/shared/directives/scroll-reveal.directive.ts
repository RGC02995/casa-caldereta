import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[scrollReveal]',
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly delay      = input<number>(0);
  readonly revealFrom = input<'bottom' | 'left' | 'right' | 'scale' | 'wipe-right' | 'wipe-left' | 'focus'>('bottom');

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const element = this.elementRef.nativeElement as HTMLElement;
    element.style.setProperty('--reveal-delay', `${this.delay()}ms`);
    element.classList.add('scroll-reveal', `scroll-reveal--${this.revealFrom()}`);

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' },
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
