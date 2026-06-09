import { RouteModel, IRouteDocument, RouteDifficulty, RouteType, IRoutePoint } from '../models/route.model';
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
    let slug    = generateSlug(data.title);
    let counter = 1;
    while (await RouteModel.findOne({ slug }).lean()) {
      slug = `${generateSlug(data.title)}-${counter++}`;
    }

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
      let newSlug    = generateSlug(data.title);
      let counter    = 1;
      while (await RouteModel.findOne({ slug: newSlug, _id: { $ne: id } }).lean()) {
        newSlug = `${generateSlug(data.title)}-${counter++}`;
      }
      (updatePayload as Record<string, unknown>)['slug'] = newSlug;
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

  async delete(id: string): Promise<boolean> {
    const result = await RouteModel.findByIdAndDelete(id).lean();
    return result !== null;
  }
}

export const routeService = new RouteService();
