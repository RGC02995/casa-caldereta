import { SiteSettingsModel, ISiteSettingsDocument } from '../models/site-settings.model';
import { PhotoModel } from '../models/photo.model';

class SiteSettingsService {
  async get(): Promise<ISiteSettingsDocument> {
    let settings = await SiteSettingsModel.findOne().lean<ISiteSettingsDocument>();

    if (!settings) {
      const created = new SiteSettingsModel({});
      const saved   = await created.save();
      settings      = await SiteSettingsModel.findById(saved._id).lean<ISiteSettingsDocument>();
    }

    return settings!;
  }

  async setHeroPhoto(photoId: string): Promise<ISiteSettingsDocument | null> {
    const photoExists = await PhotoModel.exists({ _id: photoId });
    if (!photoExists) return null;

    const existing = await this.get();
    const updated = await SiteSettingsModel.findByIdAndUpdate(
      existing._id,
      { $set: { heroPhotoId: photoId } },
      { returnDocument: 'after', runValidators: true },
    ).lean<ISiteSettingsDocument>();

    return updated!;
  }

  async clearHeroPhotoIfMatches(photoId: string): Promise<void> {
    await SiteSettingsModel.updateOne(
      { heroPhotoId: photoId },
      { $set: { heroPhotoId: null } },
    );
  }
}

export const siteSettingsService = new SiteSettingsService();
