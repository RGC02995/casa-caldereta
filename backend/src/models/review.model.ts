import { Document, Model, Schema, model } from 'mongoose';

export interface IReviewDocument extends Document {
  author:    string;
  location:  string;
  rating:    number;
  text:      string;
  approved:  boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    author: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 80,
    },
    location: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 80,
    },
    rating: {
      type:     Number,
      required: true,
      min:      1,
      max:      5,
    },
    text: {
      type:      String,
      required:  true,
      trim:      true,
      minlength: 10,
      maxlength: 800,
    },
    approved: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

reviewSchema.index({ approved: 1, createdAt: -1 });

export const ReviewModel: Model<IReviewDocument> = model<IReviewDocument>('Review', reviewSchema);
