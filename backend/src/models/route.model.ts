import { Document, Model, Schema, model } from 'mongoose';

export type RouteDifficulty = 'easy' | 'moderate' | 'hard';
export type RouteType       = 'hiking' | 'cycling' | 'driving' | 'walking';

export interface IRoutePoint {
  name:        string;
  description: string;
  imageUrl?:   string;
  lat?:        number;
  lng?:        number;
}

export interface IRouteDocument extends Document {
  title:         string;
  slug:          string;
  description:   string;
  distance:      number;
  duration:      number;
  difficulty:    RouteDifficulty;
  type:          RouteType;
  coverImageUrl: string;
  images:        string[];
  points:        IRoutePoint[];
  isPublished:   boolean;
  order:         number;
  createdAt:     Date;
  updatedAt:     Date;
}

const routePointSchema = new Schema<IRoutePoint>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl:    { type: String, trim: true },
    lat:         { type: Number },
    lng:         { type: Number },
  },
  { _id: false },
);

const routeSchema = new Schema<IRouteDocument>(
  {
    title: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 150,
    },
    slug: {
      type:   String,
      unique: true,
      trim:   true,
    },
    description: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 2000,
    },
    distance: {
      type:     Number,
      required: true,
      min:      0,
    },
    duration: {
      type:     Number,
      required: true,
      min:      0,
    },
    difficulty: {
      type:     String,
      enum:     ['easy', 'moderate', 'hard'] as RouteDifficulty[],
      required: true,
    },
    type: {
      type:     String,
      enum:     ['hiking', 'cycling', 'driving', 'walking'] as RouteType[],
      required: true,
    },
    coverImageUrl: {
      type:     String,
      required: true,
      trim:     true,
    },
    images: {
      type:    [String],
      default: [],
    },
    points: {
      type:    [routePointSchema],
      default: [],
    },
    isPublished: {
      type:    Boolean,
      default: false,
    },
    order: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  { timestamps: true },
);

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

routeSchema.pre('save', async function () {
  if (!this.slug) {
    this.slug = generateSlug(this.title);
  }
});

routeSchema.index({ isPublished: 1 });
routeSchema.index({ order: 1 });

export const RouteModel: Model<IRouteDocument> = model<IRouteDocument>('Route', routeSchema);
