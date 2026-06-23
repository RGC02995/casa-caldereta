import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../utils/password.util';

describe('hashPassword', () => {
  it('devuelve un string con formato bcrypt ($2a$ o $2b$)', async () => {
    const hash = await hashPassword('miContraseña123');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('el hash es diferente del texto plano', async () => {
    const hash = await hashPassword('miContraseña123');
    expect(hash).not.toBe('miContraseña123');
  });

  it('dos llamadas con la misma contraseña producen hashes distintos (salt aleatorio)', async () => {
    const hash1 = await hashPassword('misma');
    const hash2 = await hashPassword('misma');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('contraseña correcta → true', async () => {
    const hash = await hashPassword('secreto');
    expect(await verifyPassword('secreto', hash)).toBe(true);
  });

  it('contraseña incorrecta → false', async () => {
    const hash = await hashPassword('secreto');
    expect(await verifyPassword('otro', hash)).toBe(false);
  });

  it('hash de otra contraseña → false', async () => {
    const hashA = await hashPassword('contraseñaA');
    expect(await verifyPassword('contraseñaB', hashA)).toBe(false);
  });
});
