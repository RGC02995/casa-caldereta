import { Document, Model, Schema, model } from 'mongoose';

export type BlockedPeriodOrigin = 'manual' | 'airbnb' | 'booking';

export interface IBlockedPeriodDocument extends Document {
  startDate:    Date;
  endDate:      Date;
  reason?:      string;
  origin:       BlockedPeriodOrigin;
  externalUid?: string;
  createdAt:    Date;
  updatedAt:    Date;
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
    origin: {
      type:     String,
      enum:     ['manual', 'airbnb', 'booking'],
      default:  'manual',
      required: true,
    },
    externalUid: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

blockedPeriodSchema.index({ startDate: 1 });
blockedPeriodSchema.index({ externalUid: 1 }, { unique: true, sparse: true });

export const BlockedPeriodModel: Model<IBlockedPeriodDocument> =
  model<IBlockedPeriodDocument>('BlockedPeriod', blockedPeriodSchema);
