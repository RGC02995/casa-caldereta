import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, catchError, of } from 'rxjs';
import { PhotoService } from '../../../../core/services/photo.service';
import { RouteService } from '../../../../core/services/route.service';
import { ReviewService } from '../../../../core/services/review.service';
import { IPhoto } from '../../../../core/models/photo.model';
import { IRoute } from '../../../../core/models/route.model';
import { IReview } from '../../../../core/models/review.model';
import { SeoService } from '../../../../core/services/seo.service';
import { HomeHeroComponent } from '../../components/home-hero/home-hero.component';
import { HomeHighlightsComponent } from '../../components/home-highlights/home-highlights.component';
import { HomeAmenitiesComponent } from '../../components/home-amenities/home-amenities.component';
import { HomeGalleryPreviewComponent } from '../../components/home-gallery-preview/home-gallery-preview.component';
import { HomeReviewsComponent } from '../../components/home-reviews/home-reviews.component';
import { HomeMapComponent } from '../../components/home-map/home-map.component';
import { HomeRoutesPreviewComponent } from '../../components/home-routes-preview/home-routes-preview.component';
import { HomeBookingCtaComponent } from '../../components/home-booking-cta/home-booking-cta.component';

@Component({
  selector: 'home-page',
  imports: [
    HomeHeroComponent,
    HomeHighlightsComponent,
    HomeAmenitiesComponent,
    HomeGalleryPreviewComponent,
    HomeReviewsComponent,
    HomeMapComponent,
    HomeRoutesPreviewComponent,
    HomeBookingCtaComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly photoService  = inject(PhotoService);
  private readonly routeService  = inject(RouteService);
  private readonly reviewService = inject(ReviewService);

  constructor() {
    inject(SeoService).setPage({
      title:         'Alojamiento Rural de Lujo en Valencia',
      description:   'Casa Caldereta en Aielo de Rugat, Valencia. 180m² de uso exclusivo con jacuzzi, terraza privada, barbacoa y vistas a la montaña. Hasta 6 personas. Mascotas bienvenidas.',
      canonicalPath: '/',
      keywords:      'casa rural Valencia, alojamiento exclusivo Aielo de Rugat, jacuzzi rural Valencia, casa vacaciones montaña Valencia',
    });
  }

  private readonly _photos = toSignal(
    this.photoService.getAll().pipe(
      map(response => response.data),
      catchError(() => of([] as IPhoto[])),
    ),
    { initialValue: [] as IPhoto[] },
  );

  private readonly _routes = toSignal(
    this.routeService.getPublished().pipe(
      map(response => response.data),
      catchError(() => of([] as IRoute[])),
    ),
    { initialValue: [] as IRoute[] },
  );

  private readonly _reviews = toSignal(
    this.reviewService.getApproved().pipe(
      map(response => response.data),
      catchError(() => of([] as IReview[])),
    ),
    { initialValue: [] as IReview[] },
  );

  readonly heroPhoto     = computed(() => this._photos()[0] ?? null);
  readonly previewPhotos = computed(() => this._photos().slice(0, 4));
  readonly previewRoutes = computed(() => this._routes().slice(0, 3));
  readonly reviews       = this._reviews;
}
