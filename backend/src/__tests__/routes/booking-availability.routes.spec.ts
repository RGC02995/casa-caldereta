import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { BookingModel, IBookingDocument } from '../../models/booking.model';

// Mini app Express para tests — sin listen(), sin crons, sin Stripe webhook
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

// IP única por petición para que publicRateLimiter (30/min) no interfiera entre tests
let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.1.${Math.floor(ipCounter / 200)}.${ipCounter % 200}`;
}

const IN_10_MIN  = () => new Date(Date.now() + 10 * 60 * 1000);
const AGO_10_MIN = () => new Date(Date.now() - 10 * 60 * 1000);

// Agosto 2026: lun 10, mar 11, mié 12, jue 13, vie 14, sáb 15, dom 16
async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         new Date('2026-08-10'),
    checkOut:        new Date('2026-08-13'),
    guestName:       'NOMBRE-SECRETO Test',
    guestEmail:      'secreto@example.com',
    guestPhone:      '+34999888777',
    guests:          2,
    totalPrice:      300,
    depositAmount:   150,
    remainingAmount: 150,
    status:          'confirmed',
    ...overrides,
  });
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

describe('GET /api/v1/bookings/availability', () => {
  it('publico sin token → 200 con array', async () => {
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('devuelve solo checkIn/checkOut — sin PII (nombre, email, telefono, notas, _id)', async () => {
    await seedBooking({ notes: 'NOTA-PRIVADA del huesped' });
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(['checkIn', 'checkOut']);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('NOMBRE-SECRETO');
    expect(raw).not.toContain('secreto@example.com');
    expect(raw).not.toContain('+34999888777');
    expect(raw).not.toContain('NOTA-PRIVADA');
  });

  it('incluye reservas pending y confirmed', async () => {
    await seedBooking({ status: 'pending' });
    await seedBooking({ status: 'confirmed', checkIn: new Date('2026-08-17'), checkOut: new Date('2026-08-19') });
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.body.data).toHaveLength(2);
  });

  it('incluye pending_payment con sesion Stripe viva', async () => {
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: IN_10_MIN() });
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.body.data).toHaveLength(1);
  });

  it('excluye pending_payment con sesion caducada', async () => {
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: AGO_10_MIN() });
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.body.data).toHaveLength(0);
  });

  it('excluye cancelled y completed', async () => {
    await seedBooking({ status: 'cancelled' });
    await seedBooking({ status: 'completed', checkIn: new Date('2026-08-17'), checkOut: new Date('2026-08-19') });
    const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', nextIp());
    expect(res.body.data).toHaveLength(0);
  });

  it('publicRateLimiter: la peticion 31 desde la misma IP → 429', async () => {
    const sameIp = '10.200.0.1';
    for (let i = 0; i < 30; i++) {
      const res = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', sameIp);
      expect(res.status).toBe(200);
    }
    const blocked = await request(app).get('/api/v1/bookings/availability').set('X-Forwarded-For', sameIp);
    expect(blocked.status).toBe(429);
  });
});

describe('GET /api/v1/bookings/price-estimate', () => {
  it('lunes a miercoles (2 noches) con 2 personas → 200 y total 200 € (100 €/noche)', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/price-estimate')
      .query({ checkIn: '2026-08-10', checkOut: '2026-08-12', guests: '2' })
      .set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(200);
    expect(res.body.data.totalPrice).toBe(200);
    expect(res.body.data.depositAmount).toBe(100);
    expect(res.body.data.remainingAmount).toBe(100);
    expect(res.body.data.nights).toBe(2);
  });

  it('checkIn en domingo → 400 (SUNDAY_CLOSED)', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/price-estimate')
      .query({ checkIn: '2026-08-16', checkOut: '2026-08-18', guests: '2' })
      .set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(400);
  });

  it('guests=0 → 400 y guests=7 → 400', async () => {
    for (const guests of ['0', '7']) {
      const res = await request(app)
        .get('/api/v1/bookings/price-estimate')
        .query({ checkIn: '2026-08-10', checkOut: '2026-08-12', guests })
        .set('X-Forwarded-For', nextIp());
      expect(res.status).toBe(400);
    }
  });

  it('sin checkIn/checkOut → 400', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/price-estimate')
      .set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(400);
  });

  it('checkOut anterior al checkIn → 400 (INVALID_DATES)', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/price-estimate')
      .query({ checkIn: '2026-08-12', checkOut: '2026-08-10', guests: '2' })
      .set('X-Forwarded-For', nextIp());
    expect(res.status).toBe(400);
  });
});
