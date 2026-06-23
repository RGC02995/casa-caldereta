import { IPricingSettingsDocument, PricingSettingsModel } from '../models/pricing-settings.model';
import { IPricingConfig } from '../utils/pricing.util';

const DEFAULTS: IPricingConfig = {
  monThuPrice:    100,
  friPrice:       150,
  satPrice:       180,
  extraPerPerson: 20,
};

class PricingSettingsService {
  async get(): Promise<IPricingSettingsDocument> {
    let settings = await PricingSettingsModel.findOne().lean<IPricingSettingsDocument>();

    if (!settings) {
      const created = new PricingSettingsModel(DEFAULTS);
      const saved   = await created.save();
      settings      = await PricingSettingsModel.findById(saved._id).lean<IPricingSettingsDocument>();
    }

    return settings!;
  }

  async getConfig(): Promise<IPricingConfig> {
    const settings = await this.get();
    return {
      monThuPrice:    settings.monThuPrice,
      friPrice:       settings.friPrice,
      satPrice:       settings.satPrice,
      extraPerPerson: settings.extraPerPerson,
    };
  }

  async update(data: Partial<IPricingConfig>): Promise<IPricingSettingsDocument> {
    const existing = await this.get();

    const updated = await PricingSettingsModel.findByIdAndUpdate(
      existing._id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    ).lean<IPricingSettingsDocument>();

    return updated!;
  }
}

export const pricingSettingsService = new PricingSettingsService();
