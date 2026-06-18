import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { bookingService, ICreateBookingData } from '../services/booking.service';
import { BookingStatus } from '../models/booking.model';
import { emailService } from '../services/email.service';

export async function getPriceEstimateHandler(req: Request, res: Response): Promise<void> {
  const { checkIn, checkOut } = req.query as { checkIn?: string; checkOut?: string };
  if (!checkIn || !checkOut) {
    res.status(400).json({ success: false, message: 'Faltan parámetros checkIn y checkOut' });
    return;
  }
  try {
    const estimate = await bookingService.getEstimate(checkIn, checkOut);
    res.status(200).json({ success: true, data: estimate, message: 'Estimación calculada' });
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === 'INVALID_DATES') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al calcular la estimación' });
  }
}

const VALID_STATUSES: BookingStatus[] = ['pending_payment', 'pending', 'confirmed', 'cancelled', 'completed'];

const PHONE_REGEX = /^\+?[\d\s\-]{6,20}$/;

function validateBookingInput(body: Partial<ICreateBookingData>): string | null {
  const { checkIn, checkOut, guestName, guestEmail, guestPhone, guests, notes } = body;
  if (!checkIn || !checkOut || !guestName || !guestEmail || !guestPhone || guests === undefined)
    return 'Faltan campos obligatorios';
  if (typeof guestName !== 'string' || guestName.trim().length < 2 || guestName.trim().length > 100)
    return 'El nombre debe tener entre 2 y 100 caracteres';
  if (typeof guestEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
    return 'Email no válido';
  if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1 || guests > 20)
    return 'El número de huéspedes debe ser entre 1 y 20';
  if (typeof guestPhone !== 'string' || !PHONE_REGEX.test(guestPhone.trim()))
    return 'Teléfono no válido';
  if (notes !== undefined && (typeof notes !== 'string' || notes.trim().length > 500))
    return 'El mensaje no puede superar los 500 caracteres';
  return null;
}

export async function getAllBookingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const bookings = await bookingService.getAll();
    res.status(200).json({ success: true, data: bookings, message: 'Reservas obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las reservas' });
  }
}

export async function getUpcomingBookingsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const bookings = await bookingService.getUpcoming();
    res.status(200).json({ success: true, data: bookings, message: 'Próximas reservas obtenidas' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener las próximas reservas' });
  }
}

// Endpoint público — devuelve solo fechas de reservas activas, sin datos del huésped
export async function getAvailabilityHandler(_req: Request, res: Response): Promise<void> {
  try {
    const availability = await bookingService.getAvailability();
    res.status(200).json({ success: true, data: availability, message: 'Disponibilidad obtenida' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' });
  }
}

export async function getBookingByIdHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const booking = await bookingService.getById(req.params.id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Reserva no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: booking, message: 'Reserva obtenida' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al obtener la reserva' });
  }
}

export async function createBookingHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<ICreateBookingData>;
  const validationError = validateBookingInput(body);
  if (validationError) { res.status(400).json({ success: false, message: validationError }); return; }

  const { checkIn, checkOut, guestName, guestEmail, guestPhone, guests, notes } = body as ICreateBookingData;

  try {
    const bookingData: ICreateBookingData = {
      checkIn,
      checkOut,
      guestName:  guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      guests,
    };

    const trimmedNotes = notes?.trim();
    if (trimmedNotes) bookingData.notes = trimmedNotes;

    const booking = await bookingService.create(bookingData);
    res.status(201).json({ success: true, data: booking, message: 'Reserva creada correctamente' });

    // Fire-and-forget — la respuesta ya ha sido enviada, los emails no bloquean
    void emailService.notifyOwnerNewBooking(booking);
    void emailService.sendGuestBookingReceived(booking);
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'DATE_CONFLICT') {
        res.status(409).json({ success: false, message: error.message });
        return;
      }
      if (code === 'INVALID_DATES' || error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    res.status(500).json({ success: false, message: 'Error al crear la reserva' });
  }
}

export async function updateBookingStatusHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  const { status } = req.body as { status?: BookingStatus };

  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ success: false, message: `Estado no válido. Valores permitidos: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  try {
    const booking = await bookingService.updateStatus(req.params.id, status);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Reserva no encontrada' });
      return;
    }
    res.status(200).json({ success: true, data: booking, message: 'Estado actualizado' });

    // Notificar al huésped solo en transiciones relevantes
    if (status === 'confirmed' || status === 'cancelled') {
      void emailService.sendGuestStatusUpdate(booking, status);
    }
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar la reserva' });
  }
}

export async function deleteBookingHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }
  try {
    const deleted = await bookingService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Reserva no encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Reserva eliminada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al eliminar la reserva' });
  }
}

export async function createCheckoutSessionHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<ICreateBookingData>;
  const validationError = validateBookingInput(body);
  if (validationError) { res.status(400).json({ success: false, message: validationError }); return; }

  const { checkIn, checkOut, guestName, guestEmail, guestPhone, guests, notes } = body as ICreateBookingData;

  try {
    const bookingData: ICreateBookingData = {
      checkIn,
      checkOut,
      guestName:  guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      guests,
    };

    const trimmedNotes = notes?.trim();
    if (trimmedNotes) bookingData.notes = trimmedNotes;

    const result = await bookingService.createCheckoutSession(bookingData);
    res.status(201).json({ success: true, data: result, message: 'Sesión de pago creada' });
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'DATE_CONFLICT') {
        res.status(409).json({ success: false, message: error.message });
        return;
      }
      if (code === 'INVALID_DATES' || error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    res.status(500).json({ success: false, message: 'Error al crear la sesión de pago' });
  }
}

export async function refundBookingHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  try {
    const booking = await bookingService.refund(req.params.id);
    res.status(200).json({ success: true, data: booking, message: 'Reembolso procesado y reserva cancelada' });

    void emailService.sendGuestRefundCancellation(booking);
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as NodeJS.ErrnoException & { code?: string }).code;
      if (code === 'NOT_FOUND')     { res.status(404).json({ success: false, message: error.message }); return; }
      if (code === 'INVALID_STATUS') { res.status(422).json({ success: false, message: error.message }); return; }
      if (code === 'NO_PAYMENT')     { res.status(422).json({ success: false, message: error.message }); return; }
    }
    res.status(500).json({ success: false, message: 'Error al procesar el reembolso' });
  }
}
