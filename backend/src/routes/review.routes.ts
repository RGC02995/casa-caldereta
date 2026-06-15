import { Router } from 'express';
import {
  getApprovedReviewsHandler,
  getAllReviewsHandler,
  createReviewHandler,
  approveReviewHandler,
  deleteReviewHandler,
} from '../controllers/review.controller';
import { requireAuth } from '../middleware/require-auth.middleware';

const reviewRouter = Router();

reviewRouter.get('/',              getApprovedReviewsHandler);
reviewRouter.get('/all',           requireAuth, getAllReviewsHandler);
reviewRouter.post('/',             createReviewHandler);
reviewRouter.patch('/:id/approve', requireAuth, approveReviewHandler);
reviewRouter.delete('/:id',        requireAuth, deleteReviewHandler);

export default reviewRouter;
