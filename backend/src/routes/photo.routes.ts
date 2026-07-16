import { Router } from 'express';
import {
  getAllPhotosHandler,
  uploadPhotoHandler,
  replacePhotoImageHandler,
  updatePhotoOrderHandler,
  deletePhotoHandler,
} from '../controllers/photo.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { publicRateLimiter } from '../middleware/rate-limit.middleware';

const photoRouter = Router();

photoRouter.get('/',           publicRateLimiter, getAllPhotosHandler);
photoRouter.post('/',          requireAuth, uploadMiddleware.single('photo'), uploadPhotoHandler);
photoRouter.post('/:id/image', requireAuth, uploadMiddleware.single('photo'), replacePhotoImageHandler);
photoRouter.patch('/:id/order', requireAuth, updatePhotoOrderHandler);
photoRouter.delete('/:id',     requireAuth, deletePhotoHandler);

export default photoRouter;
