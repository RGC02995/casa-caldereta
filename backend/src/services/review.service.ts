import { ReviewModel, IReviewDocument } from '../models/review.model';
import { withId } from '../utils/mongoose.util';

export interface ICreateReviewData {
  author:   string;
  location: string;
  rating:   number;
  text:     string;
}

class ReviewService {
  async getApproved(): Promise<IReviewDocument[]> {
    const docs = await ReviewModel.find({ approved: true })
      .sort({ createdAt: -1 })
      .lean<IReviewDocument[]>();
    return docs.map(withId);
  }

  async getAll(): Promise<IReviewDocument[]> {
    const docs = await ReviewModel.find()
      .sort({ approved: 1, createdAt: -1 })
      .lean<IReviewDocument[]>();
    return docs.map(withId);
  }

  async getById(id: string): Promise<IReviewDocument | null> {
    const doc = await ReviewModel.findById(id).lean<IReviewDocument>();
    return doc ? withId(doc) : null;
  }

  async create(data: ICreateReviewData): Promise<IReviewDocument> {
    const review  = new ReviewModel({ ...data, approved: false });
    const saved   = await review.save();
    const result  = await ReviewModel.findById(saved._id).lean<IReviewDocument>();
    return withId(result!);
  }

  async approve(id: string): Promise<IReviewDocument | null> {
    const doc = await ReviewModel.findByIdAndUpdate(
      id,
      { approved: true },
      { returnDocument: 'after', runValidators: true },
    ).lean<IReviewDocument>();
    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ReviewModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const reviewService = new ReviewService();
