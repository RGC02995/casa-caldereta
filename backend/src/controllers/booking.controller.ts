import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { bookingService, ICreateBookingData } from '../services/booking.service';
import { BookingStatus } from '../models/booking.model';
import { emailService } from '../services/email.service';
import { checkinService } from '../services/checkin.service';
import { verifyInvoiceToken, generateInvoiceHtml, generateInvoicePdf, buildInvoiceUrl } from '../utils/invoice.util';

export async function getPriceEstimateHandler(req: Request, res: Response): Promise<void> {
  const { checkIn, checkOut, guests } = req.query as {
    checkIn?: string;
    checkOut?: string;
    guests?:  string;
  };

  if (!checkIn || !checkOut) {
    res.status(400).json({ success: false, message: 'Faltan parámetros checkIn y checkOut' });
    return;
  }

  const parsedGuests = guests ? parseInt(guests, 10) : 2;
  if (isNaN(parsedGuests) || parsedGuests < 1 || parsedGuests > 6) {
    res.status(400).json({ success: false, message: 'El número de personas debe ser entre 1 y 6' });
    return;
  }

  try {
    const estimate = await bookingService.getEstimate(checkIn, checkOut, parsedGuests);
    res.status(200).json({ success: true, data: estimate, message: 'Estimación calculada' });
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'INVALID_DATES' || code === 'SUNDAY_CLOSED' || code === 'MIN_NIGHTS') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
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
  if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1 || guests > 6)
    return 'El número de personas debe ser entre 1 y 6';
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

    void emailService.notifyOwnerNewBooking(booking);
    void emailService.sendGuestBookingReceived(booking);
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'DATE_CONFLICT') { res.status(409).json({ success: false, message: error.message }); return; }
      if (code === 'SUNDAY_CLOSED') { res.status(400).json({ success: false, message: error.message }); return; }
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

    if (status === 'confirmed' || status === 'cancelled') {
      void emailService.sendGuestStatusUpdate(booking, status);
    }
    if (status === 'cancelled') {
      void emailService.notifyOwnerBookingCancelled(booking);
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

    void emailService.notifyOwnerBookingDeleted(deleted);
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
      if (code === 'DATE_CONFLICT') { res.status(409).json({ success: false, message: error.message }); return; }
      if (code === 'SUNDAY_CLOSED') { res.status(400).json({ success: false, message: error.message }); return; }
      if (code === 'MIN_NIGHTS')    { res.status(400).json({ success: false, message: error.message }); return; }
      if (code === 'INVALID_DATES' || error.name === 'ValidationError') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    res.status(500).json({ success: false, message: 'Error al crear la sesión de pago' });
  }
}

export async function createRemainingPaymentSessionHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  try {
    const result = await checkinService.sendRemainingPaymentEmailNow(req.params.id);
    res.status(201).json({ success: true, data: result, message: 'Enlace de pago restante enviado al huésped' });
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'NOT_FOUND')      { res.status(404).json({ success: false, message: error.message }); return; }
      if (code === 'INVALID_STATUS') { res.status(422).json({ success: false, message: error.message }); return; }
      if (code === 'ALREADY_PAID')   { res.status(409).json({ success: false, message: error.message }); return; }
    }
    res.status(500).json({ success: false, message: 'Error al crear la sesión de pago restante' });
  }
}

export async function cancelPendingPaymentHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  try {
    const cancelled = await bookingService.cancelOwnPendingPayment(req.params.id);
    if (!cancelled) {
      res.status(404).json({ success: false, message: 'Reserva no encontrada o ya no está pendiente de pago' });
      return;
    }
    res.status(200).json({ success: true, message: 'Reserva cancelada' });

    void emailService.notifyOwnerGuestCancelledPending(cancelled);
  } catch {
    res.status(500).json({ success: false, message: 'Error al cancelar la reserva' });
  }
}

export async function getInvoiceHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { token, format } = req.query as { token?: string; format?: string };

  if (!isValidObjectId(id)) {
    res.status(400).send('<p>ID no válido</p>');
    return;
  }

  if (!token || !verifyInvoiceToken(id, token)) {
    res.status(403).send('<p>Enlace de comprobante no válido o caducado.</p>');
    return;
  }

  try {
    const booking = await bookingService.getById(id);
    if (!booking) {
      res.status(404).send('<p>Reserva no encontrada.</p>');
      return;
    }

    if (!['confirmed', 'completed'].includes(booking.status)) {
      res.status(403).send('<p>El comprobante no está disponible para esta reserva.</p>');
      return;
    }

    if (format === 'pdf') {
      const isFullyPaid = !!booking.remainingPaidAt;
      const ref         = `CC-${String(booking._id).slice(-6).toUpperCase()}`;
      const filename    = isFullyPaid
        ? `comprobante-pago-completo-${ref}.pdf`
        : `comprobante-deposito-${ref}.pdf`;

      const pdfBuffer = await generateInvoicePdf(booking);
      res.status(200)
         .contentType('application/pdf')
         .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
         .send(pdfBuffer);
      return;
    }

    const pdfUrl = `${buildInvoiceUrl(id)}&format=pdf`;
    const html   = generateInvoiceHtml(booking, pdfUrl);
    res.status(200).contentType('text/html; charset=utf-8').send(html);
  } catch {
    res.status(500).send('<p>Error al generar el comprobante.</p>');
  }
}

export async function refundBookingHandler(req: Request<{ id: string }>, res: Response): Promise<void> {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'ID no válido' });
    return;
  }

  const { amount } = req.body as { amount?: unknown };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ success: false, message: 'El importe del reembolso no es válido.' });
    return;
  }

  try {
    const booking = await bookingService.refund(req.params.id, amount);
    res.status(200).json({ success: true, data: booking, message: 'Reembolso procesado y reserva cancelada' });

    void emailService.sendGuestRefundCancellation(booking, amount);
    void emailService.notifyOwnerRefundProcessed(booking, amount);
  } catch (error) {
    if (error instanceof Error) {
      const code = (error as { code?: string }).code;
      if (code === 'NOT_FOUND')      { res.status(404).json({ success: false, message: error.message }); return; }
      if (code === 'INVALID_STATUS') { res.status(422).json({ success: false, message: error.message }); return; }
      if (code === 'NO_PAYMENT')     { res.status(422).json({ success: false, message: error.message }); return; }
      if (code === 'VALIDATION')     { res.status(400).json({ success: false, message: error.message }); return; }
      if (code === 'REFUND_FAILED')  { res.status(502).json({ success: false, message: error.message }); return; }
    }
    res.status(500).json({ success: false, message: 'Error al procesar el reembolso' });
  }
}
