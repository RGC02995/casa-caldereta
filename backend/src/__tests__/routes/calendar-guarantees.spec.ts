/**
 * PRUEBA DE GARANTÍAS DEL CALENDARIO (end-to-end, código real)
 *
 * Demuestra, contra un MongoDB efímero y feeds Airbnb/Booking simulados (node-ical real,
 * sin mocks del parser), las tres garantías que importan al negocio:
 *
 *   1. Las reservas de la WEB (Stripe/manuales) SE EXPORTAN en /calendar.ics → Airbnb/Booking las ven.
 *   2. Lo que llega de Airbnb/Booking entra como bloqueo y SE RE-EXPORTA a la otra plataforma (viceversa).
 *   3. Ninguna sincronización borra un bloqueo de una fecha FUTURA, ni con feed vacío, corrupto o parcial.
 *      (Solo se limpian automáticamente los bloqueos ya pasados.)
 *
 * Imprime un informe con las evidencias reales (el .ics generado y los conteos antes/después).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { Request, Response } from 'express';

// OJO: services/controllers transitan config/environment, que CONGELA process.env al importarse.
// Las URLs de los feeds se ponen ANTES y todo se importa DINÁMICAMENTE en beforeAll.
/* eslint-disable @typescript-eslint/no-explicit-any */
let icalSyncService: { syncAll(): Promise<void> };
let icalExportHandler: (req: Request, res: Response) => Promise<void>;
let BlockedPeriodModel: any;
let BookingModel: any;
let exportToken: string;

interface IFixtureResponse { status: number; body: string }
interface IFixtureEvent { uid: string; start: string; end: string }

