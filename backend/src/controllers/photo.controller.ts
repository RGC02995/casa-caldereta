import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { photoService } from '../services/photo.service';
import { PhotoCategory } from '../models/photo.model';

const VALID_CATEGORIES: PhotoCategory[] = ['exterior', 'interior', 'cocina', 'dormitorio', 'bano', 'jardin', 'otros'];

export async function getAllPhotosHandler(_req: Request, res: Response): Promise<void> {
  try {
    const photos = await photoService.getAll();
    res.status(200).json({ success: true, data: photos, message: 'Fotos obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las fotos' });
  }
}

export async function uploadPhotoHandler(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No se ha enviado ninguna imagen' });
    return;
  }

  const { alt, category, order } = req.body as { alt?: string; category?: string; order?: string };

  if (!alt || !alt.trim()) {
    res.status(400).json({ success: false, message: 'El texto alternativo (alt) es obligatorio' });
    return;
  }

  const photoCategory = (category as PhotoCategory) ?? 'otros';
  if (!VALID_CATEGORIES.includes(photoCategory)) {
    res.status(400).json({ success: false, message: `Categoría no válida. Valores permitidos: ${VALID_CATEGORIES.join(', ')}` });
    return;
  }

  const parsedOrder = order !== undefined ? parseInt(order, 10) : 0;

  try {
    const photo = await photoService.upload({
      buffer:   req.file.buffer,
      alt:      alt.trim(),
      category: photoCategory,
      order:    isNaN(parsedOrder) ? 0 : parsedOrder,
    });
    res.status(201).json({ success: true, data: photo, message: 'Foto subida correctamente' });
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'CLOUDINARY_UPLOAD_FAILED') {
        res.status(502).json({ success: false, message: 'Error al subir la imagen al servicio externo' });
        return;
      }
      if (error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    res.status(500).json({ success: false, message: 'Error al subir la foto' });
  }
}

export async function updatePhotoOrderHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  const { order } = req.body as { order?: number };

  if (order === undefined || typeof order !== 'number' || order < 0) {
    res.status(400).json({ success: false, message: 'El orden debe ser un número positivo' });
    return;
  }

  try {
    const photo = await photoService.updateOrder(req.params.id, order);
    if (!photo) {
      res.status(404).json({ success: false, message: 'Foto no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: photo, message: 'Orden actualizado' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar el orden' });
  }
}

export async function deletePhotoHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const deleted = await photoService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Foto no encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Foto eliminada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la foto' });
  }
}
