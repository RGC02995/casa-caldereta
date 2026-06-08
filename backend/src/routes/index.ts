import { Router } from 'express';
import authRouter   from './auth.routes';
import bookingRouter from './booking.routes';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API operativa' });
});

apiRouter.use('/auth',     authRouter);
apiRouter.use('/bookings', bookingRouter);

export default apiRouter;
