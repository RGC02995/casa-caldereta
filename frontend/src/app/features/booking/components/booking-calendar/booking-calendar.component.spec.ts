import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BookingCalendarComponent } from './booking-calendar.component';
import { IPricingSettings } from '../../../../core/models/pricing-settings.model';
import { IBlockedPeriodAvailability } from '../../../../core/models/blocked-period.model';
import { IBookingAvailability } from '../../../../core/models/booking.model';

const PRICING: IPricingSettings = {
  monThuPrice:    100,
  friPrice:       150,
  satPrice:       180,
  extraPerPerson: 20,
};

function bookedRange(checkIn: string, checkOut: string): IBookingAvailability {
  return { checkIn, checkOut };
}

function blockedPeriod(startDate: string, endDate: string): IBlockedPeriodAvailability {
  return { startDate, endDate };
}

// Agosto 2026: sáb 1 · lun 10, mar 11, mié 12, jue 13, vie 14, sáb 15, dom 16
describe('BookingCalendarComponent', () => {
  let fixture: ComponentFixture<BookingCalendarComponent>;
  let component: BookingCalendarComponent;

  beforeEach(() => {
    // Hoy simulado: miércoles 12 de agosto de 2026 — determinista para isPast/isToday
    vi.useFakeTimers({ now: new Date(2026, 7, 12), toFake: ['Date'] });

    TestBed.configureTestingModule({
      imports:   [BookingCalendarComponent],
      providers: [provideTranslateService({ defaultLanguage: 'es' })],
    });
    fixture   = TestBed.createComponent(BookingCalendarComponent);
    component = fixture.componentInstance;
    component.currentMonth.set(new Date(2026, 7, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function day(dayNumber: number) {
    const found = component.calendarDays().find(d => d.date !== null && d.dayNumber === dayNumber);
    if (!found) throw new Error(`Dia ${dayNumber} no encontrado en la cuadricula`);
    return found;
  }

  it('se renderiza sin errores', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('la cuadricula empieza en lunes: agosto 2026 arranca en sabado → 5 celdas vacias de relleno', () => {
    const days = component.calendarDays();
    expect(days.slice(0, 5).every(d => d.date === null)).toBe(true);
    const firstRealDay = days.at(5);
    expect(firstRealDay?.dayNumber).toBe(1);
    expect(firstRealDay?.date?.getDay()).toBe(6); // sabado
  });

  it('dias pasados deshabilitados; hoy y futuros habilitados', () => {
    expect(day(11).isPast).toBe(true);
    expect(day(11).isDisabled).toBe(true);
    expect(day(12).isPast).toBe(false); // hoy
    expect(day(12).isToday).toBe(true);
    expect(day(13).isDisabled).toBe(false);
  });

  it('rango reservado semiabierto [13, 16): deshabilita 13-15 y deja el 16 libre (dia de salida reutilizable)', () => {
    fixture.componentRef.setInput('bookedRanges', [bookedRange('2026-08-13', '2026-08-16')]);
    expect(day(13).isBooked).toBe(true);
    expect(day(14).isBooked).toBe(true);
    expect(day(15).isBooked).toBe(true);
    expect(day(16).isBooked).toBe(false);
    expect(day(13).isDisabled).toBe(true);
  });

  it('bloqueo manual inclusivo 13-15: deshabilita 13, 14 Y 15; el 16 libre', () => {
    fixture.componentRef.setInput('blockedPeriods', [blockedPeriod('2026-08-13', '2026-08-15')]);
    expect(day(13).isBlocked).toBe(true);
    expect(day(14).isBlocked).toBe(true);
    expect(day(15).isBlocked).toBe(true); // endDate inclusivo (addDays +1)
    expect(day(16).isBlocked).toBe(false);
  });

  it('domingo deshabilitado como check-in cuando no hay seleccion previa (coincide con SUNDAY_CLOSED del backend)', () => {
    fixture.componentRef.setInput('pricingSettings', PRICING);
    const sunday = day(16);
    expect(sunday.date?.getDay()).toBe(0);
    expect(sunday.isDisabled).toBe(true);
    expect(sunday.price).toBe(100); // domingo se factura igual que lunes-jueves
  });

  it('domingo SI es seleccionable como check-out cuando ya hay un check-in valido (viernes→domingo, 2 noches)', () => {
    fixture.componentRef.setInput('pricingSettings', PRICING);
    fixture.componentRef.setInput('checkIn', new Date(2026, 7, 14)); // viernes
    const sunday = day(16);
    expect(sunday.isDisabled).toBe(false);
  });

  it('precios por dia: lun-jue=100, vie=150, sab=180, dom=100 (igual que lun-jue)', () => {
    fixture.componentRef.setInput('pricingSettings', PRICING);
    expect(day(13).price).toBe(100); // jueves
    expect(day(14).price).toBe(150); // viernes
    expect(day(15).price).toBe(180); // sabado
    expect(day(16).price).toBe(100); // domingo
    expect(day(17).price).toBe(100); // lunes
  });

  describe('seleccion de rango (onDayClick)', () => {
    let checkInEmits:  (Date | null)[];
    let checkOutEmits: (Date | null)[];

    beforeEach(() => {
      checkInEmits  = [];
      checkOutEmits = [];
      component.checkInChange.subscribe(value => checkInEmits.push(value));
      component.checkOutChange.subscribe(value => checkOutEmits.push(value));
    });

    it('click en dia libre sin seleccion → emite checkInChange y resetea checkOut', () => {
      component.onDayClick(day(13));
      expect(checkInEmits).toHaveLength(1);
      expect(checkInEmits[0]?.getDate()).toBe(13);
      expect(checkOutEmits).toEqual([null]);
    });

    it('click posterior al checkIn → emite checkOutChange', () => {
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 13));
      component.onDayClick(day(15));
      expect(checkOutEmits).toHaveLength(1);
      expect(checkOutEmits[0]?.getDate()).toBe(15);
      expect(checkInEmits).toHaveLength(0);
    });

    it('click posterior con dia reservado en medio → reinicia el checkIn al dia clicado (hasUnavailableBetween)', () => {
      fixture.componentRef.setInput('bookedRanges', [bookedRange('2026-08-14', '2026-08-15')]);
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 13));
      component.onDayClick(day(17)); // lunes — evita el 16 (domingo) para no mezclar con esa regla
      // El 14 esta reservado entre el 13 y el 17 → no puede ser un rango valido
      expect(checkInEmits).toHaveLength(1);
      expect(checkInEmits[0]?.getDate()).toBe(17);
      expect(checkOutEmits).toEqual([null]);
    });

    it('dia de llegada de otra reserva SI es seleccionable como check-out cuando ya hay un check-in valido (back-to-back)', () => {
      fixture.componentRef.setInput('bookedRanges', [bookedRange('2026-08-15', '2026-08-18')]);
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 13));
      expect(day(15).isDisabled).toBe(false);
      component.onDayClick(day(15));
      expect(checkOutEmits).toHaveLength(1);
      expect(checkOutEmits[0]?.getDate()).toBe(15);
      expect(checkInEmits).toHaveLength(0);
    });

    it('dia de llegada de otra reserva sigue bloqueado como nuevo check-in sin seleccion previa', () => {
      fixture.componentRef.setInput('bookedRanges', [bookedRange('2026-08-15', '2026-08-18')]);
      expect(day(15).isBooked).toBe(true);
      expect(day(15).isDisabled).toBe(true);
      component.onDayClick(day(15));
      expect(checkInEmits).toHaveLength(0);
      expect(checkOutEmits).toHaveLength(0);
    });

    it('click anterior al checkIn → mueve el checkIn', () => {
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 15));
      component.onDayClick(day(13));
      expect(checkInEmits).toHaveLength(1);
      expect(checkInEmits[0]?.getDate()).toBe(13);
      expect(checkOutEmits).toEqual([null]);
    });

    it('con rango ya completo, un nuevo click reinicia la seleccion', () => {
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 13));
      fixture.componentRef.setInput('checkOut', new Date(2026, 7, 15));
      component.onDayClick(day(20));
      expect(checkInEmits).toHaveLength(1);
      expect(checkInEmits[0]?.getDate()).toBe(20);
      expect(checkOutEmits).toEqual([null]);
    });

    it('click en dia deshabilitado (reservado) no emite nada', () => {
      fixture.componentRef.setInput('bookedRanges', [bookedRange('2026-08-13', '2026-08-16')]);
      component.onDayClick(day(14));
      expect(checkInEmits).toHaveLength(0);
      expect(checkOutEmits).toHaveLength(0);
    });

    it('domingo sin checkIn previo: boton deshabilitado, el click no emite nada', () => {
      component.onDayClick(day(16));
      expect(checkInEmits).toHaveLength(0);
      expect(checkOutEmits).toHaveLength(0);
    });

    it('domingo con checkIn valido previo: es un checkOut valido y emite checkOutChange', () => {
      fixture.componentRef.setInput('checkIn', new Date(2026, 7, 14)); // viernes
      component.onDayClick(day(16)); // domingo
      expect(checkOutEmits).toHaveLength(1);
      expect(checkOutEmits[0]?.getDate()).toBe(16);
      expect(checkInEmits).toHaveLength(0);
    });
  });

  describe('navegacion de meses', () => {
    it('boton mes anterior deshabilitado en el mes actual', () => {
      expect(component.isPrevMonthDisabled()).toBe(true);
      component.goToPreviousMonth();
      expect(component.currentMonth().getMonth()).toBe(7); // sigue en agosto
    });

    it('desde un mes futuro se puede volver atras', () => {
      component.currentMonth.set(new Date(2026, 8, 1)); // septiembre
      expect(component.isPrevMonthDisabled()).toBe(false);
      component.goToPreviousMonth();
      expect(component.currentMonth().getMonth()).toBe(7);
    });
  });
});
