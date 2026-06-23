import { Router } from 'express';
import authRouter            from './auth.routes';
import bookingRouter         from './booking.routes';
import photoRouter           from './photo.routes';
import routeRouter           from './route.routes';
import pricingRuleRouter     from './pricing-rule.routes';
import blockedPeriodRouter   from './blocked-period.routes';
import reviewRouter          from './review.routes';
import checkinRouter         from './checkin.routes';
import pricingSettingsRouter from './pricing-settings.routes';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API operativa' });
});

apiRouter.use('/auth',             authRouter);
apiRouter.use('/bookings',         bookingRouter);
apiRouter.use('/photos',           photoRouter);
apiRouter.use('/routes',           routeRouter);
apiRouter.use('/pricing-rules',    pricingRuleRouter);
apiRouter.use('/blocked-periods',  blockedPeriodRouter);
apiRouter.use('/reviews',          reviewRouter);
apiRouter.use('/checkin',          checkinRouter);
apiRouter.use('/pricing-settings', pricingSettingsRouter);

export default apiRouter;
