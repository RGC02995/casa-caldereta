import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { env } from './config/environment';
import { connectDatabase } from './config/database';
import { globalRateLimiter } from './middleware/rate-limit.middleware';
import apiRouter from './routes/index';
import { stripeWebhookHandler } from './controllers/stripe-webhook.controller';
import { sitemapHandler } from './controllers/sitemap.controller';
import { icalExportHandler } from './controllers/ical-export.controller';
import { checkinService } from './services/checkin.service';
import { icalSyncService } from './services/ical-sync.service';
import { bookingService } from './services/booking.service';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = env.nodeEnv === 'production'
  ? env.corsOriginProd.split(',').map(o => o.trim())
  : [env.corsOriginDev];

app.use(cors({
  origin:      allowedOrigins,
  credentials: true,
}));

if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// El webhook de Stripe DEBE montarse antes de express.json().
// Stripe verifica la firma usando el body RAW (Buffer). Si express.json() procesa
// el body primero, la firma falla y cualquiera podría forjar eventos de pago.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(globalRateLimiter);

app.get('/sitemap.xml', sitemapHandler);
app.get('/calendar.ics', icalExportHandler);
app.use(`/api/${env.apiVersion}`, apiRouter);

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // 09:00 — emails pre-llegada (formulario viajeros, 3 días antes del check-in)
  cron.schedule('0 9 * * *', () => {
    checkinService.sendScheduledPreArrivalEmails().catch((err: unknown) => {
      console.error('[cron] Error en job pre-llegada:', err instanceof Error ? err.message : String(err));
    });
  });

  // 10:00 — recordatorio segundo pago (7 días antes del check-in)
  cron.schedule('0 10 * * *', () => {
    checkinService.sendScheduledRemainingPaymentEmails().catch((err: unknown) => {
      console.error('[cron] Error en job pago restante:', err instanceof Error ? err.message : String(err));
    });
  });

  // Cada hora — check-in automático a la hora configurada + email de bienvenida
  cron.schedule('0 * * * *', () => {
    checkinService.runAutoCheckin().catch((err: unknown) => {
      console.error('[cron] Error en job auto-checkin:', err instanceof Error ? err.message : String(err));
    });
  });

  // Cada 15 minutos — sincronización de calendarios externos (Airbnb/Booking.com)
  cron.schedule('*/15 * * * *', () => {
    icalSyncService.syncAll().catch((err: unknown) => {
      console.error('[cron] Error en sincronización iCal:', err instanceof Error ? err.message : String(err));
    });
  });

  // Cada minuto — borra reservas pending_payment cuyo bloqueo de 10 min ya expiró
  // (libera la fecha para otros huéspedes y cierra la sesión de Stripe abandonada)
  cron.schedule('* * * * *', () => {
    bookingService.cleanupExpiredPendingPayments().catch((err: unknown) => {
      console.error('[cron] Error en limpieza de pending_payment:', err instanceof Error ? err.message : String(err));
    });
  });

  app.listen(env.port, () => {
    console.log(`✔ Servidor arrancado en puerto ${env.port} [${env.nodeEnv}]`);
  });
}

bootstrap();
