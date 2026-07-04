import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';

// Stripe mockeado — las validaciones (400/409) ocurren ANTES de llamar a Stripe;
// solo el happy path necesita una sesion simulada
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
import { stripe } from '../../config/stripe';
import { BookingModel, IBookingDocument } from '../../models/booking.model';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

const sessionCreateMock = stripe.checkout.sessions.create as unknown as Mock;

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

// IP única por petición — checkoutRateLimiter permite solo 3 req/5min por IP
let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.2.${Math.floor(ipCounter / 200)}.${ipCounter % 200}`;
}

// Agosto 2026: lun 10, mar 11, mié 12, jue 13, vie 14, sáb 15, dom 16
function checkoutBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    checkIn:    '2026-08-10',
    checkOut:   '2026-08-13',
    guestName:  'Juan Pérez',
    guestEmail: 'juan@example.com',
    guestPhone: '+34 600 111 222',
    guests:     2,
    ...overrides,
  };
}

async function postCheckout(body: Record<string, unknown>): Promise<request.Response> {
  return request(app)
    .post('/api/v1/bookings/checkout')
    .set('X-Forwarded-For', nextIp())
    .send(body);
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

const IN_10_MIN  = () => new Date(Date.now() + 10 * 60 * 1000);
const AGO_10_MIN = () => new Date(Date.now() - 10 * 60 * 1000);

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
    id:  'cs_test_123',
    url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  });
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

describe('POST /api/v1/bookings/checkout — happy path', () => {
  it('fechas libres → 201 + sessionUrl + reserva pending_payment con expiracion de sesion', async () => {
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(201);
    expect(res.body.data.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    expect(res.body.data.bookingId).toBeDefined();
    expect(sessionCreateMock).toHaveBeenCalledTimes(1);

    const saved = await BookingModel.findById(res.body.data.bookingId);
    expect(saved?.status).toBe('pending_payment');
    expect(saved?.stripeSessionId).toBe('cs_test_123');
    expect(saved?.stripeSessionExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    // deposito = 50 % del total
    expect(saved?.depositAmount).toBe((saved?.totalPrice ?? 0) / 2);
  });
});

describe('POST /api/v1/bookings/checkout — conflictos de fechas (409)', () => {
  it('solape exacto con reserva confirmed → 409', async () => {
    await seedBooking();
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(409);
  });

  it('solape parcial (entra antes, sale dentro) → 409', async () => {
    await seedBooking({ checkIn: new Date('2026-08-12'), checkOut: new Date('2026-08-15') });
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-10', checkOut: '2026-08-13' }));
    expect(res.status).toBe(409);
  });

  it('rango contenido dentro de una reserva existente → 409', async () => {
    await seedBooking({ checkIn: new Date('2026-08-10'), checkOut: new Date('2026-08-15') });
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-11', checkOut: '2026-08-13' }));
    expect(res.status).toBe(409);
  });

  it('rango que envuelve una reserva existente → 409', async () => {
    await seedBooking({ checkIn: new Date('2026-08-11'), checkOut: new Date('2026-08-12') });
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-10', checkOut: '2026-08-14' }));
    expect(res.status).toBe(409);
  });

  it('half-open: nuevo checkIn == checkOut existente (mismo dia rotacion) → 201', async () => {
    await seedBooking(); // sale el 13
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-13', checkOut: '2026-08-15' }));
    expect(res.status).toBe(201);
  });

  it('half-open: nuevo checkOut == checkIn existente → 201', async () => {
    await seedBooking({ checkIn: new Date('2026-08-13'), checkOut: new Date('2026-08-15') });
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-11', checkOut: '2026-08-13' }));
    expect(res.status).toBe(201);
  });

  it('pending_payment con sesion Stripe viva → 409 (fechas retenidas durante el pago)', async () => {
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: IN_10_MIN() });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(409);
  });

  it('pending_payment con sesion caducada → 201 (fechas liberadas)', async () => {
    await seedBooking({ status: 'pending_payment', stripeSessionExpiresAt: AGO_10_MIN() });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(201);
  });

  it('reserva cancelled no bloquea → 201', async () => {
    await seedBooking({ status: 'cancelled' });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/bookings/checkout — bloqueos de calendario (409)', () => {
  it('bloqueo manual solapado → 409', async () => {
    await BlockedPeriodModel.create({ startDate: new Date('2026-08-11'), endDate: new Date('2026-08-12'), origin: 'manual' });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(409);
  });

  it('bloqueo importado de airbnb solapado → 409', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-11'), endDate: new Date('2026-08-12'),
      origin: 'airbnb', externalUid: 'airbnb-uid-1',
    });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(409);
  });

  it('bloqueo importado de booking solapado → 409', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-11'), endDate: new Date('2026-08-12'),
      origin: 'booking', externalUid: 'booking-uid-1',
    });
    const res = await postCheckout(checkoutBody());
    expect(res.status).toBe(409);
  });

  it('HALLAZGO: checkIn en el dia endDate de un bloqueo manual → 201 (backend trata endDate como exclusivo; el admin lo pinta inclusivo)', async () => {
    await BlockedPeriodModel.create({ startDate: new Date('2026-08-10'), endDate: new Date('2026-08-12'), origin: 'manual' });
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-12', checkOut: '2026-08-14' }));
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/bookings/checkout — validacion de entrada (400, sin llegar a Stripe)', () => {
  it('checkIn en domingo → 400 SUNDAY_CLOSED', async () => {
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-16', checkOut: '2026-08-18' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('checkOut igual o anterior al checkIn → 400', async () => {
    const res = await postCheckout(checkoutBody({ checkIn: '2026-08-13', checkOut: '2026-08-13' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('fecha no parseable → 400', async () => {
    const res = await postCheckout(checkoutBody({ checkIn: 'no-es-fecha' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('guests fuera de rango o de tipo invalido (0, 7, "2", 2.5) → 400', async () => {
    for (const guests of [0, 7, '2', 2.5]) {
      const res = await postCheckout(checkoutBody({ guests }));
      expect(res.status).toBe(400);
    }
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('email invalido → 400', async () => {
    const res = await postCheckout(checkoutBody({ guestEmail: 'no-es-email' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('telefono invalido → 400', async () => {
    const res = await postCheckout(checkoutBody({ guestPhone: '12' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('nombre de 1 caracter → 400', async () => {
    const res = await postCheckout(checkoutBody({ guestName: 'J' }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('notes de mas de 500 caracteres → 400', async () => {
    const res = await postCheckout(checkoutBody({ notes: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('inyeccion NoSQL en checkIn (objeto en lugar de string) → 400, no 500', async () => {
    const res = await postCheckout(checkoutBody({ checkIn: { $gt: '' } }));
    expect(res.status).toBe(400);
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/bookings/checkout — rate limiting', () => {
  it('checkoutRateLimiter: la 4a peticion desde la misma IP → 429', async () => {
    const sameIp = '10.201.0.1';
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/bookings/checkout')
        .set('X-Forwarded-For', sameIp)
        .send({}); // 400 por validacion, pero cuenta para el limiter
      expect(res.status).toBe(400);
    }
    const blocked = await request(app)
      .post('/api/v1/bookings/checkout')
      .set('X-Forwarded-For', sameIp)
      .send({});
    expect(blocked.status).toBe(429);
  });
});
