import 'dotenv/config';
import type { StringValue } from 'ms';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable de entorno requerida no encontrada: ${name}`);
  return value;
}

function validateDuration(raw: string, name: string): StringValue {
  if (!/^\d+(ms|s|m|h|d)$/.test(raw)) {
    throw new Error(`${name} debe ser una duración válida (ej. '15m', '7d'). Valor: '${raw}'`);
  }
  return raw as StringValue;
}

const nodeEnv = process.env['NODE_ENV'] ?? 'development';

export const env = {
  nodeEnv,
  port:                parseInt(process.env['PORT'] ?? '3000', 10),
  apiVersion:          process.env['API_VERSION'] ?? 'v1',
  mongodbUri:          requireEnv('MONGODB_URI'),
  jwtSecret:           requireEnv('JWT_SECRET'),
  jwtExpiresIn:        validateDuration(process.env['JWT_EXPIRES_IN'] ?? '15m', 'JWT_EXPIRES_IN'),
  jwtRefreshSecret:    requireEnv('JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: validateDuration(process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d', 'JWT_REFRESH_EXPIRES_IN'),
  adminEmail:          requireEnv('ADMIN_EMAIL'),
  adminPasswordHash:   requireEnv('ADMIN_PASSWORD_HASH'),
  cloudinaryCloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey:    requireEnv('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: requireEnv('CLOUDINARY_API_SECRET'),
  corsOriginDev:       process.env['CORS_ORIGIN_DEV'] ?? 'http://localhost:4200',
  corsOriginProd:      nodeEnv === 'production' ? requireEnv('CORS_ORIGIN_PROD') : (process.env['CORS_ORIGIN_PROD'] ?? ''),
  rateLimitWindowMs:   parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
  rateLimitMax:        parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '100', 10),
  // Email (Resend) — opcionales: si no están configuradas, los emails se omiten sin error
  resendApiKey:        process.env['RESEND_API_KEY'] ?? '',
  resendFromEmail:     process.env['RESEND_FROM_EMAIL'] ?? 'onboarding@resend.dev',
  ownerEmail:          process.env['OWNER_EMAIL'] ?? process.env['ADMIN_EMAIL'] ?? '',
  resendOverrideTo:    process.env['RESEND_OVERRIDE_TO'] ?? '',
  // Stripe
  stripeSecretKey:     requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
  // URL del frontend — necesaria para success_url y cancel_url de Stripe Checkout
  frontendUrl:         requireEnv('FRONTEND_URL'),
  // URL del backend — necesaria para construir el enlace del comprobante de pago en emails
  // En Railway: añadir BACKEND_URL=https://backend-production-777f.up.railway.app
  backendUrl:          process.env['BACKEND_URL'] ?? `http://localhost:${process.env['PORT'] ?? '3000'}`,
} as const;
