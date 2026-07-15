const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const DNI_REGEX           = /^(\d{8})([A-Za-z])$/;

function controlLetterFor(digits: number): string {
  return DNI_CONTROL_LETTERS[digits % 23]!;
}

// Valida formato + letra de control (detecta typos reales, no solo el patrón).
// Admite el DNI escrito con espacios o guion (p.ej. "12345678-Z" o "12345678 Z"),
// formatos habituales en el propio documento pero que antes se rechazaban.
export function isValidDni(value: string): boolean {
  const normalized = value.trim().replace(/[\s-]/g, '');
  const match = DNI_REGEX.exec(normalized);
  if (!match) return false;

  const [, digits, letter] = match;
  return letter!.toUpperCase() === controlLetterFor(Number(digits));
}

const NIE_REGEX  = /^([XYZxyz])(\d{7})([A-Za-z])$/;
const NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

// Mismo algoritmo de letra de control que el DNI: la letra inicial X/Y/Z se sustituye
// por su dígito equivalente (0/1/2) y se antepone a los 7 dígitos para formar el número
// de 8 cifras sobre el que se calcula la letra, exactamente igual que en un DNI.
export function isValidNie(value: string): boolean {
  const normalized = value.trim().replace(/[\s-]/g, '');
  const match = NIE_REGEX.exec(normalized);
  if (!match) return false;

  const [, prefixLetter, digits, letter] = match;
  const fullNumber = NIE_PREFIX[prefixLetter!.toUpperCase()]! + digits;
  return letter!.toUpperCase() === controlLetterFor(Number(fullNumber));
}

const PHONE_REGEX = /^\+?\d{9,15}$/;

// Formato internacional permisivo (E.164-ish) — huéspedes de cualquier nacionalidad
export function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(cleaned);
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
