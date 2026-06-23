import { Component, DestroyRef, inject, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { PricingSettingsService } from '../../../../core/services/pricing-settings.service';
import { IPricingSettings } from '../../../../core/models/pricing-settings.model';

@Component({
  selector:    'admin-pricing-base',
  imports:     [],
  templateUrl: './admin-pricing-base.component.html',
  styleUrl:    './admin-pricing-base.component.scss',
})
export class AdminPricingBaseComponent implements OnInit {
  private readonly settingsService = inject(PricingSettingsService);
  private readonly destroyRef      = inject(DestroyRef);

  readonly saved = output<void>();

  readonly isLoading    = signal(true);
  readonly isSubmitting = signal(false);
  readonly loadError    = signal('');
  readonly saveError    = signal('');
  readonly saveSuccess  = signal(false);

  readonly monThuPrice    = signal(100);
  readonly friPrice       = signal(150);
  readonly satPrice       = signal(180);
  readonly extraPerPerson = signal(20);

  ngOnInit(): void {
    this.settingsService.get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data) this.applySettings(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la configuración de precios.');
          this.isLoading.set(false);
        },
      });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    const data: IPricingSettings = {
      monThuPrice:    this.monThuPrice(),
      friPrice:       this.friPrice(),
      satPrice:       this.satPrice(),
      extraPerPerson: this.extraPerPerson(),
    };

    this.settingsService.update(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.data) this.applySettings(res.data);
          this.isSubmitting.set(false);
          this.saveSuccess.set(true);
          this.saved.emit();
          setTimeout(() => this.saveSuccess.set(false), 3000);
        },
        error: (err: HttpErrorResponse) => {
          const message = err.error?.message as string | undefined;
          this.saveError.set(message ?? 'No se pudo guardar. Inténtalo de nuevo.');
          this.isSubmitting.set(false);
        },
      });
  }

  private applySettings(s: IPricingSettings): void {
    this.monThuPrice.set(s.monThuPrice);
    this.friPrice.set(s.friPrice);
    this.satPrice.set(s.satPrice);
    this.extraPerPerson.set(s.extraPerPerson);
  }
}
