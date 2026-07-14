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
          end: () => callback(null, { secure_url: `https://res.cloudinary.com/test/${publicId}.jpg`, public_id: publicId, width: 800, height: 600 }),
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
  destroyMock.mockClear();
});

async function createPhoto(): Promise<{ id: string; publicId: string }> {
  const res = await request(app)
    .post('/api/v1/photos')
    .set('Authorization', `Bearer ${authToken}`)
    .field('alt', 'Foto original')
    .field('category', 'exterior')
    .attach('photo', Buffer.from('fake-image'), { filename: 'original.jpg', contentType: 'image/jpeg' });
  return { id: res.body.data.id, publicId: res.body.data.publicId };
}

describe('POST /api/v1/photos/:id/image', () => {
  it('sin auth → 401', async () => {
    const { id } = await createPhoto();
    const res = await request(app)
      .post(`/api/v1/photos/${id}/image`)
      .attach('photo', Buffer.from('nueva-imagen'), { filename: 'nueva.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('id no válido → 400', async () => {
    const res = await request(app)
      .post('/api/v1/photos/id-invalido/image')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', Buffer.from('nueva-imagen'), { filename: 'nueva.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('sin fichero adjunto → 400', async () => {
    const { id } = await createPhoto();
    const res = await request(app)
      .post(`/api/v1/photos/${id}/image`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(400);
  });

  it('foto inexistente → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/v1/photos/${fakeId}/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', Buffer.from('nueva-imagen'), { filename: 'nueva.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('con auth y fichero válido → 200, url/publicId nuevos, alt/category/order sin cambios', async () => {
    const { id, publicId: oldPublicId } = await createPhoto();

    const res = await request(app)
      .post(`/api/v1/photos/${id}/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', Buffer.from('nueva-imagen'), { filename: 'nueva.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.publicId).not.toBe(oldPublicId);
    expect(res.body.data.url).toContain('res.cloudinary.com');
    expect(res.body.data.alt).toBe('Foto original');
    expect(res.body.data.category).toBe('exterior');
    expect(res.body.data.order).toBe(0);

    const stored = await PhotoModel.findById(id).lean();
    expect(stored?.publicId).toBe(res.body.data.publicId);
  });

  it('destruye el publicId antiguo en Cloudinary, no el nuevo', async () => {
    const { id, publicId: oldPublicId } = await createPhoto();
    destroyMock.mockClear();

    const res = await request(app)
      .post(`/api/v1/photos/${id}/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('photo', Buffer.from('nueva-imagen'), { filename: 'nueva.jpg', contentType: 'image/jpeg' });

    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledWith(oldPublicId);
    expect(destroyMock).not.toHaveBeenCalledWith(res.body.data.publicId);
  });
});
