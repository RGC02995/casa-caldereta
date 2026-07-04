import { Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { blockedPeriodService } from '../services/blocked-period.service';

function pad(value: number): string {
  return String(value).padStart(2, '0');
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

export async function icalExportHandler(_req: Request, res: Response): Promise<void> {
  try {
    const [bookings, blockedPeriods] = await Promise.all([
      bookingService.getExportRanges(),
      blockedPeriodService.getAll(),
    ]);

    const dtstamp = formatTimestamp(new Date());

    const bookingEvents = bookings.map(booking =>
      buildEvent(`booking-${booking.id}@casa-caldereta.com`, 'Reservado', booking.checkIn, booking.checkOut, dtstamp),
    );

    const blockedEvents = blockedPeriods.map(period =>
      buildEvent(`blocked-${String(period._id)}@casa-caldereta.com`, 'No disponible', period.startDate, period.endDate, dtstamp),
    );

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
