import { Router } from 'express';
import {
  getAllBookingsHandler,
  getUpcomingBookingsHandler,
  getAvailabilityHandler,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
  createCheckoutSessionHandler,
  refundBookingHandler,
} from '../controllers/booking.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { publicRateLimiter, checkoutRateLimiter } from '../middleware/rate-limit.middleware';

const bookingRouter = Router();

bookingRouter.get('/',             requireAuth, getAllBookingsHandler);
bookingRouter.get('/upcoming',     requireAuth, getUpcomingBookingsHandler);
// /availability y /checkout declarados antes de /:id para que Express no los interprete como params
bookingRouter.get('/availability', publicRateLimiter,   getAvailabilityHandler);
bookingRouter.post('/checkout',    checkoutRateLimiter, createCheckoutSessionHandler);
bookingRouter.get('/:id',          requireAuth, getBookingByIdHandler);
// POST / ahora solo admin — para reservas manuales sin Stripe
bookingRouter.post('/',            requireAuth, createBookingHandler);
bookingRouter.patch('/:id/status', requireAuth, updateBookingStatusHandler);
bookingRouter.post('/:id/refund',  requireAuth, refundBookingHandler);
bookingRouter.delete('/:id',       requireAuth, deleteBookingHandler);

export default bookingRouter;
