import crypto from 'crypto';
import { env } from '../config/environment';
import { verifyPassword } from '../utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { ILoginRequest, IAuthTokenPair } from '../types/auth.types';
import { RefreshTokenModel } from '../models/refresh-token.model';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function tokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}

function hashUserAgent(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent.slice(0, 512)).digest('hex');
}

export async function login(credentials: ILoginRequest, userAgent: string): Promise<IAuthTokenPair | null> {
  const emailMatch    = credentials.email === env.adminEmail;
  const passwordMatch = await verifyPassword(credentials.password, env.adminPasswordHash);

  if (!emailMatch || !passwordMatch) return null;

  // Sesión única: invalida cualquier sesión anterior antes de crear la nueva
  await RefreshTokenModel.deleteMany({ sub: env.adminEmail });

  const payload      = { sub: env.adminEmail, role: 'admin' };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await RefreshTokenModel.create({
    token:         refreshToken,
    sub:           env.adminEmail,
    expiresAt:     tokenExpiry(),
    userAgentHash: hashUserAgent(userAgent),
  });

  return { accessToken, refreshToken };
}

export async function refresh(refreshToken: string, userAgent: string): Promise<IAuthTokenPair | null> {
  const stored = await RefreshTokenModel.findOne({ token: refreshToken });

  if (!stored) {
    // El token no está en BD pero podría ser un JWT válido = ya fue rotado = posible robo
    try {
      const payload = verifyRefreshToken(refreshToken);
      // Revocar todas las sesiones activas del usuario como medida de seguridad
      await RefreshTokenModel.deleteMany({ sub: payload.sub });
    } catch {
      // JWT inválido: firma incorrecta, sin acción adicional
    }
    return null;
  }

  // Verificación de User-Agent: rechazar si el token se usa desde otro navegador/dispositivo
  if (stored.userAgentHash !== hashUserAgent(userAgent)) {
    await stored.deleteOne();
    return null;
  }

  try {
    const payload         = verifyRefreshToken(refreshToken);
    const newAccessToken  = signAccessToken({ sub: payload.sub, role: payload.role });
    const newRefreshToken = signRefreshToken({ sub: payload.sub, role: payload.role });

    // Rotación: eliminar el anterior, crear el nuevo
    await stored.deleteOne();
    await RefreshTokenModel.create({
      token:         newRefreshToken,
      sub:           payload.sub,
      expiresAt:     tokenExpiry(),
      userAgentHash: hashUserAgent(userAgent),
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch {
    await stored.deleteOne();
    return null;
  }
}

export async function logout(refreshToken: string): Promise<void> {
  await RefreshTokenModel.deleteOne({ token: refreshToken });
}
