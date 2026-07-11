import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { PhotoModel, PhotoCategory, IPhotoDocument } from '../models/photo.model';
import { withId } from '../utils/mongoose.util';
import { siteSettingsService } from './site-settings.service';

export interface IUploadPhotoData {
  buffer:   Buffer;
  alt:      string;
  category: PhotoCategory;
  order?:   number;
}

class PhotoService {
  async getAll(): Promise<IPhotoDocument[]> {
    const docs = await PhotoModel.find().sort({ category: 1, order: 1 }).lean<IPhotoDocument[]>();
    return docs.map(withId);
  }

  async getByCategory(category: PhotoCategory): Promise<IPhotoDocument[]> {
    const docs = await PhotoModel.find({ category }).sort({ order: 1 }).lean<IPhotoDocument[]>();
    return docs.map(withId);
  }

  async upload(data: IUploadPhotoData): Promise<IPhotoDocument> {
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder:         'casa-caldereta',
          resource_type:  'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (cloudinaryError, result) => {
          if (cloudinaryError || !result) {
            reject(Object.assign(
              new Error(cloudinaryError?.message ?? 'Error desconocido al subir la imagen'),
              { code: 'CLOUDINARY_UPLOAD_FAILED' },
            ));
          } else {
            resolve(result);
          }
        },
      ).end(data.buffer);
    });

    const photo    = new PhotoModel({
      url:      uploadResult.secure_url,
      publicId: uploadResult.public_id,
      alt:      data.alt,
      category: data.category,
      order:    data.order ?? 0,
      width:    uploadResult.width,
      height:   uploadResult.height,
    });
    const savedDoc = await photo.save();
    const result   = await PhotoModel.findById(savedDoc._id).lean<IPhotoDocument>();
    return withId(result!);
  }

  async updateOrder(id: string, order: number): Promise<IPhotoDocument | null> {
    const doc = await PhotoModel.findByIdAndUpdate(
      id,
      { order },
      { returnDocument: 'after', runValidators: true },
    ).lean<IPhotoDocument>();
    return doc ? withId(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const photo = await PhotoModel.findByIdAndDelete(id).lean<IPhotoDocument>();
    if (!photo) return false;

    await cloudinary.uploader.destroy(photo.publicId);
    await siteSettingsService.clearHeroPhotoIfMatches(id);
    return true;
  }
}

export const photoService = new PhotoService();
