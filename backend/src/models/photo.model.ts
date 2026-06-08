import { Document, Model, Schema, model } from 'mongoose';

export type PhotoCategory = 'exterior' | 'interior' | 'cocina' | 'dormitorio' | 'bano' | 'jardin' | 'otros';

export interface IPhotoDocument extends Document {
  url:        string;
  publicId:   string;
  alt:        string;
  category:   PhotoCategory;
  order:      number;
  width:      number;
  height:     number;
  createdAt:  Date;
  updatedAt:  Date;
}

const photoSchema = new Schema<IPhotoDocument>(
  {
    url: {
      type:     String,
      required: true,
      trim:     true,
    },
    publicId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    alt: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 150,
    },
    category: {
      type:    String,
      enum:    ['exterior', 'interior', 'cocina', 'dormitorio', 'bano', 'jardin', 'otros'] as PhotoCategory[],
      default: 'otros' as PhotoCategory,
    },
    order: {
      type:    Number,
      default: 0,
      min:     0,
    },
    width: {
      type:     Number,
      required: true,
      min:      1,
    },
    height: {
      type:     Number,
      required: true,
      min:      1,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

photoSchema.index({ category: 1, order: 1 });

export const PhotoModel: Model<IPhotoDocument> = model<IPhotoDocument>('Photo', photoSchema);
