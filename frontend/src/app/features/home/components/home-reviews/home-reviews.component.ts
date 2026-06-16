import { Component, inject, input, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { ReviewService } from '../../../../core/services/review.service';
import { IReview, ICreateReview } from '../../../../core/models/review.model';

@Component({
  selector: 'home-reviews',
  standalone: true,
  imports: [DatePipe, ScrollRevealDirective],
  templateUrl: './home-reviews.component.html',
  styleUrl: './home-reviews.component.scss',
})
export class HomeReviewsComponent {
  readonly reviews = input<IReview[]>([]);

  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef    = inject(DestroyRef);

  readonly reviewFormVisible = signal(false);
  readonly reviewFormSending = signal(false);
  readonly reviewFormSuccess = signal(false);
  readonly reviewFormError   = signal('');

  readonly reviewAuthor   = signal('');
  readonly reviewLocation = signal('');
  readonly reviewRating   = signal(5);
  readonly reviewText     = signal('');

  readonly ratingStars = [1, 2, 3, 4, 5] as const;

  setRating(value: number): void {
    this.reviewRating.set(value);
  }

  toggleReviewForm(): void {
    this.reviewFormVisible.update(visible => !visible);
    this.reviewFormSuccess.set(false);
    this.reviewFormError.set('');
  }

  submitReview(event: Event): void {
    event.preventDefault();

    const author   = this.reviewAuthor().trim();
    const location = this.reviewLocation().trim();
    const rating   = this.reviewRating();
    const text     = this.reviewText().trim();

    if (!author || !location || !text || text.length < 10) {
      this.reviewFormError.set('Por favor completa todos los campos (mínimo 10 caracteres en la reseña).');
      return;
    }

    const data: ICreateReview = { author, location, rating, text };

    this.reviewFormSending.set(true);
    this.reviewFormError.set('');

    this.reviewService.submit(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.reviewFormSending.set(false);
        this.reviewFormSuccess.set(true);
        this.reviewAuthor.set('');
        this.reviewLocation.set('');
        this.reviewRating.set(5);
        this.reviewText.set('');
      },
      error: () => {
        this.reviewFormSending.set(false);
        this.reviewFormError.set('No se pudo enviar la reseña. Inténtalo de nuevo más tarde.');
      },
    });
  }
}
