import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { siteSettingsService } from '../../services/site-settings.service';
import { PhotoModel } from '../../models/photo.model';

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

describe('siteSettingsService.get()', () => {
  it('BD vacía → crea documento con heroPhotoId null', async () => {
    const settings = await siteSettingsService.get();
    expect(settings.heroPhotoId).toBeNull();
  });

  it('segunda llamada → devuelve el mismo documento (singleton)', async () => {
    const first  = await siteSettingsService.get();
    const second = await siteSettingsService.get();
    expect(String(first._id)).toBe(String(second._id));
  });
});

describe('siteSettingsService.setHeroPhoto()', () => {
  it('foto existente → guarda el heroPhotoId', async () => {
    const photo    = await createPhoto();
    const settings = await siteSettingsService.setHeroPhoto(String(photo._id));
    expect(settings).not.toBeNull();
    expect(String(settings!.heroPhotoId)).toBe(String(photo._id));
  });

  it('id de foto inexistente → devuelve null, no crea nada', async () => {
    const fakeId   = new mongoose.Types.ObjectId().toString();
    const settings = await siteSettingsService.setHeroPhoto(fakeId);
    expect(settings).toBeNull();
  });

  it('cambiar de una foto a otra → sobrescribe correctamente', async () => {
    const photoA = await createPhoto();
    const photoB = await createPhoto();
    await siteSettingsService.setHeroPhoto(String(photoA._id));
    const updated = await siteSettingsService.setHeroPhoto(String(photoB._id));
    expect(String(updated!.heroPhotoId)).toBe(String(photoB._id));
  });
});

describe('siteSettingsService.clearHeroPhotoIfMatches()', () => {
  it('limpia heroPhotoId si coincide con la foto indicada', async () => {
    const photo = await createPhoto();
    await siteSettingsService.setHeroPhoto(String(photo._id));

    await siteSettingsService.clearHeroPhotoIfMatches(String(photo._id));

    const settings = await siteSettingsService.get();
    expect(settings.heroPhotoId).toBeNull();
  });

  it('no toca heroPhotoId si no coincide', async () => {
    const photoA = await createPhoto();
    const photoB = await createPhoto();
    await siteSettingsService.setHeroPhoto(String(photoA._id));

    await siteSettingsService.clearHeroPhotoIfMatches(String(photoB._id));

    const settings = await siteSettingsService.get();
    expect(String(settings.heroPhotoId)).toBe(String(photoA._id));
  });
});
