import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Stripe mockeado — comprobamos que se expira la sesión al limpiar, sin llamar a Stripe de verdad.
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

import { bookingService } from '../../services/booking.service';
import { stripe } from '../../config/stripe';
import { BookingModel, IBookingDocument } from '../../models/booking.model';

const sessionExpireMock = stripe.checkout.sessions.expire as unknown as Mock;

const IN_10_MIN  = (): Date => new Date(Date.now() + 10 * 60 * 1000);
const AGO_10_MIN = (): Date => new Date(Date.now() - 10 * 60 * 1000);

let mongod: MongoMemoryServer;

async function seedBooking(overrides: Partial<IBookingDocument> = {}): Promise<IBookingDocument> {
  return BookingModel.create({
    checkIn:         new Date('2026-08-10'),
    checkOut:        new Date('2026-08-13'),
    guestName:       'Huésped',
    guestEmail:      'huesped@example.com',
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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
  sessionExpireMock.mockReset();
});

describe('cleanupExpiredPendingPayments()', () => {
  it('borra las pending_payment con bloqueo caducado y expira su sesión de Stripe', async () => {
    const expired = await seedBooking({
      status: 'pending_payment', holdExpiresAt: AGO_10_MIN(), stripeSessionId: 'cs_caducada',
    });

    const removed = await bookingService.cleanupExpiredPendingPayments();

    expect(removed).toBe(1);
    expect(await BookingModel.findById(expired._id)).toBeNull();
    expect(sessionExpireMock).toHaveBeenCalledWith('cs_caducada');
  });

  it('NO toca pending_payment con bloqueo vivo ni reservas confirmadas', async () => {
    await seedBooking({ status: 'pending_payment', holdExpiresAt: IN_10_MIN(), stripeSessionId: 'cs_viva' });
    await seedBooking({ status: 'confirmed', checkIn: new Date('2026-08-17'), checkOut: new Date('2026-08-19') });

    const removed = await bookingService.cleanupExpiredPendingPayments();

    expect(removed).toBe(0);
    expect(await BookingModel.countDocuments()).toBe(2);
    expect(sessionExpireMock).not.toHaveBeenCalled();
  });

  it('si expire() de Stripe falla, borra la reserva igualmente (best-effort)', async () => {
    sessionExpireMock.mockRejectedValue(new Error('ya expirada'));
    const expired = await seedBooking({
      status: 'pending_payment', holdExpiresAt: AGO_10_MIN(), stripeSessionId: 'cs_error',
    });

    const removed = await bookingService.cleanupExpiredPendingPayments();

    expect(removed).toBe(1);
    expect(await BookingModel.findById(expired._id)).toBeNull();
  });
});

describe('confirmDepositPayment() — defensivo', () => {
  it('sesión sin reserva asociada → not_found', async () => {
    const result = await bookingService.confirmDepositPayment('cs_inexistente', 'pi_1');
    expect(result.outcome).toBe('not_found');
  });

  it('reserva pending_payment sin conflicto → confirmed', async () => {
    await seedBooking({ status: 'pending_payment', holdExpiresAt: IN_10_MIN(), stripeSessionId: 'cs_ok' });
    const result = await bookingService.confirmDepositPayment('cs_ok', 'pi_ok');
    expect(result.outcome).toBe('confirmed');
    if (result.outcome === 'confirmed') {
      expect(result.booking.status).toBe('confirmed');
      expect(result.booking.stripePaymentIntentId).toBe('pi_ok');
    }
  });

  it('reserva ya confirmada → already_confirmed (idempotente)', async () => {
    await seedBooking({ status: 'confirmed', stripeSessionId: 'cs_dup' });
    const result = await bookingService.confirmDepositPayment('cs_dup', 'pi_dup');
    expect(result.outcome).toBe('already_confirmed');
  });

  it('otra reserva ocupó las fechas mientras tanto → conflict + marca cancelled', async () => {
    // Reserva confirmada de OTRO huésped con fechas solapadas.
    await seedBooking({ status: 'confirmed', guestEmail: 'otro@example.com' });
    // La pending_payment tardía que intenta confirmarse sobre las mismas fechas.
    const late = await seedBooking({ status: 'pending_payment', holdExpiresAt: AGO_10_MIN(), stripeSessionId: 'cs_tarde' });

    const result = await bookingService.confirmDepositPayment('cs_tarde', 'pi_tarde');

    expect(result.outcome).toBe('conflict');
    const reloaded = await BookingModel.findById(late._id);
    expect(reloaded?.status).toBe('cancelled');
  });
});
