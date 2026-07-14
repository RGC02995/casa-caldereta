import { describe, it, expect } from 'vitest';
import {
  calculateNightPrice,
  calculateStayTotal,
  isSunday,
  type IPricingConfig,
} from '../../utils/pricing.util';

// Fechas con día de semana conocido (constructor local para evitar drift de timezone)
const MON = new Date(2025, 0, 6);   // lunes
const TUE = new Date(2025, 0, 7);   // martes
const FRI = new Date(2025, 0, 10);  // viernes
const SAT = new Date(2025, 0, 11);  // sábado
const SUN = new Date(2025, 0, 12);  // domingo

const CUSTOM: IPricingConfig = {
  monThuPrice:    200,
  friPrice:       250,
  satPrice:       300,
  extraPerPerson: 30,
};

describe('calculateNightPrice — DEFAULT_CONFIG', () => {
  it('lunes 2 personas → 100 €', () => {
    expect(calculateNightPrice(MON, 2)).toBe(100);
  });

  it('lunes 3 personas → 120 € (base + 1×extraPerPerson)', () => {
    expect(calculateNightPrice(MON, 3)).toBe(120);
  });

  it('lunes 6 personas (máximo) → 180 € (base + 4×extraPerPerson)', () => {
    expect(calculateNightPrice(MON, 6)).toBe(180);
  });

  it('viernes 2 personas → 150 €', () => {
    expect(calculateNightPrice(FRI, 2)).toBe(150);
  });

  it('sábado 2 personas → 180 €', () => {
    expect(calculateNightPrice(SAT, 2)).toBe(180);
  });

  it('domingo → igual que lunes-jueves (100 € / 180 € con 6 personas), no es día cerrado', () => {
    expect(calculateNightPrice(SUN, 2)).toBe(100);
    expect(calculateNightPrice(SUN, 6)).toBe(180);
  });

  it('1 persona → solo precio base, sin extra de personas', () => {
    expect(calculateNightPrice(MON, 1)).toBe(100);
  });

  it('7 personas (fuera de rango) → se clampea a 6 personas (mismo precio)', () => {
    expect(calculateNightPrice(MON, 7)).toBe(calculateNightPrice(MON, 6));
  });
});

describe('calculateNightPrice — config personalizada', () => {
  it('lunes 2 personas → 200 €', () => {
    expect(calculateNightPrice(MON, 2, CUSTOM)).toBe(200);
  });

  it('viernes 2 personas → 250 €', () => {
    expect(calculateNightPrice(FRI, 2, CUSTOM)).toBe(250);
  });

  it('sábado 2 personas → 300 €', () => {
    expect(calculateNightPrice(SAT, 2, CUSTOM)).toBe(300);
  });

  it('domingo → igual que lunes-jueves con config personalizada', () => {
    expect(calculateNightPrice(SUN, 2, CUSTOM)).toBe(200);
  });

  it('lunes 4 personas → 200 + 2×30 = 260 €', () => {
    expect(calculateNightPrice(MON, 4, CUSTOM)).toBe(260);
  });
});

describe('calculateStayTotal', () => {
  it('2 noches vie–dom: subtotal=330, deposit=165, remaining=165', () => {
    const result = calculateStayTotal(FRI, SUN, 2);
    expect(result.nights).toBe(2);
    expect(result.pricePerNight).toEqual([150, 180]);
    expect(result.subtotal).toBe(330);
    expect(result.deposit).toBe(165);
    expect(result.remaining).toBe(165);
  });

  it('1 noche lun–mar: subtotal=100, deposit=50, remaining=50', () => {
    const result = calculateStayTotal(MON, TUE, 2);
    expect(result.nights).toBe(1);
    expect(result.subtotal).toBe(100);
    expect(result.deposit).toBe(50);
    expect(result.remaining).toBe(50);
  });

  it('checkIn === checkOut → 0 noches, todo a 0', () => {
    const result = calculateStayTotal(MON, MON, 2);
    expect(result.nights).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.deposit).toBe(0);
    expect(result.remaining).toBe(0);
  });

  it('deposit + remaining === subtotal siempre', () => {
    const result = calculateStayTotal(FRI, SUN, 3);
    expect(result.deposit + result.remaining).toBe(result.subtotal);
  });

  it('regla de precio de un solo día (startDate===endDate) sobreescribe solo esa noche', () => {
    // Regla de un único día: martes con precio especial de 500 €
    const result = calculateStayTotal(MON, new Date(2025, 0, 8), 2, undefined, [
      { startDate: TUE, endDate: TUE, pricePerNight: 500, minNights: 1, label: 'Regla de prueba' },
    ]);
    expect(result.nights).toBe(2);
    expect(result.pricePerNight).toEqual([100, 500]); // lunes normal, martes con la regla
  });

  it('regla de un solo día que no coincide con ninguna noche de la estancia no afecta el precio', () => {
    const result = calculateStayTotal(MON, TUE, 2, undefined, [
      { startDate: SAT, endDate: SAT, pricePerNight: 500, minNights: 1, label: 'Regla de prueba' },
    ]);
    expect(result.pricePerNight).toEqual([100]);
  });

  it('3 noches vie–lun con domingo intermedio: domingo se cobra como lunes, no gratis', () => {
    const MON_NEXT = new Date(2025, 0, 13); // lunes siguiente
    const result = calculateStayTotal(FRI, MON_NEXT, 2);
    expect(result.nights).toBe(3);
    expect(result.pricePerNight).toEqual([150, 180, 100]);
    expect(result.subtotal).toBe(430);
  });
});

describe('isSunday', () => {
  it('domingo → true', () => {
    expect(isSunday(SUN)).toBe(true);
  });

  it('lunes → false', () => {
    expect(isSunday(MON)).toBe(false);
  });

  it('sábado → false', () => {
    expect(isSunday(SAT)).toBe(false);
  });
});
