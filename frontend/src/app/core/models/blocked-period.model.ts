export type BlockedPeriodOrigin = 'manual' | 'airbnb' | 'booking';

export interface IBlockedPeriod {
  readonly id:        string;
  readonly startDate: string;
  // Manuales: endDate INCLUSIVO (el propietario bloquea días enteros, incluido el último).
  // Importados (airbnb/booking): endDate EXCLUSIVO (día de salida — admite nueva entrada).
  readonly endDate:   string;
  readonly reason?:   string;
  readonly origin:    BlockedPeriodOrigin;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ICreateBlockedPeriodRequest {
  readonly startDate: string;
  readonly endDate:   string;
  readonly reason?:   string;
}

// El servidor (getPublicAvailability) normaliza TODO a endDate EXCLUSIVO
// (primer día libre): a los manuales les suma 1 día, los importados van tal cual.
// El calendario NO debe volver a sumar días.
export interface IBlockedPeriodAvailability {
  readonly startDate: string;
  readonly endDate:   string;
}
