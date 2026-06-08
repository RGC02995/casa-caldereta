import { env } from '../config/environment';
import { verifyPassword } from '../utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { ILoginRequest, IAuthTokenPair } from '../types/auth.types';

const activeRefreshTokens = new Set<string>();

export async function login(credentials: ILoginRequest): Promise<IAuthTokenPair | null> {
  const emailMatch    = credentials.email === env.adminEmail;
  const passwordMatch = await verifyPassword(credentials.password, env.adminPasswordHash);

  if (!emailMatch || !passwordMatch) return null;

  const payload      = { sub: env.adminEmail, role: 'admin' };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  activeRefreshTokens.add(refreshToken);
  return { accessToken, refreshToken };
}

export function refresh(refreshToken: string): IAuthTokenPair | null {
  if (!activeRefreshTokens.has(refreshToken)) return null;

  try {
    const payload         = verifyRefreshToken(refreshToken);
    const newAccessToken  = signAccessToken({ sub: payload.sub, role: payload.role });
    const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role });

    activeRefreshTokens.delete(refreshToken);
    activeRefreshTokens.add(newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch {
    activeRefreshTokens.delete(refreshToken);
    return null;
  }
}

export function logout(refreshToken: string): void {
  activeRefreshTokens.delete(refreshToken);
}
