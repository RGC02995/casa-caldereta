import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import * as ical from 'node-ical';
import { icalExportHandler } from '../../controllers/ical-export.controller';
import { BookingModel, IBookingDocument } from '../../models/booking.model';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

// Mini app con solo el handler de exportacion — igual que en server.ts (raiz, sin auth)
const app = express();
app.get('/calendar.ics', icalExportHandler);

const IN_10_MIN  = () => new Date(Date.now() + 10 * 60 * 1000);
const AGO_10_MIN = () => new Date(Date.now() - 10 * 60 * 1000);

async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         new Date('2026-08-10'),
    checkOut:        new Date('2026-08-13'),
    guestName:       'NOMBRE-SECRETO Apellido',
    guestEmail:      'secreto@example.com',
    guestPhone:      '+34999888777',
    guests:          2,
    totalPrice:      300,
    depositAmount:   150,
    remainingAmount: 150,
    status:          'confirmed',
    notes:           'NOTA-PRIVADA del huesped',
    ...overrides,
  });
}

function countVevents(text: string): number {
  return (text.match(/BEGIN:VEVENT/g) ?? []).length;
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('GET /calendar.ics — exportacion iCal publica', () => {
  it('estructura VCALENDAR valida: BEGIN/END, VERSION 2.0, PRODID y separadores CRLF', async () => {
    const res = await request(app).get('/calendar.ics');
    expect(res.status).toBe(200);
    expect(res.text.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(res.text.endsWith('END:VCALENDAR')).toBe(true);
    expect(res.text).toContain('VERSION:2.0');
    expect(res.text).toContain('PRODID:-//Casa Caldereta//Calendar Sync//ES');
    expect(res.text).toContain('\r\n');
  });

  it('headers correctos: Content-Type text/calendar y Cache-Control 5 min', async () => {
    const res = await request(app).get('/calendar.ics');
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['cache-control']).toBe('public, max-age=300');
  });

  it('BD vacia → VCALENDAR valido sin VEVENTs', async () => {
    const res = await request(app).get('/calendar.ics');
    expect(countVevents(res.text)).toBe(0);
    expect(() => ical.sync.parseICS(res.text)).not.toThrow();
  });

  it('el output es parseable por node-ical (round-trip de formato)', async () => {
    await seedBooking();
    await BlockedPeriodModel.create({ startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'), origin: 'manual' });
    const res = await request(app).get('/calendar.ics');
    const parsed = ical.sync.parseICS(res.text);
    const vevents = Object.values(parsed).filter(c => c.type === 'VEVENT');
    expect(vevents).toHaveLength(2);
  });

  it('reserva confirmed → VEVENT "Reservado" con DTSTART=checkIn y DTEND=checkOut', async () => {
    const booking = await seedBooking();
    const res = await request(app).get('/calendar.ics');
    expect(res.text).toContain(`UID:booking-${String(booking._id)}@casa-caldereta.com`);
    expect(res.text).toContain('SUMMARY:Reservado');
    expect(res.text).toContain('DTSTART;VALUE=DATE:20260810');
    expect(res.text).toContain('DTEND;VALUE=DATE:20260813');
  });

  it('pending_payment con sesion viva incluida; caducada y cancelled excluidas', async () => {
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: IN_10_MIN() });
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: AGO_10_MIN(), checkIn: new Date('2026-08-17'), checkOut: new Date('2026-08-19') });
    await seedBooking({ status: 'cancelled', checkIn: new Date('2026-08-24'), checkOut: new Date('2026-08-26') });
    const res = await request(app).get('/calendar.ics');
    expect(countVevents(res.text)).toBe(1);
    expect(res.text).toContain('DTSTART;VALUE=DATE:20260810');
  });

  it('bloqueo manual → VEVENT "No disponible"', async () => {
    const blocked = await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'), origin: 'manual',
    });
    const res = await request(app).get('/calendar.ics');
    expect(res.text).toContain(`UID:blocked-${String(blocked._id)}@casa-caldereta.com`);
    expect(res.text).toContain('SUMMARY:No disponible');
  });

  it('bloqueo manual inclusivo 20-22 ago → DTEND debe ser 20260823 (endDate+1, RFC 5545 DTEND exclusivo) para no liberar el dia 22 en Airbnb/Booking', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'), origin: 'manual',
    });
    const res = await request(app).get('/calendar.ics');
    expect(res.text).toContain('DTSTART;VALUE=DATE:20260820');
    // La semantica del admin es inclusiva (el frontend bloquea el 22): el feed debe exportar DTEND 23
    expect(res.text).toContain('DTEND;VALUE=DATE:20260823');
  });

  it('no expone PII: nombre, email, telefono, notas ni reason del bloqueo', async () => {
    await seedBooking();
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'),
      origin: 'manual', reason: 'MOTIVO-PRIVADO obras en la casa',
    });
    const res = await request(app).get('/calendar.ics');
    expect(res.text).not.toContain('NOMBRE-SECRETO');
    expect(res.text).not.toContain('secreto@example.com');
    expect(res.text).not.toContain('+34999888777');
    expect(res.text).not.toContain('NOTA-PRIVADA');
    expect(res.text).not.toContain('MOTIVO-PRIVADO');
  });

  it('reason con CRLF y punto y coma no inyecta propiedades ni rompe el .ics', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'),
      origin: 'manual', reason: 'linea1\r\nSUMMARY:INYECTADO;X-EVIL:1',
    });
    const res = await request(app).get('/calendar.ics');
    expect(res.text).not.toContain('INYECTADO');
    expect(res.text).not.toContain('X-EVIL');
    expect(() => ical.sync.parseICS(res.text)).not.toThrow();
  });
});
