import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import {
  getAllRoutesHandler,
  getPublishedRoutesHandler,
  getRouteBySlugHandler,
  createRouteHandler,
  updateRouteHandler,
  toggleRoutePublishedHandler,
  uploadRouteCoverImageHandler,
  uploadRoutePointImageHandler,
  uploadRouteGalleryImageHandler,
  deleteRouteGalleryImageHandler,
  deleteRouteHandler,
} from '../controllers/route.controller';

const routeRouter = Router();

// Rutas públicas — lectura de contenido publicado
routeRouter.get('/published',        getPublishedRoutesHandler);
routeRouter.get('/slug/:slug',       getRouteBySlugHandler);

// Rutas protegidas — gestión del admin
routeRouter.get('/',                       requireAuth, getAllRoutesHandler);
routeRouter.post('/',                      requireAuth, createRouteHandler);
routeRouter.patch('/:id',                  requireAuth, updateRouteHandler);
routeRouter.patch('/:id/published',        requireAuth, toggleRoutePublishedHandler);
routeRouter.post('/:id/cover-image',       requireAuth, uploadMiddleware.single('coverImage'), uploadRouteCoverImageHandler);
routeRouter.post('/:id/points/:index/image', requireAuth, uploadMiddleware.single('image'), uploadRoutePointImageHandler);
routeRouter.post('/:id/images',            requireAuth, uploadMiddleware.single('image'), uploadRouteGalleryImageHandler);
routeRouter.delete('/:id/images/:publicId', requireAuth, deleteRouteGalleryImageHandler);
routeRouter.delete('/:id',                 requireAuth, deleteRouteHandler);

export default routeRouter;
