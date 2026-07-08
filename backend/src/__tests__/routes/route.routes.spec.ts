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
import { RouteModel } from '../../models/route.model';

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

function validRoutePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title:       'Ruta del Barranc',
    description: 'Una ruta preciosa',
    distance:    5,
    duration:    90,
    difficulty:  'moderate',
    type:        'hiking',
    ...overrides,
  };
}

describe('CRUD básico de rutas', () => {
  it('GET /api/v1/routes sin auth → 401', async () => {
    const res = await request(app).get('/api/v1/routes');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/routes sin auth → 401', async () => {
    const res = await request(app).post('/api/v1/routes').send(validRoutePayload());
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/routes con auth → 201', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload());
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Ruta del Barranc');
    expect(res.body.data.images).toEqual([]);
  });

  it('PATCH /api/v1/routes/:id sin auth → 401; con auth → 200', async () => {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload());
    const id = created.body.data.id;

    const noAuth = await request(app).patch(`/api/v1/routes/${id}`).send({ title: 'Nuevo título' });
    expect(noAuth.status).toBe(401);

    const withAuth = await request(app)
      .patch(`/api/v1/routes/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Nuevo título' });
    expect(withAuth.status).toBe(200);
    expect(withAuth.body.data.title).toBe('Nuevo título');
  });

  it('PATCH /:id/published alterna isPublished', async () => {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload());
    const id = created.body.data.id;
    expect(created.body.data.isPublished).toBe(false);

    const res = await request(app)
      .patch(`/api/v1/routes/${id}/published`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isPublished).toBe(true);
  });

  it('DELETE /:id elimina la ruta', async () => {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload());
    const id = created.body.data.id;

    const res = await request(app)
      .delete(`/api/v1/routes/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(await RouteModel.countDocuments()).toBe(0);
  });
});

describe('Validación de enlaces y puntos', () => {
  it('externalLinkUrl inválida → 400', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ externalLinkUrl: 'no-es-una-url' }));
    expect(res.status).toBe(400);
  });

  it('externalLinkUrl válida → 201 y se persiste con su label', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ externalLinkLabel: 'Ver en Wikiloc', externalLinkUrl: 'https://wikiloc.com/ruta-1' }));
    expect(res.status).toBe(201);
    expect(res.body.data.externalLinkLabel).toBe('Ver en Wikiloc');
    expect(res.body.data.externalLinkUrl).toBe('https://wikiloc.com/ruta-1');
  });

  it('linkUrl de un punto inválida → 400', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ points: [{ name: 'Ermita', description: 'Desc', linkUrl: 'no-es-url' }] }));
    expect(res.status).toBe(400);
  });

  it('lat fuera de rango → 400', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ points: [{ name: 'Ermita', description: 'Desc', lat: 200 }] }));
    expect(res.status).toBe(400);
  });

  it('lng fuera de rango → 400', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ points: [{ name: 'Ermita', description: 'Desc', lng: -200 }] }));
    expect(res.status).toBe(400);
  });

  it('punto con lat/lng/linkUrl válidos → 201 y se persiste', async () => {
    const res = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({
        points: [{ name: 'Ermita', description: 'Desc', lat: 38.88, lng: -0.34, linkUrl: 'https://maps.google.com/x' }],
      }));
    expect(res.status).toBe(201);
    expect(res.body.data.points[0]).toMatchObject({ lat: 38.88, lng: -0.34, linkUrl: 'https://maps.google.com/x' });
  });
});

