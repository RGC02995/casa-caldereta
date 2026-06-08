import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    return;
  }

  try {
    const tokens = await authService.login({ email, password });

    if (!tokens) {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
      return;
    }

    res.status(200).json({ success: true, data: tokens, message: 'Login correcto' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export function refreshHandler(req: Request, res: Response): void {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token requerido' });
    return;
  }

  try {
    const tokens = authService.refresh(refreshToken);

    if (!tokens) {
      res.status(401).json({ success: false, message: 'Refresh token inválido o expirado' });
      return;
    }

    res.status(200).json({ success: true, data: tokens, message: 'Tokens renovados' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}

export function logoutHandler(req: Request, res: Response): void {
  const { refreshToken } = req.body as { refreshToken?: string };

  try {
    if (refreshToken) authService.logout(refreshToken);
    res.status(200).json({ success: true, data: null, message: 'Sesión cerrada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
