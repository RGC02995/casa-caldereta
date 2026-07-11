import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { siteSettingsService } from '../services/site-settings.service';

export async function getSiteSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await siteSettingsService.get();
    res.status(200).json({ success: true, data: settings, message: 'Configuración del sitio obtenida' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener la configuración del sitio' });
  }
}

export async function setHeroPhotoHandler(req: Request, res: Response): Promise<void> {
  const { photoId } = req.body as { photoId?: string };

  if (!photoId || !isValidObjectId(photoId)) {
    res.status(400).json({ success: false, message: 'ID de foto no válido' });
    return;
  }

  try {
    const settings = await siteSettingsService.setHeroPhoto(photoId);
    if (!settings) {
      res.status(404).json({ success: false, message: 'Foto no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: settings, message: 'Imagen del hero actualizada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar la imagen del hero' });
  }
}
