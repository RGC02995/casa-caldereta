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

// Endpoints públicos consultados frecuentemente (disponibilidad, reseñas)
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Demasiadas peticiones. Inténtalo en un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Crear sesión Stripe tiene coste real — límite estricto por IP
export const checkoutRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Demasiados intentos de pago. Espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Previene spam de reseñas desde la misma IP
export const reviewSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Has enviado demasiadas reseñas. Inténtalo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
