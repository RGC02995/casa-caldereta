export interface IBlockedPeriod {
  readonly id:        string;
  readonly startDate: string;
  readonly endDate:   string;
  readonly reason?:   string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ICreateBlockedPeriodRequest {
  readonly startDate: string;
  readonly endDate:   string;
  readonly reason?:   string;
}
