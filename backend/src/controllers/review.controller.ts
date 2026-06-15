import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { reviewService, ICreateReviewData } from '../services/review.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getApprovedReviewsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const reviews = await reviewService.getApproved();
    res.status(200).json({ success: true, data: reviews, message: 'Reseñas obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las reseñas' });
  }
}

export async function getAllReviewsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const reviews = await reviewService.getAll();
    res.status(200).json({ success: true, data: reviews, message: 'Reseñas obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las reseñas' });
  }
}

export async function createReviewHandler(req: Request, res: Response): Promise<void> {
  const { author, location, rating, text } = req.body as Partial<ICreateReviewData>;

  if (!author || !location || rating === undefined || !text) {
    res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    return;
  }

  if (typeof author !== 'string' || author.trim().length < 2 || author.trim().length > 80) {
    res.status(400).json({ success: false, message: 'El nombre debe tener entre 2 y 80 caracteres' });
    return;
  }

  if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 80) {
    res.status(400).json({ success: false, message: 'La localidad debe tener entre 2 y 80 caracteres' });
    return;
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, message: 'La puntuación debe ser un número entero entre 1 y 5' });
    return;
  }

  if (typeof text !== 'string' || text.trim().length < 10 || text.trim().length > 800) {
    res.status(400).json({ success: false, message: 'La reseña debe tener entre 10 y 800 caracteres' });
    return;
  }

  // Sanitización básica: rechazar HTML
  const htmlRegex = /<[^>]*>/;
  if (htmlRegex.test(author) || htmlRegex.test(location) || htmlRegex.test(text)) {
    res.status(400).json({ success: false, message: 'El contenido no es válido' });
    return;
  }

  try {
    await reviewService.create({
      author:   author.trim(),
      location: location.trim(),
      rating,
      text:     text.trim(),
    });
    res.status(201).json({ success: true, message: 'Reseña enviada. Será publicada tras su revisión.' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al enviar la reseña' });
  }
}

export async function approveReviewHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const review = await reviewService.approve(req.params.id);
    if (!review) {
      res.status(404).json({ success: false, message: 'Reseña no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: review, message: 'Reseña aprobada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al aprobar la reseña' });
  }
}

export async function deleteReviewHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const deleted = await reviewService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Reseña no encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Reseña eliminada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la reseña' });
  }
}
