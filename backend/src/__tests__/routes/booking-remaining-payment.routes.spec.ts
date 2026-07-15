import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';

// Stripe mockeado — las validaciones (404/422/409) ocurren ANTES de llamar a Stripe;
// solo el happy path necesita una sesion simulada
vi.mock('../../config/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        expire: vi.fn(),
      },
    },
  },
}));

import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { stripe } from '../../config/stripe';
import { BookingModel, IBookingDocument } from '../../models/booking.model';

const sessionCreateMock = stripe.checkout.sessions.create as unknown as Mock;
const sessionExpireMock = stripe.checkout.sessions.expire as unknown as Mock;

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

let mongod: MongoMemoryServer;
let authToken: string;

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
  sessionCreateMock.mockReset();
  sessionExpireMock.mockReset();
});

describe('POST /api/v1/bookings/:id/remaining-payment', () => {
  it('sin Authorization → 401', async () => {
    const booking = await seedBooking();
    const res = await request(app).post(`/api/v1/bookings/${String(booking._id)}/remaining-payment`).send();
    expect(res.status).toBe(401);
  });

  it('id inexistente → 404', async () => {
    const res = await request(app)
      .post(`/api/v1/bookings/${new mongoose.Types.ObjectId()}/remaining-payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();
    expect(res.status).toBe(404);
  });

  it('reserva no confirmed → 422', async () => {
    const booking = await seedBooking({ status: 'pending_payment' });
    const res = await request(app)
      .post(`/api/v1/bookings/${String(booking._id)}/remaining-payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();
    expect(res.status).toBe(422);
  });

  it('resto ya pagado → 409', async () => {
    const booking = await seedBooking({ remainingPaidAt: new Date() });
    const res = await request(app)
      .post(`/api/v1/bookings/${String(booking._id)}/remaining-payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();
    expect(res.status).toBe(409);
  });

  it('caso normal → 201, crea sesión y marca remainingPaymentEmailSentAt', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_admin_1', url: 'https://checkout.stripe.com/c/pay/cs_admin_1' });
    const booking = await seedBooking();

    const res = await request(app)
      .post(`/api/v1/bookings/${String(booking._id)}/remaining-payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.data.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_admin_1');

    const updated = await BookingModel.findById(booking._id);
    expect(updated?.remainingPaymentEmailSentAt).toBeTruthy();
  });

  it('reenvío inmediato tras el primero → 201 de nuevo, expira la sesión anterior', async () => {
    sessionCreateMock
      .mockResolvedValueOnce({ id: 'cs_admin_old', url: 'https://checkout.stripe.com/c/pay/cs_admin_old' })
      .mockResolvedValueOnce({ id: 'cs_admin_new', url: 'https://checkout.stripe.com/c/pay/cs_admin_new' });
    sessionExpireMock.mockResolvedValue({ id: 'cs_admin_old', status: 'expired' });

    const booking = await seedBooking();
    const url = `/api/v1/bookings/${String(booking._id)}/remaining-payment`;

    const first  = await request(app).post(url).set('Authorization', `Bearer ${authToken}`).send();
    const second = await request(app).post(url).set('Authorization', `Bearer ${authToken}`).send();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_admin_new');
    expect(sessionExpireMock).toHaveBeenCalledWith('cs_admin_old');
  });
});
