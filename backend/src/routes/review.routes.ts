import { Router } from 'express';
import {
  getApprovedReviewsHandler,
  getAllReviewsHandler,
  createReviewHandler,
  approveReviewHandler,
  deleteReviewHandler,
} from '../controllers/review.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { publicRateLimiter, reviewSubmitLimiter } from '../middleware/rate-limit.middleware';

const reviewRouter = Router();

reviewRouter.get('/',              publicRateLimiter,    getApprovedReviewsHandler);
reviewRouter.get('/all',           requireAuth,          getAllReviewsHandler);
reviewRouter.post('/',             reviewSubmitLimiter,  createReviewHandler);
reviewRouter.patch('/:id/approve', requireAuth, approveReviewHandler);
reviewRouter.delete('/:id',        requireAuth, deleteReviewHandler);

export default reviewRouter;
