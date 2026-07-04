import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { BlockedPeriodModel } from '../../models/blocked-period.model';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/v1', apiRouter);

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
});

describe('GET /api/v1/blocked-periods', () => {
  it('publico sin token → 200 con array', async () => {
    const res = await request(app).get('/api/v1/blocked-periods');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('HALLAZGO: el endpoint publico expone reason (notas internas), origin y externalUid', async () => {
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-10'), endDate: new Date('2026-08-12'),
      origin: 'manual', reason: 'Visita del fontanero — no molestar',
    });
    await BlockedPeriodModel.create({
      startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22'),
      origin: 'airbnb', externalUid: 'airbnb-uid-privado-1',
    });

    const res = await request(app).get('/api/v1/blocked-periods');
    // Comportamiento actual documentado: cualquiera puede leer las notas internas del propietario
    const raw = JSON.stringify(res.body);
    expect(raw).toContain('Visita del fontanero');
    expect(raw).toContain('airbnb-uid-privado-1');
    expect(raw).toContain('"origin"');
  });
});

describe('POST /api/v1/blocked-periods', () => {
  it('sin Authorization → 401', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .send({ startDate: '2026-08-10', endDate: '2026-08-12' });
    expect(res.status).toBe(401);
  });

  it('con token → 201 y origin manual por defecto', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate: '2026-08-10', endDate: '2026-08-12', reason: 'Vacaciones' });
    expect(res.status).toBe(201);
    expect(res.body.data.origin).toBe('manual');
    expect(res.body.data.reason).toBe('Vacaciones');
  });

  it('endDate anterior a startDate → 400', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate: '2026-08-12', endDate: '2026-08-10' });
    expect(res.status).toBe(400);
  });

  it('fecha no valida → 400', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate: 'no-es-fecha', endDate: '2026-08-12' });
    expect(res.status).toBe(400);
  });

  it('sin fechas → 400', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('reason de mas de 200 caracteres → 400', async () => {
    const res = await request(app)
      .post('/api/v1/blocked-periods')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate: '2026-08-10', endDate: '2026-08-12', reason: 'x'.repeat(201) });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/blocked-periods/:id', () => {
  it('sin Authorization → 401', async () => {
    const doc = await BlockedPeriodModel.create({
      startDate: new Date('2026-08-10'), endDate: new Date('2026-08-12'), origin: 'manual',
    });
    const res = await request(app).delete(`/api/v1/blocked-periods/${String(doc._id)}`);
    expect(res.status).toBe(401);
  });

  it('con token → 200 y el periodo desaparece', async () => {
    const doc = await BlockedPeriodModel.create({
      startDate: new Date('2026-08-10'), endDate: new Date('2026-08-12'), origin: 'manual',
    });
    const res = await request(app)
      .delete(`/api/v1/blocked-periods/${String(doc._id)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(await BlockedPeriodModel.countDocuments()).toBe(0);
  });

  it('id inexistente → 404 y id malformado → 400', async () => {
    const missing = await request(app)
      .delete(`/api/v1/blocked-periods/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(missing.status).toBe(404);

    const malformed = await request(app)
      .delete('/api/v1/blocked-periods/esto-no-es-un-id')
      .set('Authorization', `Bearer ${authToken}`);
    expect(malformed.status).toBe(400);
  });
});
