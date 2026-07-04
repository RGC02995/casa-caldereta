import { BlockedPeriodModel, BlockedPeriodOrigin, IBlockedPeriodDocument } from '../models/blocked-period.model';
import { withId } from '../utils/mongoose.util';

export interface ICreateBlockedPeriodData {
  startDate:    string;
  endDate:      string;
  reason?:      string;
  origin?:      BlockedPeriodOrigin;
  externalUid?: string;
}

class BlockedPeriodService {
  async getAll(): Promise<IBlockedPeriodDocument[]> {
    const docs = await BlockedPeriodModel.find().sort({ startDate: 1 }).lean<IBlockedPeriodDocument[]>();
    return docs.map(withId);
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

  async deleteStaleExternal(origin: BlockedPeriodOrigin, activeUids: string[]): Promise<number> {
    const result = await BlockedPeriodModel.deleteMany({
      origin,
      externalUid: { $nin: activeUids },
    });
    return result.deletedCount ?? 0;
  }
}

export const blockedPeriodService = new BlockedPeriodService();
