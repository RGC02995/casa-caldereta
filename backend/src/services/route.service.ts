import { UploadApiResponse } from 'cloudinary';
import { RouteModel, IRouteDocument, RouteDifficulty, RouteType, IRoutePoint } from '../models/route.model';
import { cloudinary } from '../config/cloudinary';
import { withId } from '../utils/mongoose.util';

export interface ICreateRouteData {
  title:         string;
  description:   string;
  distance:      number;
  duration:      number;
  difficulty:    RouteDifficulty;
  type:          RouteType;
  coverImageUrl: string;
  images?:       string[];
  points?:       IRoutePoint[];
  isPublished?:  boolean;
  order?:        number;
}

export interface IUpdateRouteData {
  title?:         string;
  description?:   string;
  distance?:      number;
  duration?:      number;
  difficulty?:    RouteDifficulty;
  type?:          RouteType;
  coverImageUrl?: string;
  images?:        string[];
  points?:        IRoutePoint[];
  order?:         number;
}

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

class RouteService {
  private async findUniqueSlug(base: string, excludeId?: string): Promise<string> {
    const filter: Record<string, unknown> = { slug: { $regex: `^${base}(-\\d+)?$` } };
    if (excludeId) filter['_id'] = { $ne: excludeId };

    const docs = await RouteModel.find(filter, { slug: 1, _id: 0 }).lean<{ slug: string }[]>();
    const existingSlugs = new Set(docs.map(doc => doc.slug));

    if (!existingSlugs.has(base)) return base;
    let counter = 1;
    while (existingSlugs.has(`${base}-${counter}`)) counter++;
    return `${base}-${counter}`;
  }


  async getAll(): Promise<IRouteDocument[]> {
    const docs = await RouteModel.find().sort({ order: 1, createdAt: -1 }).lean<IRouteDocument[]>();
    return docs.map(withId);
  }

  async getPublished(): Promise<IRouteDocument[]> {
    const docs = await RouteModel.find({ isPublished: true }).sort({ order: 1 }).lean<IRouteDocument[]>();
    return docs.map(withId);
  }

  async getBySlug(slug: string): Promise<IRouteDocument | null> {
    const doc = await RouteModel.findOne({ slug }).lean<IRouteDocument>();
    return doc ? withId(doc) : null;
  }

  async getById(id: string): Promise<IRouteDocument | null> {
    const doc = await RouteModel.findById(id).lean<IRouteDocument>();
    return doc ? withId(doc) : null;
  }

  async create(data: ICreateRouteData): Promise<IRouteDocument> {
    const slug = await this.findUniqueSlug(generateSlug(data.title));

    const routeDocument = new RouteModel({
      title:         data.title,
      slug,
      description:   data.description,
      distance:      data.distance,
      duration:      data.duration,
      difficulty:    data.difficulty,
      type:          data.type,
      coverImageUrl: data.coverImageUrl,
      images:        data.images   ?? [],
      points:        data.points   ?? [],
      isPublished:   data.isPublished ?? false,
      order:         data.order    ?? 0,
    });

    const savedDoc = await routeDocument.save();
    const result   = await RouteModel.findById(savedDoc._id).lean<IRouteDocument>();
    return withId(result!);
  }

  async update(id: string, data: IUpdateRouteData): Promise<IRouteDocument | null> {
    const updatePayload: Partial<IRouteDocument> = { ...data } as Partial<IRouteDocument>;

    if (data.title) {
      (updatePayload as Record<string, unknown>)['slug'] = await this.findUniqueSlug(generateSlug(data.title), id);
    }

    const doc = await RouteModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { returnDocument: 'after', runValidators: true },
    ).lean<IRouteDocument>();

    return doc ? withId(doc) : null;
  }

  async togglePublished(id: string): Promise<IRouteDocument | null> {
    const current = await RouteModel.findById(id).lean<IRouteDocument>();
    if (!current) return null;

    const doc = await RouteModel.findByIdAndUpdate(
      id,
      { $set: { isPublished: !current.isPublished } },
      { returnDocument: 'after', runValidators: true },
    ).lean<IRouteDocument>();

    return doc ? withId(doc) : null;
  }

  async uploadCoverImage(id: string, buffer: Buffer): Promise<IRouteDocument | null> {
    const existing = await RouteModel.findById(id).lean<IRouteDocument>();
    if (!existing) return null;

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder:         'casa-caldereta/rutas',
          resource_type:  'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Error desconocido al subir la imagen'));
          } else {
            resolve(result);
          }
        },
      ).end(buffer);
    });

    const doc = await RouteModel.findByIdAndUpdate(
      id,
      { $set: { coverImageUrl: uploadResult.secure_url, coverImagePublicId: uploadResult.public_id } },
      { returnDocument: 'after', runValidators: true },
    ).lean<IRouteDocument>();

    if (existing.coverImagePublicId) {
      void cloudinary.uploader.destroy(existing.coverImagePublicId);
    }

    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await RouteModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}

export const routeService = new RouteService();
