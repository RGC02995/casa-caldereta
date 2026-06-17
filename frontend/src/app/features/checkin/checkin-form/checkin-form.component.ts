import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CheckinService } from '../../../core/services/checkin.service';
import { ICheckinFormInfo, ITravelerInput, TipoDocumento, Sexo } from '../../../core/models/checkin.model';

type FormState = 'loading' | 'invalid' | 'already-submitted' | 'form' | 'success';

interface TravelerFormData {
  tipoDocumento:   TipoDocumento;
  numDocumento:    string;
  numSoporte:      string;
  apellido1:       string;
  apellido2:       string;
  nombre:          string;
  sexo:            Sexo | '';
  fechaNacimiento: string;
  pais:            string;
  paisResidencia:  string;
}

function emptyTraveler(): TravelerFormData {
  return {
    tipoDocumento:   'DNI',
    numDocumento:    '',
    numSoporte:      '',
    apellido1:       '',
    apellido2:       '',
    nombre:          '',
    sexo:            '',
    fechaNacimiento: '',
    pais:            '',
    paisResidencia:  '',
  };
}

@Component({
  selector:    'checkin-form',
  standalone:  true,
  imports:     [],
  templateUrl: './checkin-form.component.html',
  styleUrl:    './checkin-form.component.scss',
})
export class CheckinFormComponent {
  private readonly checkinService = inject(CheckinService);
  private readonly destroyRef     = inject(DestroyRef);
  private readonly token: string  = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly TIPOS_DOCUMENTO: TipoDocumento[] = [
    'DNI', 'NIE', 'Pasaporte', 'Permiso de residencia', 'Otro',
  ];

  readonly state       = signal<FormState>('loading');
  readonly formInfo    = signal<ICheckinFormInfo | null>(null);
  readonly travelers   = signal<TravelerFormData[]>([emptyTraveler()]);
  readonly submitting  = signal(false);
  readonly submitError = signal('');

  readonly canAddTraveler = computed(() => {
    const info = this.formInfo();
    return !!info && this.travelers().length < info.guests;
  });

  readonly checkInDisplay = computed(() => {
    const info = this.formInfo();
    return info ? this.formatDate(info.checkIn) : '';
  });

  readonly checkOutDisplay = computed(() => {
    const info = this.formInfo();
    return info ? this.formatDate(info.checkOut) : '';
  });

  constructor() {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    this.checkinService.getForm(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.formInfo.set(response.data);
          this.state.set(response.data.alreadySubmitted ? 'already-submitted' : 'form');
        },
        error: () => this.state.set('invalid'),
      });
  }

  updateField(index: number, field: keyof TravelerFormData, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.travelers.update(list => {
      const updated = [...list];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  }

  addTraveler(): void {
    if (!this.canAddTraveler()) return;
    this.travelers.update(list => [...list, emptyTraveler()]);
  }

  removeTraveler(index: number): void {
    if (this.travelers().length <= 1) return;
    this.travelers.update(list => list.filter((_, i) => i !== index));
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.submitting()) return;

    const validationError = this.validateTravelers();
    if (validationError) {
      this.submitError.set(validationError);
      return;
    }

    const payload: ITravelerInput[] = this.travelers().map(t => {
      const input: ITravelerInput = {
        tipoDocumento:   t.tipoDocumento,
        numDocumento:    t.numDocumento.trim(),
        apellido1:       t.apellido1.trim(),
        nombre:          t.nombre.trim(),
        sexo:            t.sexo as Sexo,
        fechaNacimiento: t.fechaNacimiento,
        pais:            t.pais.trim(),
      };
      if (t.numSoporte.trim())     input.numSoporte    = t.numSoporte.trim();
      if (t.apellido2.trim())      input.apellido2     = t.apellido2.trim();
      if (t.paisResidencia.trim()) input.paisResidencia = t.paisResidencia.trim();
      return input;
    });

    this.submitting.set(true);
    this.submitError.set('');

    this.checkinService.submitForm(this.token, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.state.set('success');
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          if (err.status === 409) {
            this.state.set('already-submitted');
          } else {
            const message = (err.error as { message?: string })?.message;
            this.submitError.set(message ?? 'Error al enviar el formulario. Inténtalo de nuevo.');
          }
        },
      });
  }

  private validateTravelers(): string | null {
    const list = this.travelers();
    for (let i = 0; i < list.length; i++) {
      const t = list[i]!;
      if (!t.numDocumento.trim() || !t.apellido1.trim() || !t.nombre.trim()
          || !t.sexo || !t.fechaNacimiento || !t.pais.trim()) {
        return `Viajero ${i + 1}: completa todos los campos obligatorios.`;
      }
    }
    return null;
  }

  private formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr));
  }
}
