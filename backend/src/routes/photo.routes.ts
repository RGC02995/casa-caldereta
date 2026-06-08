import { Router } from 'express';
import {
  getAllPhotosHandler,
  uploadPhotoHandler,
  updatePhotoOrderHandler,
  deletePhotoHandler,
} from '../controllers/photo.controller';
import { requireAuth } from '../middleware/require-auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const photoRouter = Router();

photoRouter.get('/',           getAllPhotosHandler);
photoRouter.post('/',          requireAuth, uploadMiddleware.single('photo'), uploadPhotoHandler);
photoRouter.patch('/:id/order', requireAuth, updatePhotoOrderHandler);
photoRouter.delete('/:id',     requireAuth, deletePhotoHandler);

export default photoRouter;
