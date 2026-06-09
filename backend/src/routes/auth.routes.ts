import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler, meHandler } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import { requireAuth } from '../middleware/require-auth.middleware';

const authRouter = Router();

authRouter.post('/login',   authRateLimiter, loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout',  logoutHandler);
authRouter.get('/me',       requireAuth, meHandler);

export default authRouter;
