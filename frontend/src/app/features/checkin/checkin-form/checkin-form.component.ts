import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { differenceInYears } from 'date-fns';
import { CheckinService } from '../../../core/services/checkin.service';
import { GeoReferenceService } from '../../../core/services/geo-reference.service';
import { ICheckinFormInfo, ITravelerInput, TipoDocumento, Sexo } from '../../../core/models/checkin.model';
import { TIPOS_DOCUMENTO, PARENTESCOS, SEXOS } from '../../../core/constants/traveler-catalog.constants';
import { EMAIL_REGEX } from '../../../shared/validators/email.validator';
import { SearchableSelectComponent, ISelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

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
  nombreMunicipio:     string;
  codigoMunicipio:     string;
  direccionResidencia: string;
  codigoPostal:        string;
  telefono:            string;
  correo:              string;
}

function emptyTraveler(): TravelerFormData {
  return {
    tipoDocumento:       'NIF',
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
    nombreMunicipio:     '',
    codigoMunicipio:     '',
    direccionResidencia: '',
    codigoPostal:        '',
    telefono:            '',
    correo:              '',
  };
}

@Component({
  selector:    'checkin-form',
  imports:     [SearchableSelectComponent],
  templateUrl: './checkin-form.component.html',
  styleUrl:    './checkin-form.component.scss',
})
export class CheckinFormComponent {
  private readonly checkinService     = inject(CheckinService);
  private readonly geoReferenceService = inject(GeoReferenceService);
  private readonly destroyRef         = inject(DestroyRef);
  private readonly token: string      = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  readonly TIPOS_DOCUMENTO = TIPOS_DOCUMENTO;
  readonly PARENTESCOS     = PARENTESCOS;
  readonly SEXOS           = SEXOS;

  readonly today: string = new Date().toISOString().split('T')[0]!;

  readonly state       = signal<FormState>('loading');
  readonly formInfo    = signal<ICheckinFormInfo | null>(null);
  readonly travelers   = signal<TravelerFormData[]>([emptyTraveler()]);
  readonly submitting  = signal(false);
  readonly submitError = signal('');

  private readonly countries          = signal<ISelectOption[]>([]);
  private readonly municipios         = signal<ISelectOption[]>([]);
  private municipiosRequested = false;

  readonly countryOptions   = computed(() => this.countries());
  readonly municipioOptions = computed(() => this.municipios());

  readonly canAddTraveler = computed(() => {
    const info = this.formInfo();
    return !!info && this.travelers().length < info.guests;
  });

  readonly hasMinor = computed(() => this.travelers().some(t => this.isMinor(t.fechaNacimiento)));

  readonly checkInDisplay = computed(() => {
    const info = this.formInfo();
    return info ? this.formatDate(info.checkIn) : '';
  });

  readonly checkOutDisplay = computed(() => {
    const info = this.formInfo();
    return info ? this.formatDate(info.checkOut) : '';
  });

  constructor() {
    this.geoReferenceService.getPaises()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.countries.set(list.map(p => ({ value: p.code, label: p.name }))));

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

  isMinor(fechaNacimiento: string): boolean {
    if (!fechaNacimiento) return false;
    return differenceInYears(new Date(), new Date(fechaNacimiento)) < 18;
  }

  updateField(index: number, field: keyof TravelerFormData, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.updateFieldValue(index, field, value);
  }

