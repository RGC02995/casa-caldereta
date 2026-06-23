import { Request, Response } from 'express';
import { pricingSettingsService } from '../services/pricing-settings.service';
import { IPricingConfig } from '../utils/pricing.util';

export async function getPricingSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await pricingSettingsService.get();
    res.status(200).json({ success: true, data: settings, message: 'Configuración de precios obtenida' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener la configuración de precios' });
  }
}

export async function updatePricingSettingsHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<IPricingConfig>;

  const allowed: (keyof IPricingConfig)[] = ['monThuPrice', 'friPrice', 'satPrice', 'extraPerPerson'];
  const update: Partial<IPricingConfig>   = {};

  for (const key of allowed) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      res.status(400).json({ success: false, message: `El campo "${key}" debe ser un número positivo` });
      return;
    }
    update[key] = value;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ success: false, message: 'No se enviaron campos válidos para actualizar' });
    return;
  }

  try {
    const settings = await pricingSettingsService.update(update);
    res.status(200).json({ success: true, data: settings, message: 'Precios actualizados correctamente' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar los precios' });
  }
}
