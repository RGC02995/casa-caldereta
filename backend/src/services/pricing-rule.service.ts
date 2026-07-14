import { IPricingRuleDocument, PricingRuleModel } from '../models/pricing-rule.model';
import { withId } from '../utils/mongoose.util';

export interface ICreatePricingRuleData {
  label:         string;
  startDate:     string;
  endDate:       string;
  pricePerNight: number;
  minNights:     number;
}

export type IUpdatePricingRuleData = Partial<ICreatePricingRuleData>;

class PricingRuleService {
  async getAll(): Promise<IPricingRuleDocument[]> {
    const docs = await PricingRuleModel.find().sort({ startDate: 1 }).lean<IPricingRuleDocument[]>();
    return docs.map(withId);
  }

  async getOverlapping(startDate: Date, endDate: Date): Promise<IPricingRuleDocument[]> {
    const docs = await PricingRuleModel.find({
      startDate: { $lte: endDate },
      endDate:   { $gte: startDate },
    })
      .sort({ startDate: 1 })
      .lean<IPricingRuleDocument[]>();
    return docs.map(withId);
  }

  async create(data: ICreatePricingRuleData): Promise<IPricingRuleDocument> {
    const startDate = new Date(data.startDate);
    const endDate   = new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Fechas no válidas');
    }
    if (endDate < startDate) {
      throw new Error('La fecha de fin debe ser igual o posterior a la de inicio');
    }

    const rule    = new PricingRuleModel({ ...data, startDate, endDate });
    const saved   = await rule.save();
    const result  = await PricingRuleModel.findById(saved._id).lean<IPricingRuleDocument>();
    return withId(result!);
  }

  async update(id: string, data: IUpdatePricingRuleData): Promise<IPricingRuleDocument | null> {
    const update: Partial<IPricingRuleDocument> = {};

    if (data.label       !== undefined) update.label         = data.label.trim();
    if (data.pricePerNight !== undefined) update.pricePerNight = data.pricePerNight;
    if (data.minNights   !== undefined) update.minNights     = data.minNights;

    if (data.startDate !== undefined) {
      const d = new Date(data.startDate);
      if (isNaN(d.getTime())) throw new Error('Fecha de inicio no válida');
      update.startDate = d;
    }
    if (data.endDate !== undefined) {
      const d = new Date(data.endDate);
      if (isNaN(d.getTime())) throw new Error('Fecha de fin no válida');
      update.endDate = d;
    }

    if (update.startDate || update.endDate) {
      // Si solo se envía una de las dos fechas, hay que validar el rango
      // resultante contra el valor ya guardado en BD, no solo contra el
      // otro campo del payload — si no, un PUT parcial (p.ej. solo endDate)
      // podría colar un rango invertido sin que nada lo detecte.
      const existing = await PricingRuleModel.findById(id).lean<IPricingRuleDocument>();
      if (!existing) return null;
      const effectiveStart = update.startDate ?? new Date(existing.startDate);
      const effectiveEnd   = update.endDate   ?? new Date(existing.endDate);
      if (effectiveEnd < effectiveStart) {
        throw new Error('La fecha de fin debe ser igual o posterior a la de inicio');
      }
    }

    const doc = await PricingRuleModel.findByIdAndUpdate(
      id,
      update,
      { returnDocument: 'after', runValidators: true },
    ).lean<IPricingRuleDocument>();

    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await PricingRuleModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const pricingRuleService = new PricingRuleService();
