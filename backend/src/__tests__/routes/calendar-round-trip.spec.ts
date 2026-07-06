import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';

vi.mock('../../config/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

import apiRouter from '../../routes/index';
import { icalExportHandler } from '../../controllers/ical-export.controller';
import { stripe } from '../../config/stripe';
import { blockedPeriodService } from '../../services/blocked-period.service';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

const sessionCreateMock = stripe.checkout.sessions.create as unknown as Mock;

// Mini app igual que server.ts: apiRouter bajo /api/v1 + calendar.ics en la raiz
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);
app.get('/calendar.ics', icalExportHandler);

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.3.${Math.floor(ipCounter / 200)}.${ipCounter % 200}`;
}

// Agosto 2026: lun 10, mar 11, mié 12, jue 13
function checkoutBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    checkIn:    '2026-08-10',
    checkOut:   '2026-08-13',
    guestName:  'María López',
    guestEmail: 'maria@example.com',
    guestPhone: '+34 600 555 666',
    guests:     2,
    ...overrides,
  };
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

beforeEach(() => {
  sessionCreateMock.mockReset().mockResolvedValue({
    id:  'cs_test_roundtrip',
    url: 'https://checkout.stripe.com/c/pay/cs_test_roundtrip',
  });
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('Round-trip calendario: plataforma externa ⇄ web de reservas', () => {
  it('un bloqueo importado de Airbnb (10→13, DTEND exclusivo) impide el checkout web en esas fechas → 409', async () => {
    // Como lo guardaria la sync: endDate exclusivo tal cual viene del feed
    await blockedPeriodService.upsertExternal(
      'airbnb', 'airbnb-uid-rt-1', new Date('2026-08-10'), new Date('2026-08-13'), 'Airbnb',
    );

    const res = await request(app)
      .post('/api/v1/bookings/checkout')
      .set('X-Forwarded-For', nextIp())
      .send(checkoutBody({ checkIn: '2026-08-11', checkOut: '2026-08-13' }));

    expect(res.status).toBe(409);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('tras el bloqueo de Airbnb, el dia de salida (13, exclusivo) sigue reservable → 201', async () => {
    await blockedPeriodService.upsertExternal(
      'airbnb', 'airbnb-uid-rt-2', new Date('2026-08-10'), new Date('2026-08-13'), 'Airbnb',
    );

    const res = await request(app)
      .post('/api/v1/bookings/checkout')
      .set('X-Forwarded-For', nextIp())
      .send(checkoutBody({ checkIn: '2026-08-13', checkOut: '2026-08-15' }));

    expect(res.status).toBe(201);
  });

  it('una reserva web (checkout) aparece en el feed de exportacion /calendar.ics como "Reservado"', async () => {
    const checkout = await request(app)
      .post('/api/v1/bookings/checkout')
      .set('X-Forwarded-For', nextIp())
      .send(checkoutBody());
    expect(checkout.status).toBe(201);

    const feed = await request(app).get('/calendar.ics?token=test-ical-export-token-for-testing-only');
    expect(feed.status).toBe(200);
    expect(feed.text).toContain(`UID:booking-${checkout.body.data.bookingId}@casa-caldereta.com`);
    expect(feed.text).toContain('SUMMARY:Reservado');
    expect(feed.text).toContain('DTSTART;VALUE=DATE:20260810');
    expect(feed.text).toContain('DTEND;VALUE=DATE:20260813');
  });

  it('un bloqueo importado de Airbnb se re-exporta en /calendar.ics (eco plataforma→casa→plataforma, documentado)', async () => {
    await blockedPeriodService.upsertExternal(
      'airbnb', 'airbnb-uid-rt-3', new Date('2026-08-10'), new Date('2026-08-13'), 'Airbnb',
    );
    const doc = await BlockedPeriodModel.findOne({ externalUid: 'airbnb-uid-rt-3' });

    const feed = await request(app).get('/calendar.ics?token=test-ical-export-token-for-testing-only');
    // Airbnb deduplica sus propios eventos por fechas; Booking podria mostrar el eco
    expect(feed.text).toContain(`UID:blocked-${String(doc?._id)}@casa-caldereta.com`);
    expect(feed.text).toContain('SUMMARY:No disponible');
  });
});
