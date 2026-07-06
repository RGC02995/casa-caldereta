import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { blockedPeriodService, ICreateBlockedPeriodData } from '../services/blocked-period.service';

export async function getAllBlockedPeriodsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const periods = await blockedPeriodService.getAll();
    res.status(200).json({ success: true, data: periods, message: 'Periodos bloqueados obtenidos' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener los periodos bloqueados' });
  }
}

export async function getPublicAvailabilityHandler(_req: Request, res: Response): Promise<void> {
  try {
    const periods = await blockedPeriodService.getPublicAvailability();
    res.status(200).json({ success: true, data: periods, message: 'Disponibilidad obtenida' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener la disponibilidad' });
  }
}

export async function createBlockedPeriodHandler(req: Request, res: Response): Promise<void> {
  const { startDate, endDate, reason } = req.body as Partial<ICreateBlockedPeriodData>;

  if (!startDate || !endDate) {
    res.status(400).json({ success: false, message: 'Las fechas de inicio y fin son obligatorias' });
    return;
  }

  if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 200)) {
    res.status(400).json({ success: false, message: 'El motivo no puede superar los 200 caracteres' });
    return;
  }

  try {
    const trimmedReason = reason?.trim();
    const period = await blockedPeriodService.create({
      startDate,
      endDate,
      ...(trimmedReason ? { reason: trimmedReason } : {}),
    });
    res.status(201).json({ success: true, data: period, message: 'Periodo bloqueado creado' });
  } catch (error) {
    if (error instanceof Error && (error.name === 'ValidationError' || error.message.includes('fecha') || error.message.includes('válid') || error.message.includes('anterior'))) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al crear el periodo bloqueado' });
  }
}

export async function deleteBlockedPeriodHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const deleted = await blockedPeriodService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Periodo bloqueado no encontrado' });
      return;
    }
    res.status(200).json({ success: true, message: 'Periodo bloqueado eliminado' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar el periodo bloqueado' });
  }
}
