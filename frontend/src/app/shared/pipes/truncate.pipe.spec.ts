import { describe, it, expect } from 'vitest';
import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();

  it('texto corto (< límite) → sin cambios', () => {
    expect(pipe.transform('Hola', 10)).toBe('Hola');
  });

  it('texto exactamente igual al límite → sin truncar', () => {
    expect(pipe.transform('1234567890', 10)).toBe('1234567890');
  });

  it('texto = límite + 1 → truncado con trail por defecto "..."', () => {
    expect(pipe.transform('12345678901', 10)).toBe('1234567890...');
  });

  it('texto largo → truncado al límite + trail', () => {
    const long = 'a'.repeat(200);
    const result = pipe.transform(long, 100);
    expect(result).toBe('a'.repeat(100) + '...');
  });

  it('null → ""', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('undefined → ""', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('trail personalizado → se aplica el trail correcto', () => {
    expect(pipe.transform('12345678901', 10, ' [...]')).toBe('1234567890 [...]');
  });

  it('trimEnd elimina espacios finales antes del trail', () => {
    expect(pipe.transform('hola mundo  ', 10, '...')).toBe('hola mundo...');
  });
});
