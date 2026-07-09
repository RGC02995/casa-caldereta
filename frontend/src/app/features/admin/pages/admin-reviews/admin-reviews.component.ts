import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ReviewService } from '../../../../core/services/review.service';
import { IReview } from '../../../../core/models/review.model';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

type ReviewFilter = 'all' | 'pending' | 'approved';

interface IPendingConfirm {
  readonly message: string;
  readonly action:  () => void;
}

@Component({
  selector: 'admin-reviews',
  imports: [DatePipe, ConfirmModalComponent],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.scss',
})
export class AdminReviewsComponent {
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef    = inject(DestroyRef);

  readonly pendingConfirm = signal<IPendingConfirm | null>(null);

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

    this.reviewService.approve(reviewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

    this.pendingConfirm.set({
      message: `${author}\n\n¿Eliminar esta reseña? Esta acción no se puede deshacer.`,
      action:  () => this.executeDelete(reviewId),
    });
  }

  private executeDelete(reviewId: string): void {
    this.processingId.set(reviewId);
    this.actionError.set('');

    this.reviewService.delete(reviewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  onConfirmModalConfirmed(): void {
    const action = this.pendingConfirm()?.action;
    this.pendingConfirm.set(null);
    action?.();
  }

  onConfirmModalCancelled(): void {
    this.pendingConfirm.set(null);
  }
}
