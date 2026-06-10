import { Document, Model, Schema, model } from 'mongoose';

export interface IBlockedPeriodDocument extends Document {
  startDate: Date;
  endDate:   Date;
  reason?:   string;
  createdAt: Date;
  updatedAt: Date;
}

const blockedPeriodSchema = new Schema<IBlockedPeriodDocument>(
  {
    startDate: {
      type:     Date,
      required: true,
    },
    endDate: {
      type:     Date,
      required: true,
    },
    reason: {
      type:      String,
      trim:      true,
      maxlength: 200,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

blockedPeriodSchema.index({ startDate: 1 });

export const BlockedPeriodModel: Model<IBlockedPeriodDocument> =
  model<IBlockedPeriodDocument>('BlockedPeriod', blockedPeriodSchema);
