import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Stripe mockeado — solo nos interesa comprobar que se dispara (o no) el recordatorio,
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

let mongod: MongoMemoryServer;

// Fecha dentro de la ventana [medianoche del día objetivo, medianoche del día siguiente)
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         daysFromNow(3),
    checkOut:        daysFromNow(6),
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
});

describe('checkinService.sendSecondRemainingPaymentReminders (3 días antes)', () => {
  it('dispara si el check-in es exactamente dentro de 3 días y sigue sin pagar', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_3d', url: 'https://checkout.stripe.com/c/pay/cs_3d' });
    const booking = await seedBooking({ checkIn: daysFromNow(3) });

    await checkinService.sendSecondRemainingPaymentReminders();

    const updated = await BookingModel.findById(booking._id);
    expect(updated?.remainingPaymentReminder3dSentAt).toBeInstanceOf(Date);
    expect(updated?.remainingPaymentEmailSentAt).toBeInstanceOf(Date);
    expect(sessionCreateMock).toHaveBeenCalledTimes(1);
  });

  it('no dispara en días adyacentes (2 o 4 días antes)', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_x', url: 'https://checkout.stripe.com/c/pay/cs_x' });
    const near = await seedBooking({ checkIn: daysFromNow(2), guestEmail: 'near@example.com' });
    const far  = await seedBooking({ checkIn: daysFromNow(4), guestEmail: 'far@example.com' });

    await checkinService.sendSecondRemainingPaymentReminders();

    expect((await BookingModel.findById(near._id))?.remainingPaymentReminder3dSentAt).toBeUndefined();
    expect((await BookingModel.findById(far._id))?.remainingPaymentReminder3dSentAt).toBeUndefined();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('no dispara si remainingPaidAt ya tiene valor', async () => {
    const booking = await seedBooking({ checkIn: daysFromNow(3), remainingPaidAt: new Date() });

    await checkinService.sendSecondRemainingPaymentReminders();

    expect((await BookingModel.findById(booking._id))?.remainingPaymentReminder3dSentAt).toBeUndefined();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('no dispara dos veces — el centinela ya puesto lo bloquea en la segunda pasada', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_once', url: 'https://checkout.stripe.com/c/pay/cs_once' });
    await seedBooking({ checkIn: daysFromNow(3) });

    await checkinService.sendSecondRemainingPaymentReminders();
    await checkinService.sendSecondRemainingPaymentReminders();

    expect(sessionCreateMock).toHaveBeenCalledTimes(1);
  });
});

describe('checkinService.sendFinalRemainingPaymentReminders (1 día antes)', () => {
  it('dispara si el check-in es exactamente mañana y sigue sin pagar', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_1d', url: 'https://checkout.stripe.com/c/pay/cs_1d' });
    const booking = await seedBooking({ checkIn: daysFromNow(1) });

    await checkinService.sendFinalRemainingPaymentReminders();

    const updated = await BookingModel.findById(booking._id);
    expect(updated?.remainingPaymentReminder1dSentAt).toBeInstanceOf(Date);
    expect(sessionCreateMock).toHaveBeenCalledTimes(1);
  });

  it('no dispara en días adyacentes (hoy o pasado mañana)', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_x', url: 'https://checkout.stripe.com/c/pay/cs_x' });
    const today       = await seedBooking({ checkIn: daysFromNow(0), guestEmail: 'today@example.com' });
    const dayAfterNext = await seedBooking({ checkIn: daysFromNow(2), guestEmail: 'later@example.com' });

    await checkinService.sendFinalRemainingPaymentReminders();

    expect((await BookingModel.findById(today._id))?.remainingPaymentReminder1dSentAt).toBeUndefined();
    expect((await BookingModel.findById(dayAfterNext._id))?.remainingPaymentReminder1dSentAt).toBeUndefined();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('no dispara si remainingPaidAt ya tiene valor', async () => {
    const booking = await seedBooking({ checkIn: daysFromNow(1), remainingPaidAt: new Date() });

    await checkinService.sendFinalRemainingPaymentReminders();

    expect((await BookingModel.findById(booking._id))?.remainingPaymentReminder1dSentAt).toBeUndefined();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });

  it('no dispara dos veces — el centinela ya puesto lo bloquea en la segunda pasada', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_once', url: 'https://checkout.stripe.com/c/pay/cs_once' });
    await seedBooking({ checkIn: daysFromNow(1) });

    await checkinService.sendFinalRemainingPaymentReminders();
    await checkinService.sendFinalRemainingPaymentReminders();

    expect(sessionCreateMock).toHaveBeenCalledTimes(1);
  });

  it('dispara igual aunque el recordatorio de 3 días nunca se marcara (sin encadenamiento)', async () => {
    sessionCreateMock.mockResolvedValue({ id: 'cs_no_chain', url: 'https://checkout.stripe.com/c/pay/cs_no_chain' });
    const booking = await seedBooking({ checkIn: daysFromNow(1) }); // remainingPaymentReminder3dSentAt nunca se puso

    await checkinService.sendFinalRemainingPaymentReminders();

    expect((await BookingModel.findById(booking._id))?.remainingPaymentReminder1dSentAt).toBeInstanceOf(Date);
  });
});
