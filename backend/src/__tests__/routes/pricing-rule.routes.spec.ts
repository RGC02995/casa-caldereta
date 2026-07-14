import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { PricingRuleModel } from '../../models/pricing-rule.model';

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

describe('GET /api/v1/pricing-rules', () => {
  it('público, sin token → 200', async () => {
    const res = await request(app).get('/api/v1/pricing-rules');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/v1/pricing-rules', () => {
  it('sin Authorization → 401', async () => {
    const res = await request(app)
      .post('/api/v1/pricing-rules')
      .send({ label: 'X', startDate: '2026-12-31', endDate: '2026-12-31', pricePerNight: 250, minNights: 1 });
    expect(res.status).toBe(401);
  });

  it('startDate === endDate (día único) con token → 201', async () => {
    const res = await request(app)
      .post('/api/v1/pricing-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ label: 'Nochevieja', startDate: '2026-12-31', endDate: '2026-12-31', pricePerNight: 250, minNights: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.startDate.slice(0, 10)).toBe('2026-12-31');
    expect(res.body.data.endDate.slice(0, 10)).toBe('2026-12-31');
  });

  it('endDate anterior a startDate → 400', async () => {
    const res = await request(app)
      .post('/api/v1/pricing-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ label: 'X', startDate: '2026-12-31', endDate: '2026-12-30', pricePerNight: 250, minNights: 1 });
    expect(res.status).toBe(400);
  });

  it('faltan campos obligatorios → 400', async () => {
    const res = await request(app)
      .post('/api/v1/pricing-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ label: 'X' });
    expect(res.status).toBe(400);
  });

  it('pricePerNight fuera de rango → 400', async () => {
    const res = await request(app)
      .post('/api/v1/pricing-rules')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ label: 'X', startDate: '2026-12-31', endDate: '2026-12-31', pricePerNight: 0, minNights: 1 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/v1/pricing-rules/:id', () => {
  it('sin Authorization → 401', async () => {
    const doc = await PricingRuleModel.create({
      label: 'X', startDate: new Date('2026-12-24'), endDate: new Date('2026-12-26'),
      pricePerNight: 200, minNights: 1,
    });
    const res = await request(app)
      .put(`/api/v1/pricing-rules/${String(doc._id)}`)
      .send({ pricePerNight: 300 });
    expect(res.status).toBe(401);
  });

  it('convertir un rango en día único con token → 200', async () => {
    const doc = await PricingRuleModel.create({
      label: 'X', startDate: new Date('2026-12-24'), endDate: new Date('2026-12-26'),
      pricePerNight: 200, minNights: 1,
    });
    const res = await request(app)
      .put(`/api/v1/pricing-rules/${String(doc._id)}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ startDate: '2026-12-31', endDate: '2026-12-31' });
    expect(res.status).toBe(200);
    expect(res.body.data.startDate.slice(0, 10)).toBe('2026-12-31');
    expect(res.body.data.endDate.slice(0, 10)).toBe('2026-12-31');
  });

  it('actualizar solo endDate a una fecha anterior al startDate guardado → 400 (no cuela un rango invertido)', async () => {
    const doc = await PricingRuleModel.create({
      label: 'X', startDate: new Date('2026-12-24'), endDate: new Date('2026-12-26'),
      pricePerNight: 200, minNights: 1,
    });
    const res = await request(app)
      .put(`/api/v1/pricing-rules/${String(doc._id)}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ endDate: '2026-12-20' });
    expect(res.status).toBe(400);

    const stillThere = await PricingRuleModel.findById(doc._id).lean();
    expect(stillThere?.endDate.toISOString().slice(0, 10)).toBe('2026-12-26');
  });

  it('id inexistente → 404, id malformado → 400', async () => {
    const missing = await request(app)
      .put(`/api/v1/pricing-rules/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ pricePerNight: 300 });
    expect(missing.status).toBe(404);

    const malformed = await request(app)
      .put('/api/v1/pricing-rules/esto-no-es-un-id')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ pricePerNight: 300 });
    expect(malformed.status).toBe(400);
  });
});

describe('DELETE /api/v1/pricing-rules/:id', () => {
  it('sin Authorization → 401', async () => {
    const doc = await PricingRuleModel.create({
      label: 'X', startDate: new Date('2026-12-24'), endDate: new Date('2026-12-26'),
      pricePerNight: 200, minNights: 1,
    });
    const res = await request(app).delete(`/api/v1/pricing-rules/${String(doc._id)}`);
    expect(res.status).toBe(401);
  });

  it('con token → 200 y la regla desaparece', async () => {
    const doc = await PricingRuleModel.create({
      label: 'X', startDate: new Date('2026-12-24'), endDate: new Date('2026-12-26'),
      pricePerNight: 200, minNights: 1,
    });
    const res = await request(app)
      .delete(`/api/v1/pricing-rules/${String(doc._id)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(await PricingRuleModel.countDocuments()).toBe(0);
  });
});
