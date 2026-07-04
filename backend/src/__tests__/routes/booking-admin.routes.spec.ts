import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { BookingModel, IBookingDocument } from '../../models/booking.model';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

// Agosto 2026: lun 10, mar 11, mié 12, jue 13, vie 14, sáb 15, dom 16
function bookingBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    checkIn:    '2026-08-10',
    checkOut:   '2026-08-13',
    guestName:  'Reserva Manual',
    guestEmail: 'manual@example.com',
    guestPhone: '+34 600 333 444',
    guests:     2,
    ...overrides,
  };
}

async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         new Date('2026-08-10'),
    checkOut:        new Date('2026-08-13'),
    guestName:       'Huésped Existente',
    guestEmail:      'existente@example.com',
    guestPhone:      '+34600000001',
    guests:          2,
    totalPrice:      300,
    depositAmount:   150,
    remainingAmount: 150,
    status:          'confirmed',
    ...overrides,
  });
}

let mongod: MongoMemoryServer;
let authToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  authToken = signAccessToken({ role: 'admin' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('POST /api/v1/bookings — reserva manual del admin', () => {
  it('sin Authorization → 401', async () => {
    const res = await request(app).post('/api/v1/bookings').send(bookingBody());
    expect(res.status).toBe(401);
  });

  it('con token y fechas libres → 201 con status pending', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingBody());
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.totalPrice).toBe(300); // lun+mar+mié a 100 €/noche
  });

  it('con token y solape con reserva confirmed → 409', async () => {
    await seedBooking();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingBody());
    expect(res.status).toBe(409);
  });

  it('con token y bloqueo importado de airbnb solapado → 409', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-11'), endDate: new Date('2026-08-12'),
      origin: 'airbnb', externalUid: 'airbnb-uid-admin-1',
    });
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingBody());
    expect(res.status).toBe(409);
  });

  it('con token y checkIn en domingo → 400', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingBody({ checkIn: '2026-08-16', checkOut: '2026-08-18' }));
    expect(res.status).toBe(400);
  });

  it('HALLAZGO: pending_payment con sesion viva NO bloquea el create admin → 201 (el checkout publico lo rechazaria con 409)', async () => {
    await seedBooking({
      status: 'pending_payment',
      stripeSessionExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bookingBody());
    // Comportamiento actual documentado: posible doble reserva sobre un pago en curso
    expect(res.status).toBe(201);
  });
});
