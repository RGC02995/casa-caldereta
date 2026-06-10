import { Router } from 'express';
import {
  getAllBlockedPeriodsHandler,
  createBlockedPeriodHandler,
  deleteBlockedPeriodHandler,
} from '../controllers/blocked-period.controller';
import { requireAuth } from '../middleware/require-auth.middleware';

const blockedPeriodRouter = Router();

blockedPeriodRouter.get('/',      getAllBlockedPeriodsHandler);
blockedPeriodRouter.post('/',     requireAuth, createBlockedPeriodHandler);
blockedPeriodRouter.delete('/:id', requireAuth, deleteBlockedPeriodHandler);

export default blockedPeriodRouter;
