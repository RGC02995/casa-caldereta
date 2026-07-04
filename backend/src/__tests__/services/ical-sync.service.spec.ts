import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

// OJO: ical-sync.service (via config/environment) congela process.env en el import.
// Se importa DINAMICAMENTE en beforeAll, cuando las URLs del fixture server ya existen.
// No importar aqui estaticamente nada que transite por config/environment.
let icalSyncService: { syncAll(): Promise<void> };

interface IFixtureResponse {
  status: number;
  body:   string;
}

interface IFixtureEvent {
  uid:   string;
  start: string; // YYYYMMDD
  end:   string; // YYYYMMDD (exclusivo, como exportan Airbnb/Booking)
}

function icsFeed(events: IFixtureEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fixture//Test//EN'];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      'DTSTAMP:20260701T000000Z',
      `DTSTART;VALUE=DATE:${event.start}`,
      `DTEND;VALUE=DATE:${event.end}`,
      'SUMMARY:Reserved',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

let airbnbResponse:  IFixtureResponse;
let bookingResponse: IFixtureResponse;

const fixtureServer = http.createServer((req, res) => {
  const target = req.url === '/airbnb.ics' ? airbnbResponse : bookingResponse;
  res.writeHead(target.status, { 'Content-Type': 'text/calendar; charset=utf-8' });
  res.end(target.body);
});

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise<void>(resolve => fixtureServer.listen(0, '127.0.0.1', resolve));
  const port = (fixtureServer.address() as AddressInfo).port;
  process.env['AIRBNB_ICAL_URL']  = `http://127.0.0.1:${port}/airbnb.ics`;
  process.env['BOOKING_ICAL_URL'] = `http://127.0.0.1:${port}/booking.ics`;

  ({ icalSyncService } = await import('../../services/ical-sync.service'));
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => fixtureServer.close(err => (err ? reject(err) : resolve())));
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  airbnbResponse  = { status: 200, body: icsFeed([]) };
  bookingResponse = { status: 200, body: icsFeed([]) };
});

afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

const AIRBNB_TWO_EVENTS: IFixtureEvent[] = [
  { uid: 'airbnb-evt-1', start: '20260810', end: '20260813' },
  { uid: 'airbnb-evt-2', start: '20260820', end: '20260822' },
];

