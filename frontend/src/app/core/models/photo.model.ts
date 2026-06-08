export type PhotoCategory = 'exterior' | 'interior' | 'cocina' | 'dormitorio' | 'bano' | 'jardin' | 'otros';

export interface IPhoto {
  readonly id:        string;
  readonly url:       string;
  readonly publicId:  string;
  readonly alt:       string;
  readonly category:  PhotoCategory;
  readonly order:     number;
  readonly width:     number;
  readonly height:    number;
  readonly createdAt: string;
}

export interface IPhotoUploadRequest {
  readonly alt:      string;
  readonly category: PhotoCategory;
  readonly order?:   number;
}
