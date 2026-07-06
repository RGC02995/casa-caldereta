import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.middleware';
import { getIcalExportUrlHandler } from '../controllers/ical-export.controller';

const icalExportRouter = Router();

icalExportRouter.get('/', requireAuth, getIcalExportUrlHandler);

export default icalExportRouter;