describe('icalSyncService.syncAll — importacion de feeds Airbnb/Booking', () => {
  it('import inicial: feed airbnb con 2 VEVENTs → 2 bloqueos origin airbnb con externalUid y reason "Airbnb"', async () => {
    airbnbResponse = { status: 200, body: icsFeed(AIRBNB_TWO_EVENTS) };
    await icalSyncService.syncAll();

    const blocks = await BlockedPeriodModel.find({ origin: 'airbnb' }).sort({ startDate: 1 });
    expect(blocks).toHaveLength(2); // >0 tambien confirma que el import dinamico vio las URLs
    expect(blocks[0].externalUid).toBe('airbnb-evt-1');
    expect(blocks[0].reason).toBe('Airbnb');
    expect(await BlockedPeriodModel.countDocuments()).toBe(2);
  });

  it('idempotencia: una segunda sync identica no duplica bloqueos', async () => {
    airbnbResponse = { status: 200, body: icsFeed(AIRBNB_TWO_EVENTS) };
    await icalSyncService.syncAll();
    await icalSyncService.syncAll();

    expect(await BlockedPeriodModel.countDocuments({ origin: 'airbnb' })).toBe(2);
  });

  it('evento con mismo UID y fechas nuevas → actualiza el bloqueo existente sin crear otro', async () => {
    airbnbResponse = { status: 200, body: icsFeed([{ uid: 'airbnb-evt-1', start: '20260810', end: '20260813' }]) };
    await icalSyncService.syncAll();

    airbnbResponse = { status: 200, body: icsFeed([{ uid: 'airbnb-evt-1', start: '20260811', end: '20260814' }]) };
    await icalSyncService.syncAll();

    const blocks = await BlockedPeriodModel.find({ origin: 'airbnb' });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startDate.getDate()).toBe(11);
    expect(blocks[0].endDate.getDate()).toBe(14);
  });

  it('evento desaparecido del feed (reserva cancelada en la plataforma) → su bloqueo se elimina', async () => {
    airbnbResponse = { status: 200, body: icsFeed(AIRBNB_TWO_EVENTS) };
    await icalSyncService.syncAll();

    airbnbResponse = { status: 200, body: icsFeed([AIRBNB_TWO_EVENTS[0]]) };
    await icalSyncService.syncAll();

    const blocks = await BlockedPeriodModel.find({ origin: 'airbnb' });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].externalUid).toBe('airbnb-evt-1');
  });

  it('los bloqueos manuales sobreviven a la sincronizacion (deleteStale solo toca su origin)', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-05'),
      origin: 'manual', reason: 'Obras',
    });
    await icalSyncService.syncAll(); // ambos feeds vacios

    expect(await BlockedPeriodModel.countDocuments({ origin: 'manual' })).toBe(1);
  });

  it('HTTP 500 en el feed de airbnb → conserva sus bloqueos y booking se sincroniza igual', async () => {
    airbnbResponse = { status: 200, body: icsFeed(AIRBNB_TWO_EVENTS) };
    await icalSyncService.syncAll();

    airbnbResponse  = { status: 500, body: 'Internal Server Error' };
    bookingResponse = { status: 200, body: icsFeed([{ uid: 'booking-evt-1', start: '20260901', end: '20260903' }]) };
    await icalSyncService.syncAll();

    expect(await BlockedPeriodModel.countDocuments({ origin: 'airbnb' })).toBe(2);
    expect(await BlockedPeriodModel.countDocuments({ origin: 'booking' })).toBe(1);
  });

  it('feed corrupto con HTTP 200 (HTML de error) NO debe borrar los bloqueos existentes de la plataforma', async () => {
    airbnbResponse = { status: 200, body: icsFeed(AIRBNB_TWO_EVENTS) };
    await icalSyncService.syncAll();

    // Pagina de mantenimiento tipica: 200 + HTML → node-ical devuelve {} sin lanzar
    airbnbResponse = { status: 200, body: '<html><body>Service temporarily unavailable</body></html>' };
    await icalSyncService.syncAll();

    // Comportamiento correcto: ante un feed no interpretable, conservar los datos
    expect(await BlockedPeriodModel.countDocuments({ origin: 'airbnb' })).toBe(2);
  });

  it('VEVENT sin UID o sin fechas → ignorado sin romper la sincronizacion', async () => {
    const feedWithInvalid = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fixture//Test//EN',
      // Evento sin UID
      'BEGIN:VEVENT', 'DTSTAMP:20260701T000000Z',
      'DTSTART;VALUE=DATE:20260901', 'DTEND;VALUE=DATE:20260903',
      'SUMMARY:Sin uid', 'END:VEVENT',
      // Evento valido
      'BEGIN:VEVENT', 'UID:valido-1', 'DTSTAMP:20260701T000000Z',
      'DTSTART;VALUE=DATE:20260910', 'DTEND;VALUE=DATE:20260912',
      'SUMMARY:Valido', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    airbnbResponse = { status: 200, body: feedWithInvalid };

    await icalSyncService.syncAll();

    const blocks = await BlockedPeriodModel.find({ origin: 'airbnb' });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].externalUid).toBe('valido-1');
  });

  it('HALLAZGO: mismo UID en airbnb y booking → el upsert global por externalUid lo "roba" (last-write-wins, cambia el origin)', async () => {
    airbnbResponse = { status: 200, body: icsFeed([{ uid: 'uid-compartido', start: '20260810', end: '20260813' }]) };
    await icalSyncService.syncAll();
    expect((await BlockedPeriodModel.findOne({ externalUid: 'uid-compartido' }))?.origin).toBe('airbnb');

    airbnbResponse  = { status: 200, body: icsFeed([]) };
    bookingResponse = { status: 200, body: icsFeed([{ uid: 'uid-compartido', start: '20260810', end: '20260813' }]) };
    await icalSyncService.syncAll();

    // Comportamiento actual documentado: un solo documento cuyo origin cambia de plataforma
    const docs = await BlockedPeriodModel.find({ externalUid: 'uid-compartido' });
    expect(docs).toHaveLength(1);
    expect(docs[0].origin).toBe('booking');
  });

  it('DTEND;VALUE=DATE es exclusivo: evento 10→13 ago guarda endDate dia 13 (los manuales son inclusivos — asimetria documentada)', async () => {
    airbnbResponse = { status: 200, body: icsFeed([{ uid: 'airbnb-evt-1', start: '20260810', end: '20260813' }]) };
    await icalSyncService.syncAll();

    const block = await BlockedPeriodModel.findOne({ externalUid: 'airbnb-evt-1' });
    expect(block?.startDate.getFullYear()).toBe(2026);
    expect(block?.startDate.getMonth()).toBe(7);
    expect(block?.startDate.getDate()).toBe(10);
    // node-ical parsea VALUE=DATE a medianoche local → dia 13 exclusivo tal cual
    expect(block?.endDate.getDate()).toBe(13);
  });
});
