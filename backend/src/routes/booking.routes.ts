import { Router } from 'express';
import {
  getAllBookingsHandler,
  getUpcomingBookingsHandler,
  getAvailabilityHandler,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
} from '../controllers/booking.controller';
import { requireAuth } from '../middleware/require-auth.middleware';

const bookingRouter = Router();

bookingRouter.get('/',             requireAuth, getAllBookingsHandler);
bookingRouter.get('/upcoming',     requireAuth, getUpcomingBookingsHandler);
// /availability declarado antes de /:id para que Express no interprete "availability" como un param
bookingRouter.get('/availability',              getAvailabilityHandler);
bookingRouter.get('/:id',          requireAuth, getBookingByIdHandler);
bookingRouter.post('/',                         createBookingHandler);
bookingRouter.patch('/:id/status', requireAuth, updateBookingStatusHandler);
bookingRouter.delete('/:id',       requireAuth, deleteBookingHandler);

export default bookingRouter;
