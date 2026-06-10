import { Document, Model, Schema, model } from 'mongoose';

export interface IPricingRuleDocument extends Document {
  label:          string;
  startDate:      Date;
  endDate:        Date;
  pricePerNight:  number;
  minNights:      number;
  createdAt:      Date;
  updatedAt:      Date;
}

const pricingRuleSchema = new Schema<IPricingRuleDocument>(
  {
    label: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 100,
    },
    startDate: {
      type:     Date,
      required: true,
    },
    endDate: {
      type:     Date,
      required: true,
    },
    pricePerNight: {
      type:     Number,
      required: true,
      min:      1,
      max:      10000,
    },
    minNights: {
      type:    Number,
      required: true,
      min:     1,
      max:     365,
      default: 1,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

pricingRuleSchema.index({ startDate: 1, endDate: 1 });

export const PricingRuleModel: Model<IPricingRuleDocument> =
  model<IPricingRuleDocument>('PricingRule', pricingRuleSchema);
