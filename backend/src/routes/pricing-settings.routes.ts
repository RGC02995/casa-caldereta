import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.middleware';
import { getPricingSettingsHandler, updatePricingSettingsHandler } from '../controllers/pricing-settings.controller';

const pricingSettingsRouter = Router();

pricingSettingsRouter.get('/',   getPricingSettingsHandler);
pricingSettingsRouter.patch('/', requireAuth, updatePricingSettingsHandler);

export default pricingSettingsRouter;
