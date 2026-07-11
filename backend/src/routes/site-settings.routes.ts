import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.middleware';
import { getSiteSettingsHandler, setHeroPhotoHandler } from '../controllers/site-settings.controller';

const siteSettingsRouter = Router();

siteSettingsRouter.get('/',             getSiteSettingsHandler);
siteSettingsRouter.patch('/hero-photo', requireAuth, setHeroPhotoHandler);

export default siteSettingsRouter;
