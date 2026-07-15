import { BookingStatus } from './booking.model';

export type TipoDocumento = 'NIF' | 'NIE' | 'PAS' | 'OTRO';
export type Sexo = 'H' | 'M' | 'O';

export interface ICheckinSettings {
  readonly id:           string;
  readonly checkInTime:  string;
  readonly checkOutTime: string;
}

export interface ITodayBookingItem {
  readonly id:            string;
  readonly guestName:     string;
  readonly checkIn:       string;
  readonly checkOut:      string;
  readonly guests:        number;
  readonly status:        BookingStatus;
  readonly totalPrice:    number;
  readonly checkedInAt?:  string;
  readonly checkedOutAt?: string;
}

export interface ITodayActivity {
  readonly checkIns:  ITodayBookingItem[];
  readonly checkOuts: ITodayBookingItem[];
}

export interface ITravelerDocument {
  readonly id:                  string;
  readonly bookingId:           string;
  readonly tipoDocumento:       TipoDocumento;
  readonly numDocumento:        string;
  readonly numSoporte:          string;
  readonly apellido1:           string;
  readonly apellido2?:          string;
  readonly nombre:              string;
  readonly sexo?:               Sexo;
  readonly fechaNacimiento:     string;
  readonly parentesco?:         string;
  readonly pais:                string;
  readonly paisResidencia:      string;
  readonly nombreMunicipio?:    string;
  readonly codigoMunicipio?:    string;
  readonly direccionResidencia: string;
  readonly codigoPostal:        string;
  readonly telefono?:           string;
  readonly correo?:             string;
  readonly fechaEntrada:        string;
  /** @deprecated sustituido por nombreMunicipio/codigoMunicipio — solo presente en registros anteriores */
  readonly ciudadResidencia?:   string;
  /** @deprecated sustituido por telefono/correo — solo presente en registros anteriores */
  readonly contacto?:           string;
}

export interface ICheckinFormInfo {
  readonly bookingId:        string;
  readonly guestName:        string;
  readonly checkIn:          string;
  readonly checkOut:         string;
  readonly guests:           number;
  readonly checkInTime:      string;
  readonly checkOutTime:     string;
  readonly alreadySubmitted: boolean;
}

export interface ITravelerInput {
  tipoDocumento:       TipoDocumento;
  numDocumento:        string;
  numSoporte:          string;
  apellido1:           string;
  apellido2?:          string | undefined;
  nombre:              string;
  sexo?:               Sexo | undefined;
  fechaNacimiento:     string;
  parentesco?:         string | undefined;
  pais:                string;
  paisResidencia:      string;
  nombreMunicipio?:    string | undefined;
  codigoMunicipio?:    string | undefined;
  direccionResidencia: string;
  codigoPostal:        string;
  telefono?:           string | undefined;
  correo?:             string | undefined;
}
