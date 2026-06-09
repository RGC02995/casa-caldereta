import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { env } from '../config/environment';
import { AuthenticatedRequest } from '../middleware/require-auth.middleware';

const COOKIE_NAME = 'cc_rt';

function extractUserAgent(req: Request): string {
  return (req.headers['user-agent'] ?? 'unknown').slice(0, 512);
}

const cookieOptions = {
  httpOnly: true,
  secure:   env.nodeEnv === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     `/api/${env.apiVersion}/auth`,
};

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    return;
  }

  try {
    const tokens = await authService.login({ email, password }, extractUserAgent(req));

    if (!tokens) {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
      return;
    }

    res.cookie(COOKIE_NAME, tokens.refreshToken, cookieOptions);
    res.status(200).json({ success: true, data: { accessToken: tokens.accessToken }, message: 'Login correcto' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = (req.cookies as Record<string, string | undefined>)[COOKIE_NAME];

  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'Sesión no válida' });
    return;
  }

  try {
    const tokens = await authService.refresh(refreshToken, extractUserAgent(req));

    if (!tokens) {
      res.clearCookie(COOKIE_NAME, { path: cookieOptions.path });
      res.status(401).json({ success: false, message: 'Sesión expirada, inicia sesión de nuevo' });
      return;
    }

    res.cookie(COOKIE_NAME, tokens.refreshToken, cookieOptions);
    res.status(200).json({ success: true, data: { accessToken: tokens.accessToken }, message: 'Tokens renovados' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = (req.cookies as Record<string, string | undefined>)[COOKIE_NAME];

  try {
    if (refreshToken) await authService.logout(refreshToken);
    res.clearCookie(COOKIE_NAME, { path: cookieOptions.path });
    res.status(200).json({ success: true, data: null, message: 'Sesión cerrada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export function meHandler(req: Request, res: Response): void {
  const user = (req as AuthenticatedRequest).user;
  res.status(200).json({ success: true, data: user });
}
