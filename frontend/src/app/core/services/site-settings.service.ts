import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import { ISiteSettings } from '../models/site-settings.model';

@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private readonly api = inject(ApiService);

  get(): Observable<ApiResponse<ISiteSettings>> {
    return this.api.get<ISiteSettings>('site-settings');
  }

  setHeroPhoto(photoId: string): Observable<ApiResponse<ISiteSettings>> {
    return this.api.patch<ISiteSettings>('site-settings/hero-photo', { photoId });
  }
}
