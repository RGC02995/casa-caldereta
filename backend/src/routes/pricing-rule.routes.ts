import { Router } from 'express';
import {
  getAllPricingRulesHandler,
  createPricingRuleHandler,
  updatePricingRuleHandler,
  deletePricingRuleHandler,
} from '../controllers/pricing-rule.controller';
import { requireAuth } from '../middleware/require-auth.middleware';

const pricingRuleRouter = Router();

pricingRuleRouter.get('/',     getAllPricingRulesHandler);
pricingRuleRouter.post('/',    requireAuth, createPricingRuleHandler);
pricingRuleRouter.put('/:id',  requireAuth, updatePricingRuleHandler);
pricingRuleRouter.delete('/:id', requireAuth, deletePricingRuleHandler);

export default pricingRuleRouter;
