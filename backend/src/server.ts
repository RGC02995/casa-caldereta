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
import { checkinService } from './services/checkin.service';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

app.use(cors({
  origin:      env.nodeEnv === 'production' ? env.corsOriginProd : env.corsOriginDev,
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
app.use(`/api/${env.apiVersion}`, apiRouter);

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // Cada día a las 09:00 — envía emails de pre-llegada a reservas confirmadas en 3 días
  cron.schedule('0 9 * * *', () => {
    checkinService.sendScheduledPreArrivalEmails().catch((err: unknown) => {
      console.error('[cron] Error en job pre-llegada:', err instanceof Error ? err.message : String(err));
    });
  });

  app.listen(env.port, () => {
    console.log(`✔ Servidor arrancado en puerto ${env.port} [${env.nodeEnv}]`);
  });
}

bootstrap();
