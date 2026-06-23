import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';

// Mini app Express para tests — sin listen(), sin crons, sin Stripe webhook
const app = express();
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

describe('GET /api/v1/pricing-settings', () => {
  it('200 + body con los 4 campos de precio', async () => {
    const res = await request(app).get('/api/v1/pricing-settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      monThuPrice:    100,
      friPrice:       150,
      satPrice:       180,
      extraPerPerson: 20,
    });
  });

  it('ruta pública — sin Authorization → 200 igualmente', async () => {
    const res = await request(app).get('/api/v1/pricing-settings');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/pricing-settings', () => {
  it('sin Authorization → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/pricing-settings')
      .send({ friPrice: 175 });
    expect(res.status).toBe(401);
  });

  it('token válido + friPrice: 175 → 200 + dato actualizado', async () => {
    const res = await request(app)
      .patch('/api/v1/pricing-settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ friPrice: 175 });
    expect(res.status).toBe(200);
    expect(res.body.data.friPrice).toBe(175);
  });

  it('token válido + friPrice negativo → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/pricing-settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ friPrice: -10 });
    expect(res.status).toBe(400);
  });

  it('token válido + friPrice como string → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/pricing-settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ friPrice: 'cien' });
    expect(res.status).toBe(400);
  });

  it('token válido + body vacío → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/pricing-settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
