import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { PricingRuleService } from '../../../../core/services/pricing-rule.service';
import { BlockedPeriodService } from '../../../../core/services/blocked-period.service';
import { IPricingRule } from '../../../../core/models/pricing-rule.model';
import { IBlockedPeriod } from '../../../../core/models/blocked-period.model';

@Component({
  selector:    'admin-calendar-panel',
  standalone:  true,
  imports:     [DatePipe, CurrencyPipe],
  templateUrl: './admin-calendar-panel.component.html',
  styleUrl:    './admin-calendar-panel.component.scss',
})
export class AdminCalendarPanelComponent {
  private readonly pricingService = inject(PricingRuleService);
  private readonly blockedService = inject(BlockedPeriodService);

  readonly pricingRules   = input<IPricingRule[]>([]);
  readonly blockedPeriods = input<IBlockedPeriod[]>([]);

  readonly pricingChanged = output<void>();
  readonly blockedChanged = output<void>();

  readonly activePanel       = signal<'pricing' | 'blocked'>('pricing');
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

  readonly blockStart  = signal('');
  readonly blockEnd    = signal('');
  readonly blockReason = signal('');

  readonly priceFormValid = computed(() =>
    this.priceLabel().trim().length > 0 &&
    this.priceStart().length > 0 &&
    this.priceEnd().length > 0 &&
    this.pricePerNight() !== null &&
    (this.pricePerNight() ?? 0) >= 1 &&
    this.priceMinNights() >= 1
  );

  readonly blockFormValid = computed(() =>
    this.blockStart().length > 0 &&
    this.blockEnd().length > 0
  );

  startEditRule(rule: IPricingRule): void {
    this.editingRuleId.set(rule.id);
    this.priceLabel.set(rule.label);
    this.priceStart.set(rule.startDate.slice(0, 10));
    this.priceEnd.set(rule.endDate.slice(0, 10));
    this.pricePerNight.set(rule.pricePerNight);
    this.priceMinNights.set(rule.minNights);
    this.pricingError.set('');
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
      endDate:       this.priceEnd(),
      pricePerNight: price,
      minNights:     this.priceMinNights(),
    };

    this.isSubmittingPrice.set(true);
    this.pricingError.set('');

    const editingId = this.editingRuleId();
    const request$  = editingId
      ? this.pricingService.update(editingId, data)
      : this.pricingService.create(data);

    request$.subscribe({
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
    if (!confirm(`${rule.label}\n\n¿Eliminar esta regla de precio? Esta acción no se puede deshacer.`)) return;

    this.processingId.set(rule.id);
    this.pricingError.set('');

    this.pricingService.delete(rule.id).subscribe({
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
    }).subscribe({
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
    if (!confirm(`${startFormatted} – ${endFormatted}\n\n¿Eliminar este bloqueo? Las fechas volverán a estar disponibles.`)) return;

    this.processingId.set(period.id);
    this.blockedError.set('');

    this.blockedService.delete(period.id).subscribe({
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

  private resetPriceForm(): void {
    this.priceLabel.set('');
    this.priceStart.set('');
    this.priceEnd.set('');
    this.pricePerNight.set(null);
    this.priceMinNights.set(1);
  }

  private resetBlockForm(): void {
    this.blockStart.set('');
    this.blockEnd.set('');
    this.blockReason.set('');
  }
}
