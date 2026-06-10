import { BlockedPeriodModel, IBlockedPeriodDocument } from '../models/blocked-period.model';
import { withId } from '../utils/mongoose.util';

export interface ICreateBlockedPeriodData {
  startDate: string;
  endDate:   string;
  reason?:   string;
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
      reason: data.reason?.trim() || undefined,
    });

    const saved  = await blocked.save();
    const result = await BlockedPeriodModel.findById(saved._id).lean<IBlockedPeriodDocument>();
    return withId(result!);
  }

  async delete(id: string): Promise<boolean> {
    const result = await BlockedPeriodModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const blockedPeriodService = new BlockedPeriodService();
