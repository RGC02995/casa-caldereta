import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { PhotoModel, PhotoCategory, IPhotoDocument } from '../models/photo.model';

export interface IUploadPhotoData {
  buffer:   Buffer;
  alt:      string;
  category: PhotoCategory;
  order?:   number;
}

class PhotoService {
  async getAll(): Promise<IPhotoDocument[]> {
    return PhotoModel.find().sort({ category: 1, order: 1 }).lean<IPhotoDocument[]>();
  }

  async getByCategory(category: PhotoCategory): Promise<IPhotoDocument[]> {
    return PhotoModel.find({ category }).sort({ order: 1 }).lean<IPhotoDocument[]>();
  }

  async upload(data: IUploadPhotoData): Promise<IPhotoDocument> {
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder:         'casa-caldereta',
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
      ).end(data.buffer);
    });

    const photo = new PhotoModel({
      url:      uploadResult.secure_url,
      publicId: uploadResult.public_id,
      alt:      data.alt,
      category: data.category,
      order:    data.order ?? 0,
      width:    uploadResult.width,
      height:   uploadResult.height,
    });

    return photo.save();
  }

  async updateOrder(id: string, order: number): Promise<IPhotoDocument | null> {
    return PhotoModel.findByIdAndUpdate(
      id,
      { order },
      { new: true, runValidators: true },
    ).lean<IPhotoDocument>();
  }

  async delete(id: string): Promise<boolean> {
    const photo = await PhotoModel.findById(id).lean<IPhotoDocument>();
    if (!photo) return false;

    await cloudinary.uploader.destroy(photo.publicId);
    await PhotoModel.findByIdAndDelete(id);
    return true;
  }
}

export const photoService = new PhotoService();
