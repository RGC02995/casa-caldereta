export interface IPricingRule {
  readonly id:            string;
  readonly label:         string;
  readonly startDate:     string;
  readonly endDate:       string;
  readonly pricePerNight: number;
  readonly minNights:     number;
  readonly createdAt:     string;
  readonly updatedAt:     string;
}

export interface ICreatePricingRuleRequest {
  readonly label:         string;
  readonly startDate:     string;
  readonly endDate:       string;
  readonly pricePerNight: number;
  readonly minNights:     number;
}

export type IUpdatePricingRuleRequest = Partial<ICreatePricingRuleRequest>;
