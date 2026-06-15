import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ReviewService } from '../../../../core/services/review.service';
import { IReview } from '../../../../core/models/review.model';

type ReviewFilter = 'all' | 'pending' | 'approved';

@Component({
  selector: 'admin-reviews',
  imports: [DatePipe],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.scss',
})
export class AdminReviewsComponent {
  private readonly reviewService = inject(ReviewService);

  readonly loadError    = signal('');
  readonly actionError  = signal('');
  readonly activeFilter = signal<ReviewFilter>('all');
  readonly processingId = signal<string | null>(null);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly allReviews = toSignal(
    this.refresh$.pipe(
      switchMap(() => this.reviewService.getAll().pipe(
        map(response => response.data),
        catchError(() => {
          this.loadError.set('No se pudieron cargar las reseñas.');
          return of([] as IReview[]);
        }),
      )),
    ),
    { initialValue: [] as IReview[] },
  );

  readonly filteredReviews = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all')      return this.allReviews();
    if (filter === 'approved') return this.allReviews().filter(r => r.approved);
    return this.allReviews().filter(r => !r.approved);
  });

  readonly pendingCount = computed(() => this.allReviews().filter(r => !r.approved).length);

  readonly filters: { label: string; value: ReviewFilter }[] = [
    { label: 'Todas',     value: 'all'      },
    { label: 'Pendientes', value: 'pending' },
    { label: 'Publicadas', value: 'approved' },
  ];

  approveReview(reviewId: string): void {
    if (this.processingId()) return;
    this.processingId.set(reviewId);
    this.actionError.set('');

    this.reviewService.approve(reviewId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo aprobar la reseña. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  deleteReview(reviewId: string, author: string): void {
    if (this.processingId()) return;
    if (!confirm(`${author}\n\n¿Eliminar esta reseña? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(reviewId);
    this.actionError.set('');

    this.reviewService.delete(reviewId).subscribe({
      next: () => {
        this.processingId.set(null);
        this.refresh$.next();
      },
      error: () => {
        this.actionError.set('No se pudo eliminar la reseña. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }
}
