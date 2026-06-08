import { Router } from 'express';
import { loginHandler, refreshHandler, logoutHandler } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const authRouter = Router();

authRouter.post('/login',   authRateLimiter, loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout',  logoutHandler);

export default authRouter;
