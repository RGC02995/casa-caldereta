import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CheckinService } from '../../../core/services/checkin.service';
import { ICheckinFormInfo, ITravelerInput, TipoDocumento, Sexo } from '../../../core/models/checkin.model';
import { EMAIL_REGEX } from '../../../shared/validators/email.validator';

type FormState = 'loading' | 'invalid' | 'already-submitted' | 'form' | 'success';

interface TravelerFormData {
  tipoDocumento:       TipoDocumento;
  numDocumento:        string;
  numSoporte:          string;
  apellido1:           string;
  apellido2:           string;
  nombre:              string;
  sexo:                Sexo | '';
  fechaNacimiento:     string;
  parentesco:          string;
  pais:                string;
  paisResidencia:      string;
  ciudadResidencia:    string;
  direccionResidencia: string;
  codigoPostal:        string;
  contacto:            string;
}

function emptyTraveler(): TravelerFormData {
  return {
    tipoDocumento:       'DNI',
    numDocumento:        '',
    numSoporte:          '',
    apellido1:           '',
    apellido2:           '',
    nombre:              '',
    sexo:                '',
    fechaNacimiento:     '',
    parentesco:          '',
    pais:                '',
    paisResidencia:      '',
    ciudadResidencia:    '',
    direccionResidencia: '',
    codigoPostal:        '',
    contacto:            '',
  };
}

@Component({
  selector:    'checkin-form',
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

  readonly PARENTESCOS: string[] = [
    'Titular',
    'Pareja / Cónyuge',
    'Padre / Madre',
    'Hijo / Hija',
    'Abuelo / Abuela',
    'Nieto / Nieta',
    'Hermano / Hermana',
    'Otro familiar',
    'Acompañante',
  ];

  readonly today: string = new Date().toISOString().split('T')[0]!;

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

    const payload: ITravelerInput[] = this.travelers().map(travelerData => ({
      tipoDocumento:       travelerData.tipoDocumento,
      numDocumento:        travelerData.numDocumento.trim(),
      numSoporte:          travelerData.numSoporte.trim(),
      apellido1:           travelerData.apellido1.trim(),
      apellido2:           travelerData.apellido2.trim(),
      nombre:              travelerData.nombre.trim(),
      sexo:                travelerData.sexo ? (travelerData.sexo as Sexo) : undefined,
      fechaNacimiento:     travelerData.fechaNacimiento,
      parentesco:          travelerData.parentesco.trim() || undefined,
      pais:                travelerData.pais.trim(),
      paisResidencia:      travelerData.paisResidencia.trim(),
      ciudadResidencia:    travelerData.ciudadResidencia.trim(),
      direccionResidencia: travelerData.direccionResidencia.trim(),
      codigoPostal:        travelerData.codigoPostal.trim(),
      contacto:            travelerData.contacto.trim(),
    }));

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
    const travelerList = this.travelers();
    for (let i = 0; i < travelerList.length; i++) {
      const traveler = travelerList[i]!;
      const prefix   = `Viajero ${i + 1}`;
      if (!traveler.apellido1.trim())           return `${prefix}: el campo "Primer apellido" es obligatorio.`;
      if (!traveler.apellido2.trim())           return `${prefix}: el campo "Segundo apellido" es obligatorio.`;
      if (!traveler.nombre.trim())              return `${prefix}: el campo "Nombre" es obligatorio.`;
      if (!traveler.fechaNacimiento)            return `${prefix}: el campo "Fecha de nacimiento" es obligatorio.`;
      if (new Date(traveler.fechaNacimiento) > new Date()) {
        return `${prefix}: la fecha de nacimiento no puede ser una fecha futura.`;
      }
      if (!traveler.tipoDocumento)              return `${prefix}: el campo "Tipo de documento" es obligatorio.`;
      if (!traveler.numDocumento.trim())        return `${prefix}: el campo "Nº de documento" es obligatorio.`;
      if (traveler.tipoDocumento === 'DNI' && !this.isValidDni(traveler.numDocumento)) {
        return `${prefix}: el formato del DNI no es válido.`;
      }
      if (!traveler.numSoporte.trim())          return `${prefix}: el campo "Nº de soporte" es obligatorio.`;
      if (!traveler.pais.trim())                return `${prefix}: el campo "Nacionalidad" es obligatorio.`;
      if (!traveler.paisResidencia.trim())      return `${prefix}: el campo "País de residencia" es obligatorio.`;
      if (!traveler.ciudadResidencia.trim())    return `${prefix}: el campo "Ciudad de residencia" es obligatorio.`;
      if (!traveler.direccionResidencia.trim()) return `${prefix}: el campo "Dirección de residencia" es obligatorio.`;
      if (!traveler.codigoPostal.trim())        return `${prefix}: el campo "Código postal" es obligatorio.`;
      if (!traveler.contacto.trim())            return `${prefix}: el campo "Teléfono o correo" es obligatorio.`;
      if (!this.isValidContact(traveler.contacto)) {
        return `${prefix}: el teléfono o correo electrónico no tiene un formato válido.`;
      }
    }
    return null;
  }

  private readonly DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
  private readonly DNI_REGEX           = /^(\d{8})([A-Za-z])$/;

  private isValidDni(value: string): boolean {
    const normalized = value.trim().replace(/[\s-]/g, '');
    const match = this.DNI_REGEX.exec(normalized);
    if (!match) return false;

    const [, digits, letter] = match;
    const expectedLetter = this.DNI_CONTROL_LETTERS[Number(digits) % 23];
    return letter!.toUpperCase() === expectedLetter;
  }

  private readonly PHONE_REGEX = /^\+?\d{9,15}$/;

  private isValidPhone(value: string): boolean {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return this.PHONE_REGEX.test(cleaned);
  }

  private isValidContact(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.includes('@')) return EMAIL_REGEX.test(trimmed);
    return this.isValidPhone(trimmed);
  }

  private formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr));
  }
}
