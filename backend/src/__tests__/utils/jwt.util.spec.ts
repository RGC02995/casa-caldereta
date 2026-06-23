import { describe, it, expect } from 'vitest';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.util';

const PAYLOAD = { role: 'admin' as const };

// Token ya expirado: exp = ahora - 60 segundos
function makeExpiredAccessToken(): string {
  return jwt.sign(
    { role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 },
    'test-jwt-secret-for-testing-only-32chars',
  );
}

function makeExpiredRefreshToken(): string {
  return jwt.sign(
    { role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 },
    'test-refresh-secret-for-testing-32chars',
  );
}

describe('signAccessToken', () => {
  it('devuelve un string con formato JWT (3 partes separadas por ".")', () => {
    const token = signAccessToken(PAYLOAD);
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('token válido → devuelve payload con role: admin', () => {
    const token = signAccessToken(PAYLOAD);
    const result = verifyAccessToken(token);
    expect(result.role).toBe('admin');
  });

  it('token manipulado → lanza JsonWebTokenError', () => {
    const token = signAccessToken(PAYLOAD);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow(JsonWebTokenError);
  });

  it('token expirado → lanza TokenExpiredError', () => {
    expect(() => verifyAccessToken(makeExpiredAccessToken())).toThrow(TokenExpiredError);
  });

  it('token firmado con otro secret → lanza JsonWebTokenError', () => {
    const foreignToken = jwt.sign(PAYLOAD, 'otro-secret-completamente-diferente');
    expect(() => verifyAccessToken(foreignToken)).toThrow(JsonWebTokenError);
  });
});

describe('signRefreshToken', () => {
  it('devuelve un string con formato JWT (3 partes separadas por ".")', () => {
    const token = signRefreshToken(PAYLOAD);
    expect(token.split('.')).toHaveLength(3);
  });

  it('access token y refresh token son distintos para el mismo payload', () => {
    const access  = signAccessToken(PAYLOAD);
    const refresh = signRefreshToken(PAYLOAD);
    expect(access).not.toBe(refresh);
  });
});

describe('verifyRefreshToken', () => {
  it('token válido → devuelve payload con role: admin', () => {
    const token = signRefreshToken(PAYLOAD);
    const result = verifyRefreshToken(token);
    expect(result.role).toBe('admin');
  });

  it('token manipulado → lanza JsonWebTokenError', () => {
    const token = signRefreshToken(PAYLOAD);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyRefreshToken(tampered)).toThrow(JsonWebTokenError);
  });

  it('token expirado → lanza TokenExpiredError', () => {
    expect(() => verifyRefreshToken(makeExpiredRefreshToken())).toThrow(TokenExpiredError);
  });

  it('access token no es válido como refresh token', () => {
    const accessToken = signAccessToken(PAYLOAD);
    expect(() => verifyRefreshToken(accessToken)).toThrow(JsonWebTokenError);
  });
});
