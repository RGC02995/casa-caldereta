import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const { destroyMock } = vi.hoisted(() => ({ destroyMock: vi.fn().mockResolvedValue({ result: 'ok' }) }));

vi.mock('../../config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: (_opts: unknown, callback: (error: unknown, result: unknown) => void) => ({
        end: () => callback(null, { secure_url: 'https://res.cloudinary.com/test/unused.jpg', public_id: 'casa-caldereta/test/unused' }),
      }),
      destroy: destroyMock,
    },
  },
}));

import { routeService } from '../../services/route.service';
import { RouteModel } from '../../models/route.model';

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
  destroyMock.mockClear();
});

async function createRouteWithPoints(): Promise<string> {
  const route = await routeService.create({
    title:         'Ruta de prueba',
    description:   'Descripción de prueba',
    distance:       5,
    duration:       60,
    difficulty:    'easy',
    type:          'hiking',
    coverImageUrl: '',
    points: [
      { name: 'Punto A', description: 'Desc A', imageUrl: 'https://cdn.test/a.jpg', imagePublicId: 'casa-caldereta/rutas/puntos/a' },
      { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg', imagePublicId: 'casa-caldereta/rutas/puntos/b' },
      { name: 'Punto C', description: 'Desc C' },
    ],
  });
  return route.id;
}

describe('routeService.update() — merge de imagePublicId en puntos', () => {
  it('mismo orden, solo cambia texto → conserva imagePublicId de los puntos con imagen', async () => {
    const id = await createRouteWithPoints();

    const updated = await routeService.update(id, {
      points: [
        { name: 'Punto A', description: 'Desc A editada', imageUrl: 'https://cdn.test/a.jpg' },
        { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg' },
        { name: 'Punto C editado', description: 'Desc C' },
      ],
    });

    expect(updated!.points[0].imagePublicId).toBe('casa-caldereta/rutas/puntos/a');
    expect(updated!.points[1].imagePublicId).toBe('casa-caldereta/rutas/puntos/b');
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it('puntos reordenados → conserva imagePublicId emparejando por imageUrl, no por índice', async () => {
    const id = await createRouteWithPoints();

    const updated = await routeService.update(id, {
      points: [
        { name: 'Punto C', description: 'Desc C' },
        { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg' },
        { name: 'Punto A', description: 'Desc A', imageUrl: 'https://cdn.test/a.jpg' },
      ],
    });

    const pointB = updated!.points.find(point => point.name === 'Punto B');
    const pointA = updated!.points.find(point => point.name === 'Punto A');
    expect(pointB!.imagePublicId).toBe('casa-caldereta/rutas/puntos/b');
    expect(pointA!.imagePublicId).toBe('casa-caldereta/rutas/puntos/a');
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it('se elimina un punto con imagen → el publicId huérfano se destruye en Cloudinary', async () => {
    const id = await createRouteWithPoints();

    await routeService.update(id, {
      points: [
        { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg' },
        { name: 'Punto C', description: 'Desc C' },
      ],
    });

    expect(destroyMock).toHaveBeenCalledTimes(1);
    expect(destroyMock).toHaveBeenCalledWith('casa-caldereta/rutas/puntos/a');
  });

  it('se añade un punto nuevo sin imagen → no rompe el merge ni genera publicId', async () => {
    const id = await createRouteWithPoints();

    const updated = await routeService.update(id, {
      points: [
        { name: 'Punto A', description: 'Desc A', imageUrl: 'https://cdn.test/a.jpg' },
        { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg' },
        { name: 'Punto C', description: 'Desc C' },
        { name: 'Punto D', description: 'Desc D' },
      ],
    });

    const pointD = updated!.points.find(point => point.name === 'Punto D');
    expect(pointD!.imagePublicId).toBeUndefined();
    expect(destroyMock).not.toHaveBeenCalled();
  });

  it('imageUrl de un punto cambia sin pasar por uploadPointImage → no conserva el publicId antiguo y lo destruye', async () => {
    const id = await createRouteWithPoints();

    const updated = await routeService.update(id, {
      points: [
        { name: 'Punto A', description: 'Desc A', imageUrl: 'https://cdn.test/a-otra.jpg' },
        { name: 'Punto B', description: 'Desc B', imageUrl: 'https://cdn.test/b.jpg' },
        { name: 'Punto C', description: 'Desc C' },
      ],
    });

    const pointA = updated!.points.find(point => point.name === 'Punto A');
    expect(pointA!.imagePublicId).toBeUndefined();
    expect(destroyMock).toHaveBeenCalledWith('casa-caldereta/rutas/puntos/a');
  });
});

describe('routeService.delete() — limpieza de Cloudinary', () => {
  it('borra portada, imágenes de galería y de puntos al eliminar la ruta', async () => {
    const route = await routeService.create({
      title:         'Ruta a borrar',
      description:   'Descripción',
      distance:       3,
      duration:       30,
      difficulty:    'easy',
      type:          'walking',
      coverImageUrl: 'https://cdn.test/cover.jpg',
      points: [
        { name: 'Punto A', description: 'Desc A', imageUrl: 'https://cdn.test/a.jpg', imagePublicId: 'casa-caldereta/rutas/puntos/a' },
      ],
    });
    await RouteModel.findByIdAndUpdate(route.id, {
      $set: {
        coverImagePublicId: 'casa-caldereta/rutas/cover',
        images: [{ url: 'https://cdn.test/g1.jpg', publicId: 'casa-caldereta/rutas/galeria/g1' }],
      },
    });

    const deleted = await routeService.delete(route.id);

    expect(deleted).toBe(true);
    expect(destroyMock).toHaveBeenCalledWith('casa-caldereta/rutas/cover');
    expect(destroyMock).toHaveBeenCalledWith('casa-caldereta/rutas/galeria/g1');
    expect(destroyMock).toHaveBeenCalledWith('casa-caldereta/rutas/puntos/a');
  });

  it('ruta inexistente → devuelve false sin llamar a Cloudinary', async () => {
    const deleted = await routeService.delete(new mongoose.Types.ObjectId().toString());
    expect(deleted).toBe(false);
    expect(destroyMock).not.toHaveBeenCalled();
  });
});
