import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import request from 'supertest';

const { destroyMock } = vi.hoisted(() => ({ destroyMock: vi.fn().mockResolvedValue({ result: 'ok' }) }));

vi.mock('../../config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: (_opts: unknown, callback: (error: unknown, result: unknown) => void) => {
        const publicId = `casa-caldereta/test/${Math.random().toString(36).slice(2)}`;
        return {
          end: () => callback(null, { secure_url: `https://res.cloudinary.com/test/${publicId}.jpg`, public_id: publicId }),
        };
      },
      destroy: destroyMock,
    },
  },
}));

import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';
import { PhotoModel } from '../../models/photo.model';

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

async function createPhoto() {
  return PhotoModel.create({
    url:      'https://res.cloudinary.com/demo/image/upload/test.jpg',
    publicId: `test-${Date.now()}-${Math.random()}`,
    alt:      'Foto de prueba',
    category: 'exterior',
    order:    0,
    width:    800,
    height:   600,
  });
}

describe('GET /api/v1/site-settings', () => {
  it('200 + heroPhotoId null en BD vacía', async () => {
    const res = await request(app).get('/api/v1/site-settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.heroPhotoId).toBeNull();
  });

  it('ruta pública — sin Authorization → 200 igualmente', async () => {
    const res = await request(app).get('/api/v1/site-settings');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/v1/site-settings/hero-photo', () => {
  it('sin Authorization → 401', async () => {
    const photo = await createPhoto();
    const res = await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .send({ photoId: String(photo._id) });
    expect(res.status).toBe(401);
  });

  it('token válido + photoId existente → 200 + heroPhotoId actualizado', async () => {
    const photo = await createPhoto();
    const res = await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoId: String(photo._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.heroPhotoId).toBe(String(photo._id));

    const getRes = await request(app).get('/api/v1/site-settings');
    expect(getRes.body.data.heroPhotoId).toBe(String(photo._id));
  });

  it('token válido + photoId inexistente → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoId: fakeId });
    expect(res.status).toBe(404);
  });

  it('token válido + photoId con formato inválido → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoId: 'no-es-un-object-id' });
    expect(res.status).toBe(400);
  });

  it('token válido + sin photoId → 400', async () => {
    const res = await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/photos/:id — limpia heroPhotoId si coincide', () => {
  it('borrar la foto marcada como hero → heroPhotoId vuelve a null', async () => {
    const photo = await createPhoto();
    await request(app)
      .patch('/api/v1/site-settings/hero-photo')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ photoId: String(photo._id) });

    await request(app)
      .delete(`/api/v1/photos/${photo._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    const getRes = await request(app).get('/api/v1/site-settings');
    expect(getRes.body.data.heroPhotoId).toBeNull();
  });
});
