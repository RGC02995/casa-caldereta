import { Router } from 'express';
import {
  getAllBlockedPeriodsHandler,
  getPublicAvailabilityHandler,
  createBlockedPeriodHandler,
  deleteBlockedPeriodHandler,
} from '../controllers/blocked-period.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { publicRateLimiter } from '../middleware/rate-limit.middleware';

const blockedPeriodRouter = Router();

blockedPeriodRouter.get('/availability', publicRateLimiter, getPublicAvailabilityHandler);
blockedPeriodRouter.get('/',             requireAuth,       getAllBlockedPeriodsHandler);
blockedPeriodRouter.post('/',     requireAuth, createBlockedPeriodHandler);
blockedPeriodRouter.delete('/:id', requireAuth, deleteBlockedPeriodHandler);

export default blockedPeriodRouter;