describe('POST /:id/points/:index/image', () => {
  async function createRouteWithTwoPoints(): Promise<string> {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({
        points: [
          { name: 'Punto A', description: 'Desc A' },
          { name: 'Punto B', description: 'Desc B' },
        ],
      }));
    return created.body.data.id;
  }

  it('índice fuera de rango → 404', async () => {
    const id = await createRouteWithTwoPoints();
    const res = await request(app)
      .post(`/api/v1/routes/${id}/points/5/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(404);
  });

  it('índice válido → 200 y actualiza imageUrl del punto', async () => {
    const id = await createRouteWithTwoPoints();
    const res = await request(app)
      .post(`/api/v1/routes/${id}/points/0/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.data.points[0].imageUrl).toContain('res.cloudinary.com');
    expect(res.body.data.points[1].imageUrl).toBeFalsy();
  });

  it('reemplazar la imagen de un punto destruye la anterior en Cloudinary', async () => {
    const id = await createRouteWithTwoPoints();
    await request(app)
      .post(`/api/v1/routes/${id}/points/0/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image-1'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    destroyMock.mockClear();

    const res = await request(app)
      .post(`/api/v1/routes/${id}/points/0/image`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image-2'), { filename: 'a2.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});

describe('Galería de imágenes de ruta', () => {
  async function createRoute(): Promise<string> {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload());
    return created.body.data.id;
  }

  it('POST /:id/images sube y añade a la galería', async () => {
    const id = await createRoute();
    const res = await request(app)
      .post(`/api/v1/routes/${id}/images`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image'), { filename: 'g1.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.data.images).toHaveLength(1);
    expect(res.body.data.images[0]).toHaveProperty('url');
    expect(res.body.data.images[0]).toHaveProperty('publicId');
  });

  it('varias subidas seguidas → la galería crece en orden', async () => {
    const id = await createRoute();
    await request(app).post(`/api/v1/routes/${id}/images`).set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('img1'), { filename: 'g1.jpg', contentType: 'image/jpeg' });
    const res = await request(app).post(`/api/v1/routes/${id}/images`).set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('img2'), { filename: 'g2.jpg', contentType: 'image/jpeg' });
    expect(res.body.data.images).toHaveLength(2);
  });

  it('DELETE /:id/images/:publicId (con "/" codificado) elimina la imagen y destruye en Cloudinary', async () => {
    const id = await createRoute();
    const uploaded = await request(app)
      .post(`/api/v1/routes/${id}/images`)
      .set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('fake-image'), { filename: 'g1.jpg', contentType: 'image/jpeg' });
    const publicId: string = uploaded.body.data.images[0].publicId;
    expect(publicId).toContain('/');
    destroyMock.mockClear();

    const res = await request(app)
      .delete(`/api/v1/routes/${id}/images/${encodeURIComponent(publicId)}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.images).toHaveLength(0);
    expect(destroyMock).toHaveBeenCalledWith(publicId);
  });

  it('publicId inexistente → 404', async () => {
    const id = await createRoute();
    const res = await request(app)
      .delete(`/api/v1/routes/${id}/images/${encodeURIComponent('casa-caldereta/rutas/galeria/no-existe')}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /:id — limpieza de Cloudinary al borrar la ruta completa', () => {
  it('destruye portada, imágenes de galería e imágenes de puntos', async () => {
    const created = await request(app)
      .post('/api/v1/routes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validRoutePayload({ points: [{ name: 'Punto A', description: 'Desc A' }] }));
    const id = created.body.data.id;

    await request(app).post(`/api/v1/routes/${id}/cover-image`).set('Authorization', `Bearer ${authToken}`)
      .attach('coverImage', Buffer.from('cover'), { filename: 'cover.jpg', contentType: 'image/jpeg' });
    await request(app).post(`/api/v1/routes/${id}/images`).set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('gallery'), { filename: 'g1.jpg', contentType: 'image/jpeg' });
    await request(app).post(`/api/v1/routes/${id}/points/0/image`).set('Authorization', `Bearer ${authToken}`)
      .attach('image', Buffer.from('point'), { filename: 'p1.jpg', contentType: 'image/jpeg' });

    destroyMock.mockClear();

    const res = await request(app)
      .delete(`/api/v1/routes/${id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(destroyMock).toHaveBeenCalledTimes(3);
  });
});