  updateFieldValue(index: number, field: keyof TravelerFormData, value: string): void {
    if (field === 'paisResidencia' && value === 'ESP') {
      this.ensureMunicipiosLoaded();
    }
    this.travelers.update(list => {
      const updated = [...list];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  }

  private ensureMunicipiosLoaded(): void {
    if (this.municipiosRequested) return;
    this.municipiosRequested = true;
    this.geoReferenceService.getMunicipios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.municipios.set(
        list.map(m => ({ value: m.codigo, label: m.nombre, sublabel: m.provincia })),
      ));
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
      apellido2:           travelerData.apellido2.trim() || undefined,
      nombre:              travelerData.nombre.trim(),
      sexo:                travelerData.sexo ? (travelerData.sexo as Sexo) : undefined,
      fechaNacimiento:     travelerData.fechaNacimiento,
      parentesco:          travelerData.parentesco.trim() || undefined,
      pais:                travelerData.pais.trim(),
      paisResidencia:      travelerData.paisResidencia.trim(),
      nombreMunicipio:     travelerData.nombreMunicipio.trim() || undefined,
      codigoMunicipio:     travelerData.codigoMunicipio.trim() || undefined,
      direccionResidencia: travelerData.direccionResidencia.trim(),
      codigoPostal:        travelerData.codigoPostal.trim(),
      telefono:            travelerData.telefono.trim() || undefined,
      correo:              travelerData.correo.trim() || undefined,
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
      if (traveler.tipoDocumento === 'NIF' && !traveler.apellido2.trim()) {
        return `${prefix}: el campo "Segundo apellido" es obligatorio para DNI/NIF.`;
      }
      if (!traveler.nombre.trim())              return `${prefix}: el campo "Nombre" es obligatorio.`;
      if (!traveler.fechaNacimiento)            return `${prefix}: el campo "Fecha de nacimiento" es obligatorio.`;
      if (new Date(traveler.fechaNacimiento) > new Date()) {
        return `${prefix}: la fecha de nacimiento no puede ser una fecha futura.`;
      }
      if (!traveler.tipoDocumento)              return `${prefix}: el campo "Tipo de documento" es obligatorio.`;
      if (!traveler.numDocumento.trim())        return `${prefix}: el campo "Nº de documento" es obligatorio.`;
      if (traveler.tipoDocumento === 'NIF' && !this.isValidDni(traveler.numDocumento)) {
        return `${prefix}: el formato del DNI/NIF no es válido.`;
      }
      if (traveler.tipoDocumento === 'NIE' && !this.isValidNie(traveler.numDocumento)) {
        return `${prefix}: el formato del NIE no es válido.`;
      }
      if (!traveler.numSoporte.trim())          return `${prefix}: el campo "Nº de soporte" es obligatorio.`;
      if (!traveler.pais.trim())                return `${prefix}: el campo "Nacionalidad" es obligatorio.`;
      if (!traveler.paisResidencia.trim())      return `${prefix}: el campo "País de residencia" es obligatorio.`;
      if (traveler.paisResidencia === 'ESP') {
        if (!traveler.codigoMunicipio.trim())   return `${prefix}: el campo "Municipio de residencia" es obligatorio.`;
      } else if (!traveler.nombreMunicipio.trim()) {
        return `${prefix}: el campo "Municipio de residencia" es obligatorio.`;
      }
      if (!traveler.direccionResidencia.trim()) return `${prefix}: el campo "Dirección de residencia" es obligatorio.`;
      if (!traveler.codigoPostal.trim())        return `${prefix}: el campo "Código postal" es obligatorio.`;
      if (!traveler.telefono.trim() && !traveler.correo.trim()) {
        return `${prefix}: indica al menos un teléfono o un correo electrónico.`;
      }
      if (traveler.telefono.trim() && !this.isValidPhone(traveler.telefono)) {
        return `${prefix}: el teléfono no tiene un formato válido.`;
      }
      if (traveler.correo.trim() && !EMAIL_REGEX.test(traveler.correo.trim())) {
        return `${prefix}: el correo electrónico no tiene un formato válido.`;
      }
    }
    return null;
  }

  // Mismo algoritmo que backend/src/utils/traveler-validation.util.ts — duplicado
  // deliberadamente para dar feedback inmediato en el cliente (no hay paquete
  // compartido entre frontend/backend en este monorepo).
  private readonly DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
  private readonly DNI_REGEX           = /^(\d{8})([A-Za-z])$/;
  private readonly NIE_REGEX           = /^([XYZxyz])(\d{7})([A-Za-z])$/;
  private readonly NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

  private controlLetterFor(digits: number): string {
    return this.DNI_CONTROL_LETTERS[digits % 23]!;
  }

  private isValidDni(value: string): boolean {
    const normalized = value.trim().replace(/[\s-]/g, '');
    const match = this.DNI_REGEX.exec(normalized);
    if (!match) return false;

    const [, digits, letter] = match;
    return letter!.toUpperCase() === this.controlLetterFor(Number(digits));
  }

  private isValidNie(value: string): boolean {
    const normalized = value.trim().replace(/[\s-]/g, '');
    const match = this.NIE_REGEX.exec(normalized);
    if (!match) return false;

    const [, prefixLetter, digits, letter] = match;
    const fullNumber = this.NIE_PREFIX[prefixLetter!.toUpperCase()]! + digits;
    return letter!.toUpperCase() === this.controlLetterFor(Number(fullNumber));
  }

  private readonly PHONE_REGEX = /^\+?\d{9,15}$/;

  private isValidPhone(value: string): boolean {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return this.PHONE_REGEX.test(cleaned);
  }

  private formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr));
  }
}
