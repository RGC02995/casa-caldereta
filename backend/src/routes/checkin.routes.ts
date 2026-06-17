import { Router } from 'express';
import {
  getCheckinFormHandler,
  submitCheckinFormHandler,
  getTodayActivityHandler,
  sendPreArrivalEmailHandler,
  recordCheckInHandler,
  recordCheckOutHandler,
  getTravelersHandler,
  getCheckinSettingsHandler,
  updateCheckinSettingsHandler,
} from '../controllers/checkin.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { checkinFormRateLimiter } from '../middleware/rate-limit.middleware';

const checkinRouter = Router();

// Rutas literales ANTES que /:bookingId — evita que Express las interprete como params

// Admin — configuración horarios
checkinRouter.get('/settings',  requireAuth, getCheckinSettingsHandler);
checkinRouter.patch('/settings', requireAuth, updateCheckinSettingsHandler);

// Admin — actividad del día
checkinRouter.get('/today', requireAuth, getTodayActivityHandler);

// Público — formulario de viajeros (acceso por token seguro)
checkinRouter.get('/form/:token',  checkinFormRateLimiter, getCheckinFormHandler);
checkinRouter.post('/form/:token', checkinFormRateLimiter, submitCheckinFormHandler);

// Admin — enviar email pre-llegada con enlace al formulario
checkinRouter.post('/send-form/:bookingId', requireAuth, sendPreArrivalEmailHandler);

// Admin — registrar entrada / salida físicas
checkinRouter.patch('/:bookingId/check-in',  requireAuth, recordCheckInHandler);
checkinRouter.patch('/:bookingId/check-out', requireAuth, recordCheckOutHandler);

// Admin — ver datos de viajeros registrados
checkinRouter.get('/:bookingId/travelers', requireAuth, getTravelersHandler);

export default checkinRouter;
