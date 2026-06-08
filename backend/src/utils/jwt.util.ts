import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/environment';
import { ITokenPayload } from '../types/auth.types';

export function signAccessToken(payload: ITokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as StringValue });
}

export function signRefreshToken(payload: ITokenPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn as StringValue });
}

export function verifyAccessToken(token: string): ITokenPayload {
  return jwt.verify(token, env.jwtSecret) as ITokenPayload;
}

export function verifyRefreshToken(token: string): ITokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as ITokenPayload;
}
