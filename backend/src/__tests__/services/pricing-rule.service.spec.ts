import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { pricingRuleService } from '../../services/pricing-rule.service';
import { PricingRuleModel } from '../../models/pricing-rule.model';

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

const baseData = {
  label:         'Nochevieja',
  pricePerNight: 250,
  minNights:     1,
};

describe('pricingRuleService.create()', () => {
  it('startDate === endDate (día único) → se crea correctamente', async () => {
    const rule = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-31', endDate: '2026-12-31',
    });
    expect(rule.startDate.toISOString().slice(0, 10)).toBe('2026-12-31');
    expect(rule.endDate.toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('endDate posterior a startDate (rango normal) → se crea correctamente', async () => {
    const rule = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-24', endDate: '2026-12-26',
    });
    expect(rule.label).toBe('Nochevieja');
  });

  it('endDate anterior a startDate → lanza error', async () => {
    await expect(
      pricingRuleService.create({ ...baseData, startDate: '2026-12-31', endDate: '2026-12-30' }),
    ).rejects.toThrow('igual o posterior');
  });

  it('fecha no válida → lanza error', async () => {
    await expect(
      pricingRuleService.create({ ...baseData, startDate: 'no-es-fecha', endDate: '2026-12-31' }),
    ).rejects.toThrow('no válidas');
  });
});

describe('pricingRuleService.update()', () => {
  it('convertir un rango existente en día único (startDate=endDate) → se permite', async () => {
    const created = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-24', endDate: '2026-12-26',
    });
    const updated = await pricingRuleService.update(created.id, {
      startDate: '2026-12-31', endDate: '2026-12-31',
    });
    expect(updated?.startDate.toISOString().slice(0, 10)).toBe('2026-12-31');
    expect(updated?.endDate.toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('actualizar solo endDate a una fecha anterior al startDate guardado en BD → lanza error (no se coló el rango invertido)', async () => {
    const created = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-24', endDate: '2026-12-26',
    });
    await expect(
      pricingRuleService.update(created.id, { endDate: '2026-12-20' }),
    ).rejects.toThrow('igual o posterior');

    // La regla en BD no debe haber cambiado
    const stillThere = await PricingRuleModel.findById(created.id).lean();
    expect(stillThere?.endDate.toISOString().slice(0, 10)).toBe('2026-12-26');
  });

  it('actualizar solo startDate a una fecha posterior al endDate guardado en BD → lanza error', async () => {
    const created = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-24', endDate: '2026-12-26',
    });
    await expect(
      pricingRuleService.update(created.id, { startDate: '2026-12-30' }),
    ).rejects.toThrow('igual o posterior');
  });

  it('actualizar solo el precio, sin tocar fechas → no valida fechas y persiste el cambio', async () => {
    const created = await pricingRuleService.create({
      ...baseData, startDate: '2026-12-24', endDate: '2026-12-26',
    });
    const updated = await pricingRuleService.update(created.id, { pricePerNight: 300 });
    expect(updated?.pricePerNight).toBe(300);
  });

  it('id inexistente → devuelve null', async () => {
    const missing = await pricingRuleService.update(new mongoose.Types.ObjectId().toString(), {
      pricePerNight: 100,
    });
    expect(missing).toBeNull();
  });
});

describe('pricingRuleService.getOverlapping()', () => {
  it('una regla de día único se detecta como solapada para una estancia que incluye ese día', async () => {
    await pricingRuleService.create({
      ...baseData, startDate: '2026-12-31', endDate: '2026-12-31',
    });
    const overlapping = await pricingRuleService.getOverlapping(
      new Date('2026-12-30'), new Date('2027-01-02'),
    );
    expect(overlapping).toHaveLength(1);
    expect(overlapping[0].label).toBe('Nochevieja');
  });

  it('una regla de día único NO se detecta si la estancia no incluye ese día', async () => {
    await pricingRuleService.create({
      ...baseData, startDate: '2026-12-31', endDate: '2026-12-31',
    });
    const overlapping = await pricingRuleService.getOverlapping(
      new Date('2026-12-20'), new Date('2026-12-25'),
    );
    expect(overlapping).toHaveLength(0);
  });
});
