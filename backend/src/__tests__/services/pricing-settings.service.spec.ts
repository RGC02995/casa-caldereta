import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { pricingSettingsService } from '../../services/pricing-settings.service';

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

describe('pricingSettingsService.get()', () => {
  it('BD vacía → crea documento con defaults', async () => {
    const settings = await pricingSettingsService.get();
    expect(settings.monThuPrice).toBe(100);
    expect(settings.friPrice).toBe(150);
    expect(settings.satPrice).toBe(180);
    expect(settings.extraPerPerson).toBe(20);
  });

  it('segunda llamada → devuelve el mismo documento (singleton)', async () => {
    const first  = await pricingSettingsService.get();
    const second = await pricingSettingsService.get();
    expect(String(first._id)).toBe(String(second._id));
  });
});

describe('pricingSettingsService.getConfig()', () => {
  it('devuelve shape IPricingConfig con los 4 campos numéricos', async () => {
    const config = await pricingSettingsService.getConfig();
    expect(typeof config.monThuPrice).toBe('number');
    expect(typeof config.friPrice).toBe('number');
    expect(typeof config.satPrice).toBe('number');
    expect(typeof config.extraPerPerson).toBe('number');
  });

  it('valores coinciden con los defaults iniciales', async () => {
    const config = await pricingSettingsService.getConfig();
    expect(config).toEqual({
      monThuPrice:    100,
      friPrice:       150,
      satPrice:       180,
      extraPerPerson: 20,
    });
  });
});

describe('pricingSettingsService.update()', () => {
  it('actualiza friPrice y persiste el cambio', async () => {
    await pricingSettingsService.get(); // inicializa el documento
    await pricingSettingsService.update({ friPrice: 175 });
    const config = await pricingSettingsService.getConfig();
    expect(config.friPrice).toBe(175);
  });

  it('solo actualiza los campos indicados, el resto no cambia', async () => {
    await pricingSettingsService.get();
    await pricingSettingsService.update({ satPrice: 200 });
    const config = await pricingSettingsService.getConfig();
    expect(config.satPrice).toBe(200);
    expect(config.monThuPrice).toBe(100); // sin cambios
    expect(config.friPrice).toBe(150);    // sin cambios
  });

  it('valor negativo → lanza error de validación Mongoose (min: 1)', async () => {
    await pricingSettingsService.get();
    await expect(pricingSettingsService.update({ friPrice: -10 })).rejects.toThrow();
  });

  it('valor 0 en precio noche → lanza error de validación (min: 1)', async () => {
    await pricingSettingsService.get();
    await expect(pricingSettingsService.update({ monThuPrice: 0 })).rejects.toThrow();
  });

  it('extraPerPerson = 0 → válido (min: 0)', async () => {
    await pricingSettingsService.get();
    await pricingSettingsService.update({ extraPerPerson: 0 });
    const config = await pricingSettingsService.getConfig();
    expect(config.extraPerPerson).toBe(0);
  });
});
