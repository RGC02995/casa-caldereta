import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import apiRouter from '../../routes/index';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1', apiRouter);

const USER_AGENT = 'vitest-test-agent';

let mongod: MongoMemoryServer;

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
});

/** Extrae el valor de la cookie cc_rt del header set-cookie de login */
function extractRtCookie(setCookieHeader: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ''];
  const rtCookie = cookies.find(c => c.startsWith('cc_rt='));
  if (!rtCookie) throw new Error('Cookie cc_rt no encontrada en la respuesta de login');
  return rtCookie.split(';')[0]; // 'cc_rt=TOKEN'
}

describe('POST /api/v1/auth/login', () => {
  it('credenciales correctas → 200 + accessToken en body + cookie httpOnly cc_rt', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({ email: 'admin@test.com', password: 'test-admin-password' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    const setCookie = res.headers['set-cookie'] as string[] | undefined;
    expect(setCookie?.some(c => c.startsWith('cc_rt='))).toBe(true);
  });

  it('email incorrecto → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({ email: 'otro@test.com', password: 'test-admin-password' });
    expect(res.status).toBe(401);
  });

  it('contraseña incorrecta → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({ email: 'admin@test.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('body vacío → 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('cookie cc_rt válida → 200 + nuevo accessToken', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({ email: 'admin@test.com', password: 'test-admin-password' });
    const rtCookie = extractRtCookie(loginRes.headers['set-cookie'] as string[]);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', USER_AGENT)
      .set('Cookie', rtCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('sin cookie de sesión → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('User-Agent', USER_AGENT);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('cookie cc_rt válida → 200', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', USER_AGENT)
      .send({ email: 'admin@test.com', password: 'test-admin-password' });
    const rtCookie = extractRtCookie(loginRes.headers['set-cookie'] as string[]);

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('User-Agent', USER_AGENT)
      .set('Cookie', rtCookie);
    expect(res.status).toBe(200);
  });
});
