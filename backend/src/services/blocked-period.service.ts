import { BlockedPeriodModel, BlockedPeriodOrigin, IBlockedPeriodDocument } from '../models/blocked-period.model';
import { withId } from '../utils/mongoose.util';

function addOneDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

export interface ICreateBlockedPeriodData {
  startDate:    string;
  endDate:      string;
  reason?:      string;
  origin?:      BlockedPeriodOrigin;
  externalUid?: string;
}

export interface IBlockedPeriodAvailability {
  startDate: Date;
  endDate:   Date;
}

class BlockedPeriodService {
  async getAll(): Promise<IBlockedPeriodDocument[]> {
    const docs = await BlockedPeriodModel.find().sort({ startDate: 1 }).lean<IBlockedPeriodDocument[]>();
    return docs.map(withId);
  }

  // Proyección mínima para el calendario público — sin reason/origin/externalUid.
  // Normaliza todo a UNA convención: endDate EXCLUSIVO (primer día libre, el de
  // salida). Los bloqueos manuales se guardan/pintan inclusivos → se devuelve
  // endDate + 1 día; los importados de Airbnb/Booking ya llegan exclusivos del
  // feed → tal cual. Mismo criterio que ical-export.controller.ts y
  // hasBlockedConflict() en booking.service.ts.
  async getPublicAvailability(): Promise<IBlockedPeriodAvailability[]> {
    const docs = await BlockedPeriodModel.find({}, { startDate: 1, endDate: 1, origin: 1, _id: 0 })
      .sort({ startDate: 1 })
      .lean<{ startDate: Date; endDate: Date; origin: BlockedPeriodOrigin }[]>();

    return docs.map(doc => ({
      startDate: doc.startDate,
      endDate:   doc.origin === 'manual' ? addOneDay(doc.endDate) : doc.endDate,
    }));
  }

  async create(data: ICreateBlockedPeriodData): Promise<IBlockedPeriodDocument> {
    const startDate = new Date(data.startDate);
    const endDate   = new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Fechas no válidas');
    }
    if (endDate < startDate) {
      throw new Error('La fecha de fin no puede ser anterior a la de inicio');
    }

    const blocked = new BlockedPeriodModel({
      startDate,
      endDate,
      reason:      data.reason?.trim() || undefined,
      origin:      data.origin ?? 'manual',
      externalUid: data.externalUid?.trim() || undefined,
    });

    const saved  = await blocked.save();
    const result = await BlockedPeriodModel.findById(saved._id).lean<IBlockedPeriodDocument>();
    return withId(result!);
  }

  async delete(id: string): Promise<boolean> {
    const result = await BlockedPeriodModel.findByIdAndDelete(id);
    return result !== null;
  }

  // ─── Sincronización externa (Airbnb/Booking) ─────────────────────────────────

  async getByOrigin(origin: BlockedPeriodOrigin): Promise<IBlockedPeriodDocument[]> {
    const docs = await BlockedPeriodModel.find({ origin }).sort({ startDate: 1 }).lean<IBlockedPeriodDocument[]>();
    return docs.map(withId);
  }

  async upsertExternal(
    origin: BlockedPeriodOrigin,
    externalUid: string,
    startDate: Date,
    endDate: Date,
    reason: string,
  ): Promise<void> {
    await BlockedPeriodModel.findOneAndUpdate(
      { externalUid },
      { startDate, endDate, reason, origin, externalUid },
      { upsert: true, runValidators: true },
    );
  }

  // Solo limpia bloqueos externos YA PASADOS (endDate anterior a `before`).
  // Nunca toca un bloqueo que incluya hoy o cualquier día futuro: el sync no puede
  // liberar una fecha ocupada por error. Las cancelaciones futuras se liberan a mano.
  async deletePastExternal(origin: BlockedPeriodOrigin, before: Date): Promise<number> {
    const result = await BlockedPeriodModel.deleteMany({
      origin,
      endDate: { $lt: before },
    });
    return result.deletedCount ?? 0;
  }
}

export const blockedPeriodService = new BlockedPeriodService();
