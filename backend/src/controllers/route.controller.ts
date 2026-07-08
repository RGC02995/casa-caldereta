import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { routeService } from '../services/route.service';
import { RouteDifficulty, RouteType, IRoutePoint } from '../models/route.model';

const VALID_DIFFICULTIES: RouteDifficulty[] = ['easy', 'moderate', 'hard'];
const VALID_TYPES: RouteType[]              = ['hiking', 'cycling', 'driving', 'walking'];

function isValidDifficulty(value: unknown): value is RouteDifficulty {
  return typeof value === 'string' && VALID_DIFFICULTIES.includes(value as RouteDifficulty);
}

function isValidType(value: unknown): value is RouteType {
  return typeof value === 'string' && VALID_TYPES.includes(value as RouteType);
}

function isValidUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

interface ISanitizeRoutePointResult {
  point?:   IRoutePoint;
  error?:   string;
  discard?: boolean;
}

function sanitizeRoutePoint(raw: unknown): ISanitizeRoutePointResult {
  if (typeof raw !== 'object' || raw === null) return { discard: true };
  const rawPoint = raw as Record<string, unknown>;

  if (typeof rawPoint['name'] !== 'string' || typeof rawPoint['description'] !== 'string') {
    return { discard: true };
  }

  const point: IRoutePoint = {
    name:        rawPoint['name'],
    description: rawPoint['description'],
  };

  if (typeof rawPoint['imageUrl'] === 'string' && rawPoint['imageUrl'].trim().length > 0) {
    point.imageUrl = rawPoint['imageUrl'];
  }

  if (rawPoint['lat'] !== undefined) {
    if (typeof rawPoint['lat'] !== 'number' || rawPoint['lat'] < -90 || rawPoint['lat'] > 90) {
      return { error: `La latitud del punto "${point.name}" no es válida` };
    }
    point.lat = rawPoint['lat'];
  }

  if (rawPoint['lng'] !== undefined) {
    if (typeof rawPoint['lng'] !== 'number' || rawPoint['lng'] < -180 || rawPoint['lng'] > 180) {
      return { error: `La longitud del punto "${point.name}" no es válida` };
    }
    point.lng = rawPoint['lng'];
  }

  if (typeof rawPoint['linkUrl'] === 'string' && rawPoint['linkUrl'].trim().length > 0) {
    if (!isValidUrl(rawPoint['linkUrl'])) {
      return { error: `El enlace del punto "${point.name}" no es una URL válida` };
    }
    point.linkUrl = rawPoint['linkUrl'];
  }

  return { point };
}

function sanitizeRoutePoints(raw: unknown): { points?: IRoutePoint[]; error?: string } {
  if (!Array.isArray(raw)) return { points: [] };

  const points: IRoutePoint[] = [];
  for (const rawPoint of raw) {
    const result = sanitizeRoutePoint(rawPoint);
    if (result.error) return { error: result.error };
    if (result.discard) continue;
    points.push(result.point!);
  }
  return { points };
}

export async function getAllRoutesHandler(_req: Request, res: Response): Promise<void> {
  try {
    const routes = await routeService.getAll();
    res.status(200).json({ success: true, data: routes });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las rutas' });
  }
}

export async function getPublishedRoutesHandler(_req: Request, res: Response): Promise<void> {
  try {
    const routes = await routeService.getPublished();
    res.status(200).json({ success: true, data: routes });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las rutas' });
  }
}

export async function getRouteBySlugHandler(req: Request<{ slug: string }>, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, message: 'Slug no válido' });
      return;
    }

    const route = await routeService.getBySlug(slug);

    if (!route) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: route });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener la ruta' });
  }
}

export async function createRouteHandler(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, distance, duration, difficulty, type, coverImageUrl, points, externalLinkLabel, externalLinkUrl, isPublished, order } = req.body as Record<string, unknown>;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ success: false, message: 'El título es obligatorio' });
      return;
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({ success: false, message: 'La descripción es obligatoria' });
      return;
    }
    if (typeof distance !== 'number' || distance < 0) {
      res.status(400).json({ success: false, message: 'La distancia debe ser un número positivo' });
      return;
    }
    if (typeof duration !== 'number' || duration < 0) {
      res.status(400).json({ success: false, message: 'La duración debe ser un número positivo' });
      return;
    }
    if (!isValidDifficulty(difficulty)) {
      res.status(400).json({ success: false, message: 'Dificultad no válida. Valores: easy, moderate, hard' });
      return;
    }
    if (!isValidType(type)) {
      res.status(400).json({ success: false, message: 'Tipo no válido. Valores: hiking, cycling, driving, walking' });
      return;
    }
    if (typeof externalLinkUrl === 'string' && externalLinkUrl.trim().length > 0 && !isValidUrl(externalLinkUrl)) {
      res.status(400).json({ success: false, message: 'El enlace externo de la ruta no es una URL válida' });
      return;
    }

    const { points: sanitizedPoints, error: pointsError } = sanitizeRoutePoints(points);
    if (pointsError) {
      res.status(400).json({ success: false, message: pointsError });
      return;
    }

    const route = await routeService.create({
      title:              title.trim(),
      description:        description.trim(),
      distance,
      duration,
      difficulty,
      type,
      coverImageUrl:      typeof coverImageUrl === 'string' ? coverImageUrl.trim() : '',
      points:             sanitizedPoints ?? [],
      externalLinkLabel:  typeof externalLinkLabel === 'string' ? externalLinkLabel.trim() : '',
      externalLinkUrl:    typeof externalLinkUrl === 'string' ? externalLinkUrl.trim() : '',
      isPublished:        isPublished === true,
      order:              typeof order === 'number' && order >= 0 ? order : 0,
    });

    res.status(201).json({ success: true, data: route });
  } catch {
    res.status(500).json({ success: false, message: 'Error al crear la ruta' });
  }
}

