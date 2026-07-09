const DNI_CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const DNI_REGEX           = /^(\d{8})([A-Za-z])$/;

// Valida formato + letra de control (detecta typos reales, no solo el patrón)
export function isValidDni(value: string): boolean {
  const match = DNI_REGEX.exec(value.trim());
  if (!match) return false;

  const [, digits, letter] = match;
  const expectedLetter = DNI_CONTROL_LETTERS[Number(digits) % 23];
  return letter!.toUpperCase() === expectedLetter;
}

const PHONE_REGEX = /^\+?\d{9,15}$/;

// Formato internacional permisivo (E.164-ish) — huéspedes de cualquier nacionalidad
export function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(cleaned);
}

const CONTACT_EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// El campo "contacto" admite teléfono o email en un único input de texto libre
export function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes('@')) return CONTACT_EMAIL_REGEX.test(trimmed);
  return isValidPhone(trimmed);
}
