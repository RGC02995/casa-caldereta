import { Document, Schema, model } from 'mongoose';

export interface IPricingSettingsDocument extends Document {
  monThuPrice:    number;
  friPrice:       number;
  satPrice:       number;
  extraPerPerson: number;
}

const pricingSettingsSchema = new Schema<IPricingSettingsDocument>(
  {
    monThuPrice:    { type: Number, required: true, min: 1, max: 10000 },
    friPrice:       { type: Number, required: true, min: 1, max: 10000 },
    satPrice:       { type: Number, required: true, min: 1, max: 10000 },
    extraPerPerson: { type: Number, required: true, min: 0, max: 1000  },
  },
  { timestamps: true },
);

export const PricingSettingsModel = model<IPricingSettingsDocument>('PricingSettings', pricingSettingsSchema);