export async function updateRouteHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const { id } = req.params;
    const { title, description, distance, duration, difficulty, type, coverImageUrl, points, externalLinkLabel, externalLinkUrl, order } = req.body as Record<string, unknown>;

    if (difficulty !== undefined && !isValidDifficulty(difficulty)) {
      res.status(400).json({ success: false, message: 'Dificultad no válida. Valores: easy, moderate, hard' });
      return;
    }
    if (type !== undefined && !isValidType(type)) {
      res.status(400).json({ success: false, message: 'Tipo no válido. Valores: hiking, cycling, driving, walking' });
      return;
    }
    if (typeof externalLinkUrl === 'string' && externalLinkUrl.trim().length > 0 && !isValidUrl(externalLinkUrl)) {
      res.status(400).json({ success: false, message: 'El enlace externo de la ruta no es una URL válida' });
      return;
    }

    const updatePayload: Record<string, unknown> = {};
    if (title              !== undefined) updatePayload['title']              = String(title).trim();
    if (description        !== undefined) updatePayload['description']        = String(description).trim();
    if (distance           !== undefined) updatePayload['distance']           = Number(distance);
    if (duration           !== undefined) updatePayload['duration']           = Number(duration);
    if (difficulty         !== undefined) updatePayload['difficulty']         = difficulty;
    if (type               !== undefined) updatePayload['type']               = type;
    if (coverImageUrl      !== undefined) updatePayload['coverImageUrl']      = String(coverImageUrl).trim();
    if (externalLinkLabel  !== undefined) updatePayload['externalLinkLabel']  = String(externalLinkLabel).trim();
    if (externalLinkUrl    !== undefined) updatePayload['externalLinkUrl']    = String(externalLinkUrl).trim();
    if (order              !== undefined) updatePayload['order']              = Number(order);

    if (points !== undefined) {
      const { points: sanitizedPoints, error: pointsError } = sanitizeRoutePoints(points);
      if (pointsError) {
        res.status(400).json({ success: false, message: pointsError });
        return;
      }
      updatePayload['points'] = sanitizedPoints;
    }

    const updatedRoute = await routeService.update(id, updatePayload as Parameters<typeof routeService.update>[1]);

    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar la ruta' });
  }
}

export async function toggleRoutePublishedHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const { id } = req.params;
    const updatedRoute = await routeService.togglePublished(id);

    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }

    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al cambiar el estado de publicación' });
  }
}

export async function uploadRouteCoverImageHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen' });
    return;
  }
  try {
    const updatedRoute = await routeService.uploadCoverImage(req.params.id, req.file.buffer);
    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al subir la imagen de portada' });
  }
}

export async function uploadRoutePointImageHandler(req: Request<{ id: string; index: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  const pointIndex = Number(req.params.index);
  if (!Number.isInteger(pointIndex) || pointIndex < 0) {
    res.status(400).json({ success: false, message: 'Índice de punto no válido' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen' });
    return;
  }
  try {
    const updatedRoute = await routeService.uploadPointImage(req.params.id, pointIndex, req.file.buffer);
    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta o punto de ruta no encontrado' });
      return;
    }
    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al subir la imagen del punto' });
  }
}

export async function uploadRouteGalleryImageHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen' });
    return;
  }
  try {
    const updatedRoute = await routeService.addGalleryImage(req.params.id, req.file.buffer);
    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al subir la imagen de galería' });
  }
}

export async function deleteRouteGalleryImageHandler(req: Request<{ id: string; publicId: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    const updatedRoute = await routeService.deleteGalleryImage(req.params.id, publicId);
    if (!updatedRoute) {
      res.status(404).json({ success: false, message: 'Ruta o imagen no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: updatedRoute });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la imagen de galería' });
  }
}

export async function deleteRouteHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const { id } = req.params;
    const deleted = await routeService.delete(id);

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Ruta no encontrada' });
      return;
    }

    res.status(200).json({ success: true, message: 'Ruta eliminada correctamente' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la ruta' });
  }
}
