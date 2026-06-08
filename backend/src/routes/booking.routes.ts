import { Router } from 'express';
import {
  getAllBookingsHandler,
  getUpcomingBookingsHandler,
  getBookingByIdHandler,
  createBookingHandler,
  updateBookingStatusHandler,
  deleteBookingHandler,
} from '../controllers/booking.controller';
import { requireAuth } from '../middleware/require-auth.middleware';

const bookingRouter = Router();

bookingRouter.get('/',          requireAuth, getAllBookingsHandler);
bookingRouter.get('/upcoming',  requireAuth, getUpcomingBookingsHandler);
bookingRouter.get('/:id',       requireAuth, getBookingByIdHandler);
bookingRouter.post('/',                      createBookingHandler);
bookingRouter.patch('/:id/status', requireAuth, updateBookingStatusHandler);
bookingRouter.delete('/:id',    requireAuth, deleteBookingHandler);

export default bookingRouter;
