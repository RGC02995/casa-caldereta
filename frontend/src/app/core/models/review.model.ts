export interface IReview {
  readonly id:        string;
  readonly author:    string;
  readonly location:  string;
  readonly rating:    number;
  readonly text:      string;
  readonly approved:  boolean;
  readonly createdAt: string;
}

export interface ICreateReview {
  readonly author:   string;
  readonly location: string;
  readonly rating:   number;
  readonly text:     string;
}
