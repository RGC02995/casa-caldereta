import { Component, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CheckinService } from '../../../../core/services/checkin.service';

@Component({
  selector:    'admin-checkin-settings',
  imports:     [],
  templateUrl: './admin-checkin-settings.component.html',
  styleUrl:    './admin-checkin-settings.component.scss',
})
export class AdminCheckinSettingsComponent {
  private readonly checkinService = inject(CheckinService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly checkInTime  = signal('16:00');
  readonly checkOutTime = signal('11:00');
  readonly loading      = signal(true);
  readonly saving       = signal(false);
  readonly loadError    = signal('');
  readonly saveError    = signal('');
  readonly saveSuccess  = signal(false);

  constructor() {
    this.checkinService.getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.checkInTime.set(response.data.checkInTime);
          this.checkOutTime.set(response.data.checkOutTime);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la configuración. Comprueba la conexión.');
          this.loading.set(false);
        },
      });
  }

  onCheckInTimeChange(event: Event): void {
    // slice(0,5) garantiza formato HH:MM aunque el navegador devuelva HH:MM:SS
    this.checkInTime.set((event.target as HTMLInputElement).value.slice(0, 5));
  }

  onCheckOutTimeChange(event: Event): void {
    this.checkOutTime.set((event.target as HTMLInputElement).value.slice(0, 5));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    this.checkinService.updateSettings(this.checkInTime(), this.checkOutTime())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saveSuccess.set(true);
        },
        error: () => {
          this.saveError.set('No se pudo guardar la configuración. Verifica el formato HH:MM.');
          this.saving.set(false);
        },
      });
  }
}
