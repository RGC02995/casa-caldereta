import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Stripe mockeado — solo nos interesa comprobar que se crea/expira la sesion correcta,
// no llamar a Stripe de verdad. El email real tampoco sale (sin RESEND_API_KEY en test).
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

import { checkinService } from '../../services/checkin.service';
import { stripe } from '../../config/stripe';
import { BookingModel, IBookingDocument } from '../../models/booking.model';

const sessionCreateMock = stripe.checkout.sessions.create as unknown as Mock;
const sessionExpireMock = stripe.checkout.sessions.expire as unknown as Mock;

let mongod: MongoMemoryServer;

async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         new Date('2026-08-10'),
    checkOut:        new Date('2026-08-13'),
    guestName:       'Huésped Prueba',
    guestEmail:      'huesped@example.com',
    guestPhone:      '+34 600 111 222',
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

describe('checkinService.sendRemainingPaymentEmailNow', () => {
  it('crea sesión de Stripe y marca remainingPaymentEmailSentAt', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });

    const booking = await seedBooking();
    const result   = await checkinService.sendRemainingPaymentEmailNow(String(booking._id));

    expect(result.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(result.remainingAmount).toBe(150);

    const updated = await BookingModel.findById(booking._id);
    expect(updated?.remainingPaymentEmailSentAt).toBeInstanceOf(Date);
    expect(updated?.stripeRemainingSessionId).toBe('cs_test_1');
  });

  it('permite reenviar aunque remainingPaymentEmailSentAt ya estuviera marcado — expira la sesión anterior', async () => {
    sessionCreateMock
      .mockResolvedValueOnce({ id: 'cs_test_old', url: 'https://checkout.stripe.com/c/pay/cs_test_old' })
      .mockResolvedValueOnce({ id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new' });
    sessionExpireMock.mockResolvedValue({ id: 'cs_test_old', status: 'expired' });

    const booking = await seedBooking();

    await checkinService.sendRemainingPaymentEmailNow(String(booking._id));
    const result2 = await checkinService.sendRemainingPaymentEmailNow(String(booking._id));

    expect(sessionExpireMock).toHaveBeenCalledWith('cs_test_old');
    expect(result2.sessionUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_new');

    const updated = await BookingModel.findById(booking._id);
    expect(updated?.stripeRemainingSessionId).toBe('cs_test_new');
  });

  it('lanza ALREADY_PAID si remainingPaidAt ya tiene valor', async () => {
    const booking = await seedBooking({ remainingPaidAt: new Date() });

    await expect(checkinService.sendRemainingPaymentEmailNow(String(booking._id)))
      .rejects.toMatchObject({ code: 'ALREADY_PAID' });

    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('lanza INVALID_STATUS si la reserva no está confirmed', async () => {
    const booking = await seedBooking({ status: 'pending_payment' });

    await expect(checkinService.sendRemainingPaymentEmailNow(String(booking._id)))
      .rejects.toMatchObject({ code: 'INVALID_STATUS' });

    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('lanza NOT_FOUND si la reserva no existe', async () => {
    await expect(checkinService.sendRemainingPaymentEmailNow(String(new mongoose.Types.ObjectId())))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
