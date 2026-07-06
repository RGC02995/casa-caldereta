import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';

// Stripe mockeado — solo nos interesa comprobar que se expira la sesion tras un
// conflicto detectado en la revalidacion, no llamar a Stripe de verdad.
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

import { bookingService, ICreateBookingData } from '../../services/booking.service';
import { stripe } from '../../config/stripe';
import { BookingModel } from '../../models/booking.model';

const sessionCreateMock = stripe.checkout.sessions.create as unknown as Mock;
const sessionExpireMock = stripe.checkout.sessions.expire as unknown as Mock;

let mongod: MongoMemoryServer;

// Agosto 2026: lun 10, mar 11, mié 12, jue 13
function bookingData(overrides: Partial<ICreateBookingData> = {}): ICreateBookingData {
  return {
    checkIn:    '2026-08-10',
    checkOut:   '2026-08-13',
    guestName:  'Huesped de prueba',
    guestEmail: 'huesped@example.com',
    guestPhone: '+34 600 111 222',
    guests:     2,
    ...overrides,
  };
}

async function seedConfirmedBooking(): Promise<mongoose.Types.ObjectId> {
  const doc = await BookingModel.create({
    checkIn: new Date('2026-08-10'), checkOut: new Date('2026-08-13'),
    guestName: 'Competidor', guestEmail: 'competidor@example.com', guestPhone: '+34600000001',
    guests: 2, totalPrice: 300, depositAmount: 150, remainingAmount: 150, status: 'confirmed',
  });
  return doc._id;
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
  vi.restoreAllMocks();
  sessionCreateMock.mockReset();
  sessionExpireMock.mockReset();
});

describe('Condicion de carrera en creacion de reservas — Opcion B (guardar y revalidar)', () => {
  it('create(): se cancela si un competidor con _id anterior gano la carrera', async () => {
    // La reserva competidora ya existe en la base de datos (se "creo antes": su _id es menor).
    const competitorId = await seedConfirmedBooking();

    // Forzamos que la comprobacion PREVIA al guardado no vea el conflicto — simula que
    // ambas peticiones comprobaron disponibilidad "a la vez", antes de que ninguna guardase nada.
    vi.spyOn(BookingModel, 'findOne').mockImplementationOnce(() => Promise.resolve(null) as never);

    await expect(bookingService.create(bookingData()))
      .rejects.toMatchObject({ code: 'DATE_CONFLICT' });

    // No debe quedar huerfana la reserva que intentamos crear — solo sigue la del competidor.
    const all = await BookingModel.find({});
    expect(all).toHaveLength(1);
    expect(String(all[0]!._id)).toBe(String(competitorId));
  });

  it('create(): no se autocancela si el competidor solapado tiene un _id posterior (creado despues)', async () => {
    const futureId = Types.ObjectId.createFromTime(Math.floor(Date.now() / 1000) + 3600);
    await BookingModel.create({
      _id: futureId,
      checkIn: new Date('2026-08-10'), checkOut: new Date('2026-08-13'),
      guestName: 'Competidor futuro', guestEmail: 'futuro@example.com', guestPhone: '+34600000002',
      guests: 2, totalPrice: 300, depositAmount: 150, remainingAmount: 150, status: 'confirmed',
    });

    vi.spyOn(BookingModel, 'findOne').mockImplementationOnce(() => Promise.resolve(null) as never);

    const result = await bookingService.create(bookingData());
    expect(result.status).toBe('pending');

    // Ambas reservas siguen existiendo — la nuestra no se cancelo pese al solape,
    // porque el competidor se creo "despues" (id mayor) y no cuenta para nuestro desempate.
    const all = await BookingModel.find({});
    expect(all).toHaveLength(2);
  });

  it('createCheckoutSession(): expira la sesion de Stripe si se detecta conflicto tras guardar', async () => {
    sessionCreateMock.mockResolvedValue({
      id:  'cs_test_race',
      url: 'https://checkout.stripe.com/c/pay/cs_test_race',
    });
    sessionExpireMock.mockResolvedValue({ id: 'cs_test_race', status: 'expired' });

    const competitorId = await seedConfirmedBooking();

    vi.spyOn(BookingModel, 'findOne').mockImplementationOnce(() => Promise.resolve(null) as never);

    await expect(bookingService.createCheckoutSession(bookingData()))
      .rejects.toMatchObject({ code: 'DATE_CONFLICT' });

    expect(sessionExpireMock).toHaveBeenCalledWith('cs_test_race');

    const all = await BookingModel.find({});
    expect(all).toHaveLength(1);
    expect(String(all[0]!._id)).toBe(String(competitorId));
  });
});
