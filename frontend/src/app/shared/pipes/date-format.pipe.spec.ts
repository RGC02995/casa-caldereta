import { describe, it, expect } from 'vitest';
import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  const pipe = new DateFormatPipe();
  // Fecha fija: 2 de junio de 2025 (lunes)
  const DATE_OBJ  = new Date(2025, 5, 2);
  const TIMESTAMP = DATE_OBJ.getTime();

  it('Date object → formato dd/MM/yyyy por defecto', () => {
    expect(pipe.transform(DATE_OBJ)).toBe('02/06/2025');
  });

  it('ISO string → mismo resultado que Date object', () => {
    expect(pipe.transform('2025-06-02')).toBe('02/06/2025');
  });

  it('timestamp number → mismo resultado', () => {
    expect(pipe.transform(TIMESTAMP)).toBe('02/06/2025');
  });

  it('null → ""', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('undefined → ""', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('string inválido → ""', () => {
    expect(pipe.transform('no-es-una-fecha')).toBe('');
  });

  it('formato personalizado "yyyy" → solo el año', () => {
    expect(pipe.transform(DATE_OBJ, 'yyyy')).toBe('2025');
  });

  it("formato 'MMMM' con locale español → nombre del mes en español", () => {
    expect(pipe.transform(DATE_OBJ, 'MMMM')).toBe('junio');
  });
});
