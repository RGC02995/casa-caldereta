import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { pricingRuleService, ICreatePricingRuleData, IUpdatePricingRuleData } from '../services/pricing-rule.service';

export async function getAllPricingRulesHandler(_req: Request, res: Response): Promise<void> {
  try {
    const rules = await pricingRuleService.getAll();
    res.status(200).json({ success: true, data: rules, message: 'Reglas de precio obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las reglas de precio' });
  }
}

export async function createPricingRuleHandler(req: Request, res: Response): Promise<void> {
  const { label, startDate, endDate, pricePerNight, minNights } =
    req.body as Partial<ICreatePricingRuleData>;

  if (!label || !startDate || !endDate || pricePerNight === undefined || minNights === undefined) {
    res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    return;
  }

  if (typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 100) {
    res.status(400).json({ success: false, message: 'La etiqueta debe tener entre 1 y 100 caracteres' });
    return;
  }

  if (typeof pricePerNight !== 'number' || pricePerNight < 1 || pricePerNight > 10000) {
    res.status(400).json({ success: false, message: 'El precio debe estar entre 1 y 10000 €' });
    return;
  }

  if (typeof minNights !== 'number' || minNights < 1 || minNights > 365 || !Number.isInteger(minNights)) {
    res.status(400).json({ success: false, message: 'Las noches mínimas deben ser un entero entre 1 y 365' });
    return;
  }

  try {
    const rule = await pricingRuleService.create({
      label:         label.trim(),
      startDate,
      endDate,
      pricePerNight,
      minNights,
    });
    res.status(201).json({ success: true, data: rule, message: 'Regla de precio creada' });
  } catch (error) {
    if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('fecha') || error.message.includes('válid') || error.message.includes('posterior'))) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al crear la regla de precio' });
  }
}

export async function updatePricingRuleHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  const { label, startDate, endDate, pricePerNight, minNights } =
    req.body as Partial<IUpdatePricingRuleData>;

  if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0 || label.trim().length > 100)) {
    res.status(400).json({ success: false, message: 'La etiqueta debe tener entre 1 y 100 caracteres' });
    return;
  }

  if (pricePerNight !== undefined && (typeof pricePerNight !== 'number' || pricePerNight < 1 || pricePerNight > 10000)) {
    res.status(400).json({ success: false, message: 'El precio debe estar entre 1 y 10000 €' });
    return;
  }

  if (minNights !== undefined && (typeof minNights !== 'number' || minNights < 1 || minNights > 365 || !Number.isInteger(minNights))) {
    res.status(400).json({ success: false, message: 'Las noches mínimas deben ser un entero entre 1 y 365' });
    return;
  }

  try {
    const updateData: import('../services/pricing-rule.service').IUpdatePricingRuleData = {};
    if (label         !== undefined) updateData.label         = label.trim();
    if (startDate     !== undefined) updateData.startDate     = startDate;
    if (endDate       !== undefined) updateData.endDate       = endDate;
    if (pricePerNight !== undefined) updateData.pricePerNight = pricePerNight;
    if (minNights     !== undefined) updateData.minNights     = minNights;

    const rule = await pricingRuleService.update(req.params.id, updateData);
    if (!rule) {
      res.status(404).json({ success: false, message: 'Regla de precio no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: rule, message: 'Regla de precio actualizada' });
  } catch (error) {
    if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('fecha') || error.message.includes('válid') || error.message.includes('posterior'))) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al actualizar la regla de precio' });
  }
}

export async function deletePricingRuleHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const deleted = await pricingRuleService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Regla de precio no encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Regla de precio eliminada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la regla de precio' });
  }
}
