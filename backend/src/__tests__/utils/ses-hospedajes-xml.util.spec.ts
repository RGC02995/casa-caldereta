import { describe, it, expect } from 'vitest';
import { generateSesHospedajesXml } from '../../utils/ses-hospedajes-xml.util';
import { IBookingDocument } from '../../models/booking.model';
import { ITravelerDocumentDoc } from '../../models/traveler-document.model';
import { ICheckinSettingsDocument } from '../../models/checkin-settings.model';

const settings = { checkInTime: '16:00', checkOutTime: '11:00' } as ICheckinSettingsDocument;

function makeBooking(overrides: Partial<IBookingDocument> = {}): IBookingDocument {
  return {
    _id:       '507f1f77bcf86cd799439011',
    checkIn:   new Date('2026-08-10T00:00:00.000Z'),
    checkOut:  new Date('2026-08-12T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T10:30:00.000Z'),
    ...overrides,
  } as IBookingDocument;
}

function makeTraveler(overrides: Partial<ITravelerDocumentDoc> = {}): ITravelerDocumentDoc {
  return {
    nombre:              'Ana',
    apellido1:           'García',
    apellido2:           'López',
    tipoDocumento:       'NIF',
    numDocumento:        '12345678Z',
    numSoporte:          'AAA000001',
    fechaNacimiento:     new Date('1990-05-20'),
    pais:                'ESP',
    sexo:                'M',
    paisResidencia:      'ESP',
    codigoMunicipio:     '46043',
    direccionResidencia: 'Carrer Major, 1',
    codigoPostal:        '46842',
    telefono:            '600111222',
    correo:              undefined,
    parentesco:          undefined,
    ...overrides,
  } as ITravelerDocumentDoc;
}

describe('generateSesHospedajesXml', () => {
  it('usa <peticion><solicitud> como envoltorio raíz, no <parteViajeros>', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toMatch(/<peticion>[\s\S]*<solicitud>/);
    expect(xml).not.toContain('<parteViajeros>');
    expect(xml).not.toContain('<establecimiento>');
  });

  it('emite el codigoEstablecimiento confirmado, no la licencia turística CV-VUT', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<codigoEstablecimiento>0000377329</codigoEstablecimiento>');
    expect(xml).not.toContain('CV-VUT0058371-V');
  });

  it('fechaContrato usa booking.createdAt en formato AAAA-MM-DD', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<fechaContrato>2026-07-01</fechaContrato>');
  });

  it('fechaEntrada/fechaSalida combinan la fecha de la reserva con los horarios configurados', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<fechaEntrada>2026-08-10T16:00:00</fechaEntrada>');
    expect(xml).toContain('<fechaSalida>2026-08-12T11:00:00</fechaSalida>');
  });

  it('numPersonas coincide con el número de bloques persona', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler(), makeTraveler({ nombre: 'Juan' })], settings);
    expect(xml).toContain('<numPersonas>2</numPersonas>');
    expect(xml.match(/<persona>/g)).toHaveLength(2);
  });

  it('bloque pago: tipoPago=PLATF y fechaPago con remainingPaidAt si existe', () => {
    const booking = makeBooking({
      depositPaidAt:   new Date('2026-07-01T11:00:00.000Z'),
      remainingPaidAt: new Date('2026-08-03T09:00:00.000Z'),
    });
    const xml = generateSesHospedajesXml(booking, [makeTraveler()], settings);
    expect(xml).toContain('<tipoPago>PLATF</tipoPago>');
    expect(xml).toContain('<fechaPago>2026-08-03</fechaPago>');
  });

  it('bloque pago: usa depositPaidAt si no hay segundo pago', () => {
    const booking = makeBooking({ depositPaidAt: new Date('2026-07-01T11:00:00.000Z') });
    const xml = generateSesHospedajesXml(booking, [makeTraveler()], settings);
    expect(xml).toContain('<fechaPago>2026-07-01</fechaPago>');
  });

  it('bloque pago: omite fechaPago si no hay ningún pago registrado (reserva manual)', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<tipoPago>PLATF</tipoPago>');
    expect(xml).not.toContain('<fechaPago>');
  });

  it('cada persona incluye rol=VI fijo', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<rol>VI</rol>');
  });

  it('soporteDocumento usa el tag oficial (no numeroSoporte)', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<soporteDocumento>AAA000001</soporteDocumento>');
    expect(xml).not.toContain('numeroSoporte');
  });

  it('dirección: país España usa codigoMunicipio, no nombreMunicipio', () => {
    const xml = generateSesHospedajesXml(makeBooking(), [makeTraveler()], settings);
    expect(xml).toContain('<codigoMunicipio>46043</codigoMunicipio>');
    expect(xml).not.toContain('<nombreMunicipio>');
  });

  it('dirección: país distinto de España usa nombreMunicipio, no codigoMunicipio', () => {
    const traveler = makeTraveler({
      paisResidencia:  'FRA',
      codigoMunicipio: undefined,
      nombreMunicipio: 'París',
    });
    const xml = generateSesHospedajesXml(makeBooking(), [traveler], settings);
    expect(xml).toContain('<nombreMunicipio>París</nombreMunicipio>');
    expect(xml).not.toContain('<codigoMunicipio>');
  });

  it('parentesco se emite cuando hay un menor en el grupo', () => {
    const adulto = makeTraveler();
    const menor = makeTraveler({
      nombre:          'Menor',
      fechaNacimiento: new Date('2015-01-01'),
      parentesco:      'HJ',
    });
    const xml = generateSesHospedajesXml(makeBooking(), [adulto, menor], settings);
    expect(xml).toContain('<parentesco>HJ</parentesco>');
  });

  it('referencia usa el prefijo CC- y los últimos 6 caracteres del id en mayúsculas', () => {
    const xml = generateSesHospedajesXml(makeBooking({ _id: '507f1f77bcf86cd799439abc' } as never), [makeTraveler()], settings);
    expect(xml).toContain('<referencia>CC-439ABC</referencia>');
  });
});
