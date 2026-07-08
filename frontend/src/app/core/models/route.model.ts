export type RouteDifficulty = 'easy' | 'moderate' | 'hard';
export type RouteType       = 'hiking' | 'cycling' | 'driving' | 'walking';

export interface IRoutePoint {
  readonly name:        string;
  readonly description: string;
  readonly imageUrl?:   string;
  readonly lat?:        number;
  readonly lng?:        number;
  readonly linkUrl?:    string;
}

export interface IRouteImage {
  readonly url:      string;
  readonly publicId: string;
}

export interface IRoute {
  readonly id:                  string;
  readonly title:               string;
  readonly slug:                string;
  readonly description:         string;
  readonly distance:            number;
  readonly duration:            number;
  readonly difficulty:          RouteDifficulty;
  readonly type:                RouteType;
  readonly coverImageUrl:       string;
  readonly images:              IRouteImage[];
  readonly points:              IRoutePoint[];
  readonly externalLinkLabel:   string;
  readonly externalLinkUrl:     string;
  readonly isPublished:         boolean;
  readonly order:               number;
  readonly createdAt:           string;
  readonly updatedAt:           string;
}

export interface IRouteCreateRequest {
  readonly title:               string;
  readonly description:         string;
  readonly distance:            number;
  readonly duration:            number;
  readonly difficulty:          RouteDifficulty;
  readonly type:                RouteType;
  readonly coverImageUrl?:      string;
  readonly points?:             IRoutePoint[];
  readonly externalLinkLabel?:  string;
  readonly externalLinkUrl?:    string;
  readonly isPublished?:        boolean;
  readonly order?:              number;
}

export interface IRouteUpdateRequest {
  readonly title?:              string;
  readonly description?:        string;
  readonly distance?:           number;
  readonly duration?:           number;
  readonly difficulty?:         RouteDifficulty;
  readonly type?:               RouteType;
  readonly coverImageUrl?:      string;
  readonly points?:             IRoutePoint[];
  readonly externalLinkLabel?:  string;
  readonly externalLinkUrl?:    string;
  readonly order?:              number;
}
