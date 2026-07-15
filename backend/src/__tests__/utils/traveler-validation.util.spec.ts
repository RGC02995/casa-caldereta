import { describe, it, expect } from 'vitest';
import { isValidDni, isValidNie, isValidPhone, isValidEmail } from '../../utils/traveler-validation.util';

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

describe('isValidNie', () => {
  it('acepta un NIE válido con prefijo X', () => {
    expect(isValidNie('X1234567L')).toBe(true);
  });

  it('acepta un NIE válido con prefijo Y', () => {
    expect(isValidNie('Y1234567X')).toBe(true);
  });

  it('acepta un NIE válido con prefijo Z', () => {
    expect(isValidNie('Z1234567R')).toBe(true);
  });

  it('acepta un NIE válido en minúscula', () => {
    expect(isValidNie('x1234567l')).toBe(true);
  });

  it('acepta un NIE válido escrito con guion', () => {
    expect(isValidNie('X-1234567-L')).toBe(true);
  });

  it('rechaza una letra de control incorrecta', () => {
    expect(isValidNie('X1234567A')).toBe(false);
  });

  it('rechaza un DNI (empieza por dígito, no es un NIE)', () => {
    expect(isValidNie('12345678Z')).toBe(false);
  });

  it('rechaza un prefijo de letra no válido', () => {
    expect(isValidNie('A1234567L')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('acepta un email válido', () => {
    expect(isValidEmail('huesped@example.com')).toBe(true);
  });

  it('rechaza texto que no es un email', () => {
    expect(isValidEmail('no soy un email')).toBe(false);
  });

  it('rechaza un email sin dominio', () => {
    expect(isValidEmail('huesped@')).toBe(false);
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
