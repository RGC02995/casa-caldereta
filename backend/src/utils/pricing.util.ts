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

const BASE_PRICE_BY_DAY: Record<number, number> = {
  1: 100, // lunes
  2: 100, // martes
  3: 100, // miércoles
  4: 100, // jueves
  5: 150, // viernes
  6: 180, // sábado
  0: 0,   // domingo — cerrado
};

const EXTRA_PER_PERSON = 20;
const MIN_GUESTS       = 1;
const MAX_GUESTS       = 6;
const BASE_GUESTS      = 2; // el precio base cubre hasta 2 personas

export function calculateNightPrice(date: Date, guests: number): number {
  const clamped    = Math.min(Math.max(guests, MIN_GUESTS), MAX_GUESTS);
  const dayOfWeek  = date.getDay();
  const base       = BASE_PRICE_BY_DAY[dayOfWeek] ?? 0;
  const extraPax   = Math.max(0, clamped - BASE_GUESTS) * EXTRA_PER_PERSON;
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
): IStayPrice {
  const pricePerNight: number[] = [];
  const current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    pricePerNight.push(calculateNightPrice(new Date(current), guests));
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
