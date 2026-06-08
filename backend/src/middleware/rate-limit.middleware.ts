import rateLimit from 'express-rate-limit';
import { env } from '../config/environment';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const globalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  message: { success: false, message: 'Demasiadas peticiones. Inténtalo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
