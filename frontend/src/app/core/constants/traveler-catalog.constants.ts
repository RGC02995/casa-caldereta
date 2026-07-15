import { Sexo, TipoDocumento } from '../models/checkin.model';

export interface ICatalogEntry<T extends string = string> {
  readonly code:  T;
  readonly label: string;
}

// Apartado 8.5 del documento oficial "Instrucciones para el alta masiva de
// comunicaciones — Hospedajes" (Ministerio del Interior, v1.2.0).
export const TIPOS_DOCUMENTO: ReadonlyArray<ICatalogEntry<TipoDocumento>> = [
  { code: 'NIF',  label: 'DNI / NIF' },
  { code: 'NIE',  label: 'NIE' },
  { code: 'PAS',  label: 'Pasaporte' },
  { code: 'OTRO', label: 'Otro documento' },
];

// Apartado 8.4 del documento oficial.
export const SEXOS: ReadonlyArray<ICatalogEntry<Sexo>> = [
  { code: 'H', label: 'Hombre' },
  { code: 'M', label: 'Mujer' },
  { code: 'O', label: 'Otro' },
];

// Apartado 8.3 del documento oficial — relación de parentesco (15 códigos).
export const PARENTESCOS: readonly ICatalogEntry[] = [
  { code: 'CY', label: 'Cónyuge' },
  { code: 'PM', label: 'Padre o madre' },
  { code: 'HJ', label: 'Hijo/a' },
  { code: 'HR', label: 'Hermano/a' },
  { code: 'AB', label: 'Abuelo/a' },
  { code: 'NI', label: 'Nieto/a' },
  { code: 'TI', label: 'Tío/a' },
  { code: 'SB', label: 'Sobrino/a' },
  { code: 'SG', label: 'Suegro/a' },
  { code: 'CD', label: 'Cuñado/a' },
  { code: 'YN', label: 'Yerno o nuera' },
  { code: 'BA', label: 'Bisabuelo/a' },
  { code: 'BN', label: 'Bisnieto/a' },
  { code: 'TU', label: 'Tutor/a' },
  { code: 'OT', label: 'Otro' },
];

function labelFor(catalog: readonly ICatalogEntry[], code: string | undefined): string | undefined {
  if (!code) return undefined;
  return catalog.find(entry => entry.code === code)?.label ?? code;
}

export function tipoDocumentoLabel(code: string | undefined): string | undefined {
  return labelFor(TIPOS_DOCUMENTO, code);
}

export function sexoLabel(code: string | undefined): string | undefined {
  return labelFor(SEXOS, code);
}

export function parentescoLabel(code: string | undefined): string | undefined {
  return labelFor(PARENTESCOS, code);
}
