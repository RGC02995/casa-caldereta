import { Request, Response } from 'express';
import { env } from '../config/environment';
import { bookingService } from '../services/booking.service';
import { blockedPeriodService } from '../services/blocked-period.service';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

// Los bloqueos manuales se crean/pintan como inclusivos (endDate incluido);
// RFC 5545 trata DTEND como exclusivo — hay que sumar un día al exportarlos.
// Los bloqueos importados (airbnb/booking) ya llegan con endDate exclusivo
// desde el feed origen, así que se exportan tal cual.
function addOneDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function formatDateOnly(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function formatTimestamp(date: Date): string {
  return `${formatDateOnly(date)}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function buildEvent(uid: string, summary: string, start: Date, end: Date, dtstamp: string): string {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${formatDateOnly(start)}`,
    `DTEND;VALUE=DATE:${formatDateOnly(end)}`,
    `SUMMARY:${summary}`,
    'END:VEVENT',
  ].join('\r\n');
}

export function getIcalExportUrlHandler(_req: Request, res: Response): void {
  const url = `${env.backendUrl}/calendar.ics?token=${env.icalExportToken}`;
  res.status(200).json({ success: true, data: { url }, message: 'URL de exportación obtenida' });
}

export async function icalExportHandler(req: Request, res: Response): Promise<void> {
  if (req.query['token'] !== env.icalExportToken) {
    res.status(401).send('No autorizado');
    return;
  }

  try {
    const [bookings, blockedPeriods] = await Promise.all([
      bookingService.getExportRanges(),
      blockedPeriodService.getAll(),
    ]);

    const dtstamp = formatTimestamp(new Date());

    const bookingEvents = bookings.map(booking =>
      buildEvent(`booking-${booking.id}@casa-caldereta.com`, 'Reservado', booking.checkIn, booking.checkOut, dtstamp),
    );

    const blockedEvents = blockedPeriods.map(period => {
      const exportEndDate = period.origin === 'manual' ? addOneDay(period.endDate) : period.endDate;
      return buildEvent(`blocked-${String(period._id)}@casa-caldereta.com`, 'No disponible', period.startDate, exportEndDate, dtstamp);
    });

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Casa Caldereta//Calendar Sync//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...bookingEvents,
      ...blockedEvents,
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(ics);
  } catch {
    res.status(500).send('Error generando calendario');
  }
}
