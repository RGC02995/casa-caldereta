import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.middleware';
import {
  getAllRoutesHandler,
  getPublishedRoutesHandler,
  getRouteBySlugHandler,
  createRouteHandler,
  updateRouteHandler,
  toggleRoutePublishedHandler,
  deleteRouteHandler,
} from '../controllers/route.controller';

const routeRouter = Router();

// Rutas públicas — lectura de contenido publicado
routeRouter.get('/published',        getPublishedRoutesHandler);
routeRouter.get('/slug/:slug',       getRouteBySlugHandler);

// Rutas protegidas — gestión del admin
routeRouter.get('/',                 requireAuth, getAllRoutesHandler);
routeRouter.post('/',                requireAuth, createRouteHandler);
routeRouter.patch('/:id',            requireAuth, updateRouteHandler);
routeRouter.patch('/:id/published',  requireAuth, toggleRoutePublishedHandler);
routeRouter.delete('/:id',           requireAuth, deleteRouteHandler);

export default routeRouter;
