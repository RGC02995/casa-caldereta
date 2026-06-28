/**
 * Motor de precios Casa Caldereta.
 *
 * Fórmula: precioBase(diaSemana) + max(0, personas - 2) * 20
 *
 * Precio base por noche:
 *   - Lunes a jueves : 100 €
 *   - Viernes        : 150 €
 *   - Sábado         : 180 €
 *   - Domingo        : cerrado (no se admiten entradas)
 *
 * Por cada persona adicional a partir de la 3ª: +20 €/noche
 * Mínimo 1 persona, máximo 6 personas.
 */

export const SUNDAY_CLOSED = true;

export interface IPricingConfig {
  monThuPrice:    number;
  friPrice:       number;
  satPrice:       number;
  extraPerPerson: number;
}

// Minimal shape needed from PricingRule records — avoids circular imports
export interface IPricingRuleOverride {
  startDate:     Date;
  endDate:       Date;
  pricePerNight: number;
}

const DEFAULT_CONFIG: IPricingConfig = {
  monThuPrice:    100,
  friPrice:       150,
  satPrice:       180,
  extraPerPerson: 20,
};

const MIN_GUESTS  = 1;
const MAX_GUESTS  = 6;
const BASE_GUESTS = 2;

function basePriceByDay(dayOfWeek: number, config: IPricingConfig): number {
  if (dayOfWeek === 0) return 0;           // domingo — cerrado
  if (dayOfWeek === 5) return config.friPrice;
  if (dayOfWeek === 6) return config.satPrice;
  return config.monThuPrice;               // lunes–jueves
}

export function calculateNightPrice(
  date: Date,
  guests: number,
  config: IPricingConfig = DEFAULT_CONFIG,
  baseOverride?: number,
): number {
  const clamped  = Math.min(Math.max(guests, MIN_GUESTS), MAX_GUESTS);
  const base     = baseOverride ?? basePriceByDay(date.getDay(), config);
  if (base === 0) return 0;  // día cerrado (domingo) — sin extra por personas
  const extraPax = Math.max(0, clamped - BASE_GUESTS) * config.extraPerPerson;
  return base + extraPax;
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export interface IStayPrice {
  nights:        number;
  pricePerNight: number[]; // precio de cada noche
  subtotal:      number;
  deposit:       number;   // 50 %
  remaining:     number;   // 50 %
}

/**
 * Calcula el precio total de una estancia.
 * checkIn y checkOut son fechas ISO (la noche se cobra el día de entrada).
 * Ej: checkIn=viernes, checkOut=domingo → se cobran viernes + sábado (2 noches).
 */
export function calculateStayTotal(
  checkIn: Date,
  checkOut: Date,
  guests: number,
  config: IPricingConfig = DEFAULT_CONFIG,
  rules: IPricingRuleOverride[] = [],
): IStayPrice {
  const pricePerNight: number[] = [];
  const current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    const day = new Date(current);
    // Last matching rule wins (same priority as the admin calendar view)
    const matchingRule = rules.filter(r => {
      const s = new Date(r.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(r.endDate);   e.setHours(23, 59, 59, 999);
      return day >= s && day <= e;
    }).at(-1);
    pricePerNight.push(calculateNightPrice(day, guests, config, matchingRule?.pricePerNight));
    current.setDate(current.getDate() + 1);
  }

  const subtotal  = pricePerNight.reduce((sum, p) => sum + p, 0);
  const deposit   = Math.round(subtotal * 0.5 * 100) / 100;
  const remaining = Math.round((subtotal - deposit) * 100) / 100;

  return {
    nights: pricePerNight.length,
    pricePerNight,
    subtotal,
    deposit,
    remaining,
  };
}
