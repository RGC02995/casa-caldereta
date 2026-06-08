import { Request, Response } from 'express';
import { bookingService, ICreateBookingData } from '../services/booking.service';
import { BookingStatus } from '../models/booking.model';

const VALID_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled', 'completed'];

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

export async function getBookingByIdHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
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
  const { checkIn, checkOut, guestName, guestEmail, guestPhone, guests, totalPrice, notes } =
    req.body as Partial<ICreateBookingData>;

  if (!checkIn || !checkOut || !guestName || !guestEmail || !guestPhone || guests === undefined || totalPrice === undefined) {
    res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    return;
  }

  if (typeof guests !== 'number' || guests < 1 || typeof totalPrice !== 'number' || totalPrice < 0) {
    res.status(400).json({ success: false, message: 'Datos no válidos' });
    return;
  }

  try {
    const bookingData: ICreateBookingData = { checkIn, checkOut, guestName, guestEmail, guestPhone, guests, totalPrice };
    if (notes) bookingData.notes = notes;
    const booking = await bookingService.create(bookingData);
    res.status(201).json({ success: true, data: booking, message: 'Reserva creada correctamente' });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('fecha') || error.message.includes('válid'))) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al crear la reserva' });
  }
}

export async function updateBookingStatusHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
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
  } catch {
    res.status(500).json({ success: false, message: 'Error al actualizar la reserva' });
  }
}

export async function deleteBookingHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
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
