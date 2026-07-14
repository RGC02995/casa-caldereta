import { Component, computed, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';
import { AdminPricingBaseComponent } from '../admin-pricing-base/admin-pricing-base.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

interface IPendingConfirm {
  readonly message: string;
  readonly action:  () => void;
}

@Component({
  selector:    'admin-calendar-panel',
  imports:     [DatePipe, CurrencyPipe, AdminPricingBaseComponent, ConfirmModalComponent],
  templateUrl: './admin-calendar-panel.component.html',
  styleUrl:    './admin-calendar-panel.component.scss',
})
export class AdminCalendarPanelComponent {
  private readonly pricingService = inject(PricingRuleService);
  private readonly blockedService = inject(BlockedPeriodService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly pendingConfirm = signal<IPendingConfirm | null>(null);

  readonly pricingRules   = input<IPricingRule[]>([]);
  readonly blockedPeriods = input<IBlockedPeriod[]>([]);

  readonly pricingChanged = output<void>();
  readonly blockedChanged = output<void>();

  readonly activePanel       = signal<'pricing' | 'blocked' | 'base'>('pricing');
  readonly processingId      = signal<string | null>(null);
  readonly isSubmittingPrice = signal(false);
  readonly isSubmittingBlock = signal(false);
  readonly pricingError      = signal('');
  readonly blockedError      = signal('');

  readonly editingRuleId  = signal<string | null>(null);
  readonly priceLabel     = signal('');
  readonly priceStart     = signal('');
  readonly priceEnd       = signal('');
  readonly pricePerNight  = signal<number | null>(null);
  readonly priceMinNights = signal(1);
  readonly isSingleDay    = signal(false);

  readonly blockStart  = signal('');
  readonly blockEnd    = signal('');
  readonly blockReason = signal('');

  readonly priceFormValid = computed(() =>
    this.priceLabel().trim().length > 0 &&
    this.priceStart().length > 0 &&
    (this.isSingleDay() || this.priceEnd().length > 0) &&
    this.pricePerNight() !== null &&
    (this.pricePerNight() ?? 0) >= 1 &&
    this.priceMinNights() >= 1
  );

  readonly blockFormValid = computed(() =>
    this.blockStart().length > 0 &&
    this.blockEnd().length > 0
  );

  startEditRule(rule: IPricingRule): void {
    const start = rule.startDate.slice(0, 10);
    const end   = rule.endDate.slice(0, 10);

    this.editingRuleId.set(rule.id);
    this.priceLabel.set(rule.label);
    this.priceStart.set(start);
    this.priceEnd.set(end);
    this.pricePerNight.set(rule.pricePerNight);
    this.priceMinNights.set(rule.minNights);
    this.isSingleDay.set(start === end);
    this.pricingError.set('');
  }

  onSingleDayToggle(checked: boolean): void {
    this.isSingleDay.set(checked);
    if (checked) this.priceEnd.set(this.priceStart());
  }

  cancelEditRule(): void {
    this.editingRuleId.set(null);
    this.resetPriceForm();
  }

  onPricingSubmit(event: Event): void {
    event.preventDefault();
    if (!this.priceFormValid() || this.isSubmittingPrice()) return;

    const price = this.pricePerNight();
    if (price === null) return;

    const data = {
      label:         this.priceLabel().trim(),
      startDate:     this.priceStart(),
      endDate:       this.isSingleDay() ? this.priceStart() : this.priceEnd(),
      pricePerNight: price,
      minNights:     this.priceMinNights(),
    };

    this.isSubmittingPrice.set(true);
    this.pricingError.set('');

    const editingId = this.editingRuleId();
    const request$  = editingId
      ? this.pricingService.update(editingId, data)
      : this.pricingService.create(data);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.editingRuleId.set(null);
        this.resetPriceForm();
        this.isSubmittingPrice.set(false);
        this.pricingChanged.emit();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message as string | undefined;
        this.pricingError.set(message ?? 'No se pudo guardar la regla. Inténtalo de nuevo.');
        this.isSubmittingPrice.set(false);
      },
    });
  }

  deleteRule(rule: IPricingRule): void {
    if (this.processingId()) return;

    this.pendingConfirm.set({
      message: `${rule.label}\n\n¿Eliminar esta regla de precio? Esta acción no se puede deshacer.`,
      action:  () => this.executeDeleteRule(rule),
    });
  }

  private executeDeleteRule(rule: IPricingRule): void {
    this.processingId.set(rule.id);
    this.pricingError.set('');

    this.pricingService.delete(rule.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.pricingChanged.emit();
      },
      error: () => {
        this.pricingError.set('No se pudo eliminar la regla. Inténtalo de nuevo.');
        this.processingId.set(null);
      },
    });
  }

  onBlockedSubmit(event: Event): void {
    event.preventDefault();
    if (!this.blockFormValid() || this.isSubmittingBlock()) return;

    this.isSubmittingBlock.set(true);
    this.blockedError.set('');

    const reason = this.blockReason().trim();
    this.blockedService.create({
      startDate: this.blockStart(),
      endDate:   this.blockEnd(),
      ...(reason ? { reason } : {}),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.resetBlockForm();
        this.isSubmittingBlock.set(false);
        this.blockedChanged.emit();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.error?.message as string | undefined;
        this.blockedError.set(message ?? 'No se pudo crear el bloqueo. Inténtalo de nuevo.');
        this.isSubmittingBlock.set(false);
      },
    });
  }

  deleteBlockedPeriod(period: IBlockedPeriod): void {
    if (this.processingId()) return;
    const startFormatted = period.startDate.slice(0, 10).split('-').reverse().join('/');
    const endFormatted   = period.endDate.slice(0, 10).split('-').reverse().join('/');

    this.pendingConfirm.set({
      message: `${startFormatted} – ${endFormatted}\n\n¿Eliminar este bloqueo? Las fechas volverán a estar disponibles.`,
      action:  () => this.executeDeleteBlockedPeriod(period),
    });
  }

  private executeDeleteBlockedPeriod(period: IBlockedPeriod): void {
    this.processingId.set(period.id);
    this.blockedError.set('');

    this.blockedService.delete(period.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.processingId.set(null);
        this.blockedChanged.emit();
      },
      error: () => {
        this.blockedError.set('No se pudo eliminar el bloqueo. Inténtalo de nuevo.');
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

  private resetPriceForm(): void {
    this.priceLabel.set('');
    this.priceStart.set('');
    this.priceEnd.set('');
    this.pricePerNight.set(null);
    this.priceMinNights.set(1);
    this.isSingleDay.set(false);
  }

  private resetBlockForm(): void {
    this.blockStart.set('');
    this.blockEnd.set('');
    this.blockReason.set('');
  }
}