function icsFeed(events: IFixtureEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fixture//Test//EN'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT', `UID:${e.uid}`, 'DTSTAMP:20260701T000000Z',
      `DTSTART;VALUE=DATE:${e.start}`, `DTEND;VALUE=DATE:${e.end}`,
      'SUMMARY:Reserved', 'END:VEVENT',
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

/** Invoca el handler REAL de exportación con un res simulado y devuelve el .ics. */
function callExport(token: string): Promise<{ status: number; text: string }> {
  return new Promise(resolve => {
    const req = { query: { token } } as unknown as Request;
    const res = {
      statusCode: 200,
      setHeader() { /* no-op */ },
      status(code: number) { this.statusCode = code; return this; },
      send(body: unknown) { resolve({ status: this.statusCode, text: String(body) }); return this; },
      json(obj: unknown) { resolve({ status: this.statusCode, text: JSON.stringify(obj) }); return this; },
    } as unknown as Response & { statusCode: number };
    void icalExportHandler(req, res);
  });
}

async function countByOrigin(origin: string): Promise<number> {
  return BlockedPeriodModel.countDocuments({ origin });
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await new Promise<void>(resolve => fixtureServer.listen(0, '127.0.0.1', resolve));
  const port = (fixtureServer.address() as AddressInfo).port;
  process.env['AIRBNB_ICAL_URL']  = `http://127.0.0.1:${port}/airbnb.ics`;
  process.env['BOOKING_ICAL_URL'] = `http://127.0.0.1:${port}/booking.ics`;

  ({ icalSyncService } = await import('../../services/ical-sync.service'));
  ({ icalExportHandler } = await import('../../controllers/ical-export.controller'));
  ({ BlockedPeriodModel } = await import('../../models/blocked-period.model'));
  ({ BookingModel } = await import('../../models/booking.model'));
  ({ env: { icalExportToken: exportToken } } = await import('../../config/environment') as any);
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => fixtureServer.close(err => (err ? reject(err) : resolve())));
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Garantías del calendario: exportación ⇄ importación sin pérdida de fechas', () => {
  it('exporta reservas de la web + re-exporta Airbnb/Booking, y ninguna sync degradada borra fechas futuras', async () => {
    const log = (m: string): void => { console.log(m); };

    // ── PASO 0 — Estado de partida ──────────────────────────────────────────────
    // Una reserva hecha en la WEB (confirmada, como una de Stripe) + un bloqueo manual del propietario.
    const webBooking = await BookingModel.create({
      checkIn: new Date('2026-08-10'), checkOut: new Date('2026-08-13'),
      guestName: 'María López', guestEmail: 'maria@example.com', guestPhone: '+34 600 555 666', guests: 2,
      totalPrice: 300, depositAmount: 150, remainingAmount: 150, status: 'confirmed',
    });
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'),
      origin: 'manual', reason: 'Uso propietario',
    });
    log('\n════════ PASO 0 — Estado de partida ════════');
    log(`  · Reserva WEB (confirmada): 10→13 ago 2026  (id ${webBooking._id})`);
    log('  · Bloqueo MANUAL propietario: 20→22 ago 2026');

    // ── PASO 1 — IMPORTACIÓN (Airbnb/Booking → nuestra BD) ──────────────────────
    // Airbnb tiene 2 reservas, Booking 1. La sync real las descarga y las guarda.
    airbnbResponse  = { status: 200, body: icsFeed([
      { uid: 'airbnb-1', start: '20260901', end: '20260903' },
      { uid: 'airbnb-2', start: '20260910', end: '20260912' },
    ]) };
    bookingResponse = { status: 200, body: icsFeed([
      { uid: 'booking-1', start: '20260915', end: '20260917' },
    ]) };
    await icalSyncService.syncAll();

    expect(await countByOrigin('airbnb')).toBe(2);
    expect(await countByOrigin('booking')).toBe(1);
    log('\n════════ PASO 1 — IMPORTACIÓN (Airbnb/Booking → BD) ════════');
    log('  · Airbnb: 1→3 sep y 10→12 sep  →  2 bloqueos creados ✅');
    log('  · Booking: 15→17 sep           →  1 bloqueo creado ✅');

    // ── PASO 2 — EXPORTACIÓN (/calendar.ics real) ───────────────────────────────
    const feed1 = await callExport(exportToken);
    expect(feed1.status).toBe(200);

    // La reserva de la WEB sale como "Reservado" con sus fechas exactas.
    expect(feed1.text).toContain(`UID:booking-${String(webBooking._id)}@casa-caldereta.com`);
    expect(feed1.text).toContain('SUMMARY:Reservado');
    expect(feed1.text).toMatch(/DTSTART;VALUE=DATE:20260810[\s\S]*?DTEND;VALUE=DATE:20260813/);
    // El bloqueo manual sale como "No disponible" (endDate +1 día: los manuales son inclusivos).
    expect(feed1.text).toMatch(/DTSTART;VALUE=DATE:20260820[\s\S]*?DTEND;VALUE=DATE:20260823/);
    // Las reservas importadas de Airbnb y Booking SE RE-EXPORTAN (la otra plataforma las verá).
    expect(feed1.text).toContain('DTSTART;VALUE=DATE:20260901'); // airbnb-1
    expect(feed1.text).toContain('DTSTART;VALUE=DATE:20260910'); // airbnb-2
    expect(feed1.text).toContain('DTSTART;VALUE=DATE:20260915'); // booking-1

    log('\n════════ PASO 2 — EXPORTACIÓN /calendar.ics (feed REAL) ════════');
    log(feed1.text.split('\r\n').map(l => '    ' + l).join('\n'));
    log('  ✅ La reserva de la WEB (10→13 ago) aparece como "Reservado".');
    log('  ✅ Las reservas de Airbnb y Booking se re-exportan → cada plataforma ve las de la otra.');

    // ── PASO 3 — SINCRONIZACIONES DEGRADADAS (lo que provocaba perder clientes) ──
    const before = { airbnb: await countByOrigin('airbnb'), booking: await countByOrigin('booking'), manual: await countByOrigin('manual') };

    // 3a) Ambos feeds VACÍOS pero válidos (típico hiccup / rate-limiting del proveedor).
    airbnbResponse  = { status: 200, body: icsFeed([]) };
    bookingResponse = { status: 200, body: icsFeed([]) };
    await icalSyncService.syncAll();

    // 3b) Airbnb devuelve HTML de mantenimiento (200 + basura); Booking vacío.
    airbnbResponse  = { status: 200, body: '<html><body>Service temporarily unavailable</body></html>' };
    bookingResponse = { status: 200, body: icsFeed([]) };
    await icalSyncService.syncAll();

    // 3c) Airbnb PARCIAL (solo devuelve 1 de sus 2 reservas); Booking normal.
    airbnbResponse  = { status: 200, body: icsFeed([{ uid: 'airbnb-1', start: '20260901', end: '20260903' }]) };
    bookingResponse = { status: 200, body: icsFeed([{ uid: 'booking-1', start: '20260915', end: '20260917' }]) };
    await icalSyncService.syncAll();

    const after = { airbnb: await countByOrigin('airbnb'), booking: await countByOrigin('booking'), manual: await countByOrigin('manual') };

    // NADA futuro se ha borrado pese a 3 lecturas malas seguidas.
    expect(after).toEqual(before);
    expect(after.airbnb).toBe(2);
    expect(after.booking).toBe(1);
    expect(after.manual).toBe(1);

    log('\n════════ PASO 3 — 3 SINCRONIZACIONES DEGRADADAS SEGUIDAS ════════');
    log('  · 3a feed VACÍO   · 3b feed CORRUPTO (HTML)   · 3c feed PARCIAL (falta airbnb-2)');
    log(`  Antes:  airbnb=${before.airbnb}  booking=${before.booking}  manual=${before.manual}`);
    log(`  Después:airbnb=${after.airbnb}  booking=${after.booking}  manual=${after.manual}`);
    log('  ✅ CERO bloqueos futuros borrados (airbnb-2 sobrevive aunque faltó en el feed parcial).');

    // ── PASO 4 — LIMPIEZA de pasados (housekeeping inofensivo) ───────────────────
    await BlockedPeriodModel.create({
      startDate: new Date('2020-01-10'), endDate: new Date('2020-01-13'),
      origin: 'booking', reason: 'Booking.com', externalUid: 'booking-viejo',
    });
    airbnbResponse  = { status: 200, body: icsFeed([
      { uid: 'airbnb-1', start: '20260901', end: '20260903' },
      { uid: 'airbnb-2', start: '20260910', end: '20260912' },
    ]) };
    bookingResponse = { status: 200, body: icsFeed([{ uid: 'booking-1', start: '20260915', end: '20260917' }]) };
    await icalSyncService.syncAll();

    expect(await BlockedPeriodModel.findOne({ externalUid: 'booking-viejo' })).toBeNull(); // pasado → limpiado
    expect(await countByOrigin('airbnb')).toBe(2);  // futuros intactos
    expect(await countByOrigin('booking')).toBe(1);
    log('\n════════ PASO 4 — Limpieza de pasados ════════');
    log('  ✅ Un bloqueo de ene-2020 (pasado) se limpia; los futuros siguen intactos.');

    // ── PASO 5 — ROUND-TRIP tras el caos: la propagación cruzada sigue viva ──────
    const feed2 = await callExport(exportToken);
    expect(feed2.text).toContain('DTSTART;VALUE=DATE:20260901'); // airbnb-1 sigue exportándose
    expect(feed2.text).toContain('DTSTART;VALUE=DATE:20260910'); // airbnb-2 sigue exportándose
    expect(feed2.text).toContain('DTSTART;VALUE=DATE:20260915'); // booking-1 sigue exportándose
    expect(feed2.text).toContain(`UID:booking-${String(webBooking._id)}@casa-caldereta.com`); // reserva web sigue
    expect(feed2.text).not.toContain('20200110'); // el pasado ya no

    log('\n════════ PASO 5 — Round-trip tras las syncs degradadas ════════');
    log('  ✅ Airbnb (1→3 y 10→12 sep) y Booking (15→17 sep) SIGUEN en la exportación.');
    log('  ✅ Booking seguirá viendo las de Airbnb y viceversa → imposible doble reserva por pérdida de fecha.');
    log('\n═══════════════════════════════════════════════════════════════\n');
  });
});
