import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { checkinService, ITravelerInput } from '../services/checkin.service';
import { BookingModel, IBookingDocument } from '../models/booking.model';
import { generateSesHospedajesXml } from '../utils/ses-hospedajes-xml.util';

// ─── Público ───────────────────────────────────────────────────────────────────

// GET /checkin/form/:token — devuelve info de la reserva para mostrar el formulario
export async function getCheckinFormHandler(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || token.length !== 64) {
      res.status(404).json({ success: false, message: 'Enlace no válido o expirado.' });
      return;
    }

    const info = await checkinService.validateToken(token);
    if (!info) {
      res.status(404).json({ success: false, message: 'Enlace no válido o expirado.' });
      return;
    }

    res.status(200).json({ success: true, data: info });
  } catch (err) {
    console.error('[checkin] getCheckinFormHandler:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// POST /checkin/form/:token — enviar datos de viajeros
export async function submitCheckinFormHandler(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || token.length !== 64) {
      res.status(404).json({ success: false, message: 'Enlace no válido o expirado.' });
      return;
    }

    const travelers = req.body.travelers as ITravelerInput[] | undefined;

    if (!Array.isArray(travelers) || travelers.length === 0) {
      res.status(400).json({ success: false, message: 'Debes registrar al menos un viajero.' });
      return;
    }

    await checkinService.submitGuestForm(token, travelers);
    res.status(200).json({ success: true, message: 'Registro completado correctamente.' });
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code === 'INVALID_TOKEN') {
      res.status(404).json({ success: false, message: 'Enlace no válido o expirado.' });
    } else if (code === 'ALREADY_SUBMITTED') {
      res.status(409).json({ success: false, message: 'El formulario ya fue enviado.' });
    } else if (code === 'VALIDATION') {
      res.status(400).json({ success: false, message: (err as Error).message });
    } else {
      console.error('[checkin] submitCheckinFormHandler:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

// GET /checkin/today — reservas con check-in o check-out hoy
export async function getTodayActivityHandler(_req: Request, res: Response): Promise<void> {
  try {
    const data = await checkinService.getTodayActivity();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[checkin] getTodayActivityHandler:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// POST /checkin/send-form/:bookingId — generar token y enviar email pre-llegada
export async function sendPreArrivalEmailHandler(req: Request, res: Response): Promise<void> {
  const { bookingId } = req.params as { bookingId: string };
  if (!isValidObjectId(bookingId)) {
    res.status(400).json({ success: false, message: 'ID no válido.' });
    return;
  }
  try {
    await checkinService.generateAndSendFormToken(bookingId);
    res.status(200).json({ success: true, message: 'Email de pre-llegada enviado.' });
  } catch (err) {
    const code = (err as { code?: string }).code;

    if (code === 'NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
    } else if (code === 'INVALID_STATUS') {
      res.status(409).json({ success: false, message: (err as Error).message });
    } else {
      console.error('[checkin] sendPreArrivalEmailHandler:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

// PATCH /checkin/:bookingId/check-in — registrar entrada
export async function recordCheckInHandler(req: Request, res: Response): Promise<void> {
  const { bookingId } = req.params as { bookingId: string };
  if (!isValidObjectId(bookingId)) {
    res.status(400).json({ success: false, message: 'ID no válido.' });
    return;
  }
  try {
    const updated = await checkinService.recordCheckIn(bookingId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if ((err as { code?: string }).code === 'NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
    } else {
      console.error('[checkin] recordCheckInHandler:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

// PATCH /checkin/:bookingId/check-out — registrar salida y marcar completada
export async function recordCheckOutHandler(req: Request, res: Response): Promise<void> {
  const { bookingId } = req.params as { bookingId: string };
  if (!isValidObjectId(bookingId)) {
    res.status(400).json({ success: false, message: 'ID no válido.' });
    return;
  }
  try {
    const updated = await checkinService.recordCheckOut(bookingId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if ((err as { code?: string }).code === 'NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
    } else {
      console.error('[checkin] recordCheckOutHandler:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

// GET /checkin/:bookingId/travelers — ver viajeros registrados
export async function getTravelersHandler(req: Request, res: Response): Promise<void> {
  const { bookingId } = req.params as { bookingId: string };
  if (!isValidObjectId(bookingId)) {
    res.status(400).json({ success: false, message: 'ID no válido.' });
    return;
  }
  try {
    const travelers = await checkinService.getTravelers(bookingId);
    res.status(200).json({ success: true, data: travelers });
  } catch (err) {
    console.error('[checkin] getTravelersHandler:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// GET /checkin/:bookingId/travelers/xml — descargar parte de viajeros en XML (borrador SES.HOSPEDAJES)
export async function getTravelersXmlHandler(req: Request, res: Response): Promise<void> {
  const { bookingId } = req.params as { bookingId: string };
  if (!isValidObjectId(bookingId)) {
    res.status(400).json({ success: false, message: 'ID no válido.' });
    return;
  }
  try {
    const booking = await BookingModel.findById(bookingId).lean<IBookingDocument>();
    if (!booking) {
      res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
      return;
    }

    const [travelers, settings] = await Promise.all([
      checkinService.getTravelers(bookingId),
      checkinService.getSettings(),
    ]);
    const xml = generateSesHospedajesXml(booking, travelers, settings);

    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="parte-viajeros-${bookingId}.xml"`);
    res.send(xml);
  } catch (err) {
    console.error('[checkin] getTravelersXmlHandler:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// GET /checkin/settings — obtener horarios configurados
export async function getCheckinSettingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const settings = await checkinService.getSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error('[checkin] getCheckinSettingsHandler:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

// PATCH /checkin/settings — actualizar horarios
export async function updateCheckinSettingsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { checkInTime, checkOutTime } = req.body as { checkInTime?: string; checkOutTime?: string };

    if (!checkInTime || !checkOutTime) {
      res.status(400).json({ success: false, message: 'checkInTime y checkOutTime son obligatorios.' });
      return;
    }

    const updated = await checkinService.updateSettings(checkInTime, checkOutTime);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    if ((err as { code?: string }).code === 'VALIDATION') {
      res.status(400).json({ success: false, message: (err as Error).message });
    } else {
      console.error('[checkin] updateCheckinSettingsHandler:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}
