export type PhotoCategory = 'exterior' | 'interior' | 'bedroom' | 'bathroom' | 'kitchen' | 'garden' | 'pool' | 'view';

export interface IPhoto {
  readonly id: string;
  readonly url: string;
  readonly thumbnailUrl: string;
  readonly alt: string;
  readonly category: PhotoCategory;
  readonly order: number;
  readonly isCover: boolean;
  readonly cloudinaryId: string;
  readonly createdAt: string;
}

export interface IPhotoUploadRequest {
  readonly alt: string;
  readonly category: PhotoCategory;
  readonly order: number;
  readonly isCover: boolean;
}
