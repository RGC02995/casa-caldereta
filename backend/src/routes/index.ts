import { Router } from 'express';
import authRouter    from './auth.routes';
import bookingRouter from './booking.routes';
import photoRouter   from './photo.routes';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API operativa' });
});

apiRouter.use('/auth',     authRouter);
apiRouter.use('/bookings', bookingRouter);
apiRouter.use('/photos',   photoRouter);

export default apiRouter;
