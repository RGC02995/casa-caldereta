import { Schema, model, Document, Types } from 'mongoose';

export interface ISiteSettingsDocument extends Document {
  heroPhotoId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettingsDocument>(
  {
    heroPhotoId: {
      type: Schema.Types.ObjectId,
      ref: 'Photo',
      default: null,
    },
  },
  { timestamps: true }
);

export const SiteSettingsModel = model<ISiteSettingsDocument>('SiteSettings', siteSettingsSchema);
