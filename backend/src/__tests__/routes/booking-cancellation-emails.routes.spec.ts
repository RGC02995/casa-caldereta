import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';

// El reembolso llama a stripe.refunds.create — se mockea para no requerir una clave real ni red.
vi.mock('../../config/stripe', () => ({
  stripe: {
    refunds:  { create: vi.fn().mockResolvedValue({ id: 're_test' }) },
    checkout: { sessions: { expire: vi.fn().mockResolvedValue({}) } },
  },
}));

import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { BookingModel, IBookingDocument } from '../../models/booking.model';
import { emailService } from '../../services/email.service';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

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
  vi.restoreAllMocks();
});

describe('DELETE /api/v1/bookings/:id — email al propietario', () => {
  it('200 y llama a notifyOwnerBookingDeleted con la reserva eliminada', async () => {
    const spy     = vi.spyOn(emailService, 'notifyOwnerBookingDeleted').mockResolvedValue(undefined);
    const booking = await seedBooking();

    const res = await request(app)
      .delete(`/api/v1/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ id: String(booking._id), guestName: 'Huésped Existente' });
  });

  it('id inexistente → 404, no llama al email', async () => {
    const spy = vi.spyOn(emailService, 'notifyOwnerBookingDeleted').mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/v1/bookings/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/bookings/:id/status — email al propietario solo al cancelar', () => {
  it("status: 'cancelled' → llama a notifyOwnerBookingCancelled", async () => {
    const spy     = vi.spyOn(emailService, 'notifyOwnerBookingCancelled').mockResolvedValue(undefined);
    vi.spyOn(emailService, 'sendGuestStatusUpdate').mockResolvedValue(undefined);
    const booking = await seedBooking();

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ id: String(booking._id) });
  });

  it("status: 'confirmed' → NO llama a notifyOwnerBookingCancelled", async () => {
    const spy     = vi.spyOn(emailService, 'notifyOwnerBookingCancelled').mockResolvedValue(undefined);
    vi.spyOn(emailService, 'sendGuestStatusUpdate').mockResolvedValue(undefined);
    const booking = await seedBooking({ status: 'pending' });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/bookings/:id/refund — email al propietario', () => {
  it('200 y llama a notifyOwnerRefundProcessed con el importe correcto', async () => {
    const ownerSpy = vi.spyOn(emailService, 'notifyOwnerRefundProcessed').mockResolvedValue(undefined);
    vi.spyOn(emailService, 'sendGuestRefundCancellation').mockResolvedValue(undefined);
    const booking = await seedBooking({ stripePaymentIntentId: 'pi_test_123' });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking._id}/refund`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 150 });

    expect(res.status).toBe(200);
    expect(ownerSpy).toHaveBeenCalledTimes(1);
    expect(ownerSpy.mock.calls[0]?.[0]).toMatchObject({ id: String(booking._id) });
    expect(ownerSpy.mock.calls[0]?.[1]).toBe(150);
  });
});

describe('POST /api/v1/bookings/:id/cancel-pending — email al propietario', () => {
  it('reserva pending_payment → 200 y llama a notifyOwnerGuestCancelledPending', async () => {
    const spy     = vi.spyOn(emailService, 'notifyOwnerGuestCancelledPending').mockResolvedValue(undefined);
    const booking = await seedBooking({ status: 'pending_payment', holdExpiresAt: new Date(Date.now() + 60_000) });

    const res = await request(app).post(`/api/v1/bookings/${booking._id}/cancel-pending`);

    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toMatchObject({ id: String(booking._id) });
  });

  it('reserva ya confirmed → 404, no llama al email', async () => {
    const spy     = vi.spyOn(emailService, 'notifyOwnerGuestCancelledPending').mockResolvedValue(undefined);
    const booking = await seedBooking({ status: 'confirmed' });

    const res = await request(app).post(`/api/v1/bookings/${booking._id}/cancel-pending`);

    expect(res.status).toBe(404);
    expect(spy).not.toHaveBeenCalled();
  });
});
