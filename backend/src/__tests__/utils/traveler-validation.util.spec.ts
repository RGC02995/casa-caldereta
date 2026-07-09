import { describe, it, expect } from 'vitest';
import { isValidDni, isValidPhone, isValidContact } from '../../utils/traveler-validation.util';

describe('isValidDni', () => {
  it('acepta un DNI válido sin separadores', () => {
    expect(isValidDni('12345678Z')).toBe(true);
  });

  it('acepta un DNI válido en minúscula', () => {
    expect(isValidDni('12345678z')).toBe(true);
  });

  it('HALLAZGO corregido: acepta un DNI válido escrito con guion (formato habitual del propio documento)', () => {
    expect(isValidDni('12345678-Z')).toBe(true);
  });

  it('acepta un DNI válido escrito con espacio', () => {
    expect(isValidDni('12345678 Z')).toBe(true);
  });

  it('rechaza una letra de control incorrecta', () => {
    expect(isValidDni('12345678A')).toBe(false);
  });

  it('rechaza un NIE (empieza por letra, no es un DNI)', () => {
    expect(isValidDni('X1234567L')).toBe(false);
  });

  it('rechaza menos de 8 dígitos', () => {
    expect(isValidDni('1234567Z')).toBe(false);
  });
});

describe('isValidContact', () => {
  it('acepta un teléfono español', () => {
    expect(isValidContact('677876219')).toBe(true);
  });

  it('acepta un email', () => {
    expect(isValidContact('huesped@example.com')).toBe(true);
  });

  it('rechaza texto que no es ni teléfono ni email', () => {
    expect(isValidContact('no soy un contacto')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('acepta teléfono con espacios y guiones', () => {
    expect(isValidPhone('677 87 62 19')).toBe(true);
  });

  it('acepta prefijo internacional', () => {
    expect(isValidPhone('+34677876219')).toBe(true);
  });
});
